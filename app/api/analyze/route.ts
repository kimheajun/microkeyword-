/**
 * POST /api/analyze
 *
 * 입력: { url: string }  (네이버 플레이스 URL)
 * 출력: 분석 단계별 결과 + 4 카테고리 + 조합 키워드
 *
 * 흐름:
 *  1. URL 파싱 → 업체ID (있으면)
 *  2. 네이버 지역검색 → 업체명·주소·카테고리
 *  3. 카카오 좌표 + 1.5km 랜드마크
 *  4. 네이버 블로그검색 → 리뷰 텍스트 50개
 *  5. Claude → 목적·히든 자동 추출
 *  6. 4 카테고리 → 조합 → 조회수 → 출력
 */

import { NextResponse } from "next/server";
import { parsePlaceUrlAsync, fetchPlaceMeta } from "@/lib/place-url";
import { searchPlace, searchReviews, searchNearbyLandmarks } from "@/lib/naver-search";
import { analyzeReviews } from "@/lib/review-analyzer";
import {
  buildRegionCategory,
  buildIndustryCategory,
  combine,
  mockSearchVolume,
  groupByPattern,
  CategoryResult,
} from "@/lib/extractor";
import { fetchVolumes, HAS_NAVER_SEARCHAD_KEYS, NaverSearchAdCreds } from "@/lib/naver-keywordtool";
import { getSession } from "@/lib/auth";
import { queryOne, exec } from "@/lib/db";
import { decrypt } from "@/lib/crypto";
import crypto from "crypto";

export async function POST(req: Request) {
  // 인증 체크
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const body = await req.json();
  const url: string = (body.url || "").trim();
  const fallbackName: string = (body.placeName || "").trim();
  const fallbackAddress: string = (body.address || "").trim();

  if (!url && !fallbackName) {
    return NextResponse.json(
      { error: "플레이스 URL 또는 업체명을 입력하세요." },
      { status: 400 }
    );
  }

  // 사용자 BYOK 키 로드 (있으면 그것 사용, 없으면 자사 키 폴백)
  const userKeys = await queryOne<{
    naver_access_license_enc: string | null;
    naver_secret_key_enc: string | null;
    naver_customer_id: string | null;
  }>("SELECT naver_access_license_enc, naver_secret_key_enc, naver_customer_id FROM user_keys WHERE user_id = $1", [session.userId]);
  let userCreds: NaverSearchAdCreds | undefined = undefined;
  if (userKeys?.naver_access_license_enc && userKeys?.naver_secret_key_enc && userKeys?.naver_customer_id) {
    try {
      userCreds = {
        accessLicense: decrypt(userKeys.naver_access_license_enc),
        secretKey: decrypt(userKeys.naver_secret_key_enc),
        customerId: userKeys.naver_customer_id,
      };
    } catch {
      // 복호화 실패 시 자사 키 폴백
    }
  }

  // 결과 캐시 체크 (24h)
  const cacheKey = crypto.createHash("sha1").update(`${url}|${fallbackName}|${fallbackAddress}`).digest("hex");
  const cacheRow = await queryOne<{ result_json: string; created_at: number }>(
    "SELECT result_json, created_at FROM analyze_cache WHERE cache_key = $1",
    [cacheKey]
  );
  const CACHE_TTL = 24 * 60 * 60 * 1000;
  if (cacheRow && Date.now() - Number(cacheRow.created_at) < CACHE_TTL) {
    const cached = JSON.parse(cacheRow.result_json);
    cached.fromCache = true;
    cached.cacheAge = Math.floor((Date.now() - Number(cacheRow.created_at)) / 1000 / 60);
    await exec("INSERT INTO usage_log (user_id, action, created_at) VALUES ($1, $2, $3)", [session.userId, "analyze_cache_hit", Date.now()]);
    return NextResponse.json(cached);
  }

  const trace: string[] = [];

  // 1. URL 파싱
  let placeIdInfo = null;
  let extractedTitle: string | null = null;
  if (url) {
    placeIdInfo = await parsePlaceUrlAsync(url);
    if (placeIdInfo) {
      trace.push(`✓ URL → 업체ID ${placeIdInfo.placeId}${placeIdInfo.category ? ` (${placeIdInfo.category})` : ""}`);
      // 플레이스 페이지에서 메타로 업체명 추출
      const meta = await fetchPlaceMeta(placeIdInfo.placeId, placeIdInfo.category);
      if (meta.title) {
        extractedTitle = meta.title;
        trace.push(`✓ 플레이스 페이지 → 업체명 "${extractedTitle}"`);
      } else {
        trace.push(`⚠ 페이지에서 업체명 추출 실패`);
      }
    } else {
      trace.push(`⚠ URL 형식 인식 실패`);
    }
  }

  // 2. 네이버 지역검색 (업체명·주소·카테고리)
  const searchQuery = fallbackName || extractedTitle || url;
  const placeInfo = await searchPlace(searchQuery);
  if (!placeInfo) {
    return NextResponse.json(
      {
        error: "업체 정보를 찾을 수 없습니다. 업체명을 직접 입력해주세요.",
        trace,
      },
      { status: 404 }
    );
  }
  trace.push(`✓ 네이버 지역검색 → ${placeInfo.name} · ${placeInfo.category} (${placeInfo.source})`);

  const finalAddress = fallbackAddress || placeInfo.address || placeInfo.roadAddress;

  // 3. 네이버 지역검색으로 주변 랜드마크 (카카오 대체)
  const landmarks = await searchNearbyLandmarks(finalAddress);
  const pois = landmarks.map((l) => ({
    name: l.name,
    category_group_code: l.category,
    distance_m: 0, // 정확한 거리 측정 안 함
  }));
  trace.push(`✓ 네이버 주변 랜드마크 ${pois.length}개 (같은 행정구역)`);
  const coord = null;

  // 4. 블로그 리뷰 수집
  const reviews = await searchReviews(placeInfo.name, 30);
  trace.push(`✓ 블로그 리뷰 ${reviews.count}개 수집 (${reviews.source})`);

  // 5. Claude 리뷰 분석 → 목적·히든
  const analysis = await analyzeReviews(placeInfo.name, placeInfo.category, reviews.texts);
  trace.push(`✓ ${analysis.source === "claude" ? "Claude" : "Fallback"} 분석 → 목적 ${analysis.purposes.length}개, 히든 ${analysis.hidden.length}개`);

  // 6. 4 카테고리 구성
  const categoryFromName = placeInfo.category.split(/[>·,]/).pop()?.trim() || "";
  const categories: CategoryResult = {
    region: buildRegionCategory(finalAddress, pois),
    industry: buildIndustryCategory(placeInfo.category, [categoryFromName]),
    purpose: analysis.purposes,
    hidden: analysis.hidden,
  };

  // 7. 조합 + 조회수 검증
  const combined = combine(categories);

  // 패턴별 라운드로빈 정렬 — 각 패턴에서 골고루 검증되도록
  // 한 패턴이 너무 많으면 다른 패턴이 검증 한도에서 밀리는 문제 해결
  const sortedForApi: typeof combined = [];
  const patternOrder = ["1+2", "1+3", "1+4", "1+2+3", "1+2+4", "1+3+4", "1+2+3+4"];
  const buckets: Record<string, typeof combined> = {};
  for (const p of patternOrder) buckets[p] = [];
  for (const c of combined) {
    if (buckets[c.pattern]) buckets[c.pattern].push(c);
  }
  // 라운드로빈으로 섞기
  let added = true;
  let i = 0;
  while (added) {
    added = false;
    for (const p of patternOrder) {
      if (buckets[p][i]) {
        sortedForApi.push(buckets[p][i]);
        added = true;
      }
    }
    i++;
  }

  let volumes: Map<string, any> = new Map();
  let volumeSource: "naver-searchad" | "mock" = "mock";

  const useCreds = userCreds ?? undefined;
  const credsLabel = userCreds ? "사용자 BYOK 키" : "자사 키 (폴백)";
  if (userCreds || HAS_NAVER_SEARCHAD_KEYS()) {
    const MAX_VERIFY = 1000;
    const targetKeywords = sortedForApi.slice(0, MAX_VERIFY).map((c) => c.keyword);
    volumes = await fetchVolumes(targetKeywords, { batchSize: 5, maxKeywords: MAX_VERIFY, creds: useCreds });
    volumeSource = "naver-searchad";
    trace.push(`✓ 네이버 검색광고 (${credsLabel}) → 상위 ${targetKeywords.length}개 중 ${volumes.size}개 매칭`);
  } else {
    trace.push(`⚠ 네이버 검색광고 키 없음 → mock 조회수 사용`);
  }

  // 진짜 데이터 매칭된 키워드만 결과로 (mock은 노이즈라 제외)
  const withVolume = combined
    .map((c) => {
      const stat = volumes.get(c.keyword);
      if (!stat) return null;
      return {
        ...c,
        searchVolume: stat.total,
        pc: stat.pc,
        mobile: stat.mobile,
        pcDisplay: stat.pcDisplay,
        mobileDisplay: stat.mobileDisplay,
        totalDisplay: stat.totalDisplay,
        pcUnder10: stat.pcUnder10,
        mobileUnder10: stat.mobileUnder10,
        compIdx: stat.compIdx,
      };
    })
    .filter((c): c is NonNullable<typeof c> => c !== null);

  const valid = withVolume.sort((a, b) => (b.searchVolume ?? 0) - (a.searchVolume ?? 0));

  const responseBody = {
    placeInfo,
    coord,
    landmarks: pois,
    reviewCount: reviews.count,
    reviewSource: reviews.source,
    analysisSource: analysis.source,
    analysisReasoning: analysis.reasoning,
    categories,
    totalCombined: combined.length,
    valid,
    excluded: combined.length - valid.length,
    byPattern: groupByPattern(valid),
    volumeSource,
    realVolumeCount: volumes.size,
    usedUserKeys: !!userCreds,
    trace,
    fromCache: false,
  };

  // 캐시 저장 (사용자 키로 분석한 경우만)
  if (userCreds) {
    await exec(
      `INSERT INTO analyze_cache (cache_key, result_json, created_at)
       VALUES ($1, $2, $3)
       ON CONFLICT (cache_key) DO UPDATE SET result_json = EXCLUDED.result_json, created_at = EXCLUDED.created_at`,
      [cacheKey, JSON.stringify(responseBody), Date.now()]
    );
  }

  // 사용 로그
  await exec("INSERT INTO usage_log (user_id, action, created_at) VALUES ($1, $2, $3)", [session.userId, "analyze", Date.now()]);

  return NextResponse.json(responseBody);
}
