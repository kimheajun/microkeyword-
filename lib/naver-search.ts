/**
 * 네이버 검색 API 래퍼
 * - 지역검색: 업체명·주소·카테고리 추출
 * - 블로그검색: 그 업체 관련 블로그 글 (리뷰 텍스트 모음)
 *
 * 키 없으면 mock 데이터 반환 (개발용 폴백)
 */

const NAVER_OPENAPI = "https://openapi.naver.com/v1/search";

interface NaverLocalItem {
  title: string; // <b>태그 포함 가능
  link: string;
  category: string;
  description: string;
  telephone: string;
  address: string;
  roadAddress: string;
  mapx: string; // KATEC 좌표
  mapy: string;
}

interface NaverBlogItem {
  title: string;
  link: string;
  description: string;
  bloggername: string;
  bloggerlink: string;
  postdate: string;
}

export interface PlaceInfo {
  name: string;
  category: string;
  address: string;
  roadAddress: string;
  telephone?: string;
  lat?: number;
  lng?: number;
  source: "naver-api" | "mock";
}

export interface ReviewBlob {
  count: number;
  texts: string[]; // 본문 description 모음
  source: "naver-api" | "mock";
}

const HAS_NAVER_KEY = () =>
  !!process.env.NAVER_CLIENT_ID && !!process.env.NAVER_CLIENT_SECRET;

function naverHeaders() {
  return {
    "X-Naver-Client-Id": process.env.NAVER_CLIENT_ID!,
    "X-Naver-Client-Secret": process.env.NAVER_CLIENT_SECRET!,
  };
}

function stripBold(s: string) {
  return s.replace(/<\/?b>/g, "");
}

/**
 * KATEC TM128 → WGS84 변환 (네이버가 KATEC 좌표 반환)
 * 단순 근사 변환 (정확한 좌표는 카카오/네이버 다른 API 필요)
 * → 일단 카카오 로컬 검색에서 다시 좌표 받음
 */

/**
 * 업체명 + 주소로 네이버 지역검색 → 업체 정보 1건 반환
 * placeId 직접 검색은 공식 API에 없음 → 업체명 fallback
 */
export async function searchPlace(query: string): Promise<PlaceInfo | null> {
  if (!HAS_NAVER_KEY()) {
    return mockPlaceInfo(query);
  }
  const url = `${NAVER_OPENAPI}/local.json?query=${encodeURIComponent(query)}&display=1`;
  const res = await fetch(url, { headers: naverHeaders() });
  if (!res.ok) {
    console.error(`[naver-search] local.json HTTP ${res.status}`);
    return null;
  }
  const data = await res.json();
  const item: NaverLocalItem | undefined = data.items?.[0];
  if (!item) return null;
  return {
    name: stripBold(item.title),
    category: item.category,
    address: item.address,
    roadAddress: item.roadAddress,
    telephone: item.telephone || undefined,
    source: "naver-api",
  };
}

/**
 * 업체명으로 블로그 검색 → 리뷰 텍스트 모음
 */
export async function searchReviews(
  placeName: string,
  count: number = 30
): Promise<ReviewBlob> {
  if (!HAS_NAVER_KEY()) {
    return mockReviews(placeName, count);
  }
  const queries = [`${placeName} 후기`, `${placeName} 리뷰`];
  const all: string[] = [];
  for (const q of queries) {
    const url = `${NAVER_OPENAPI}/blog.json?query=${encodeURIComponent(q)}&display=${Math.ceil(count / queries.length)}&sort=sim`;
    const res = await fetch(url, { headers: naverHeaders() });
    if (!res.ok) continue;
    const data = await res.json();
    const items: NaverBlogItem[] = data.items || [];
    for (const it of items) {
      all.push(stripBold(it.title) + " — " + stripBold(it.description));
    }
  }
  return { count: all.length, texts: all, source: "naver-api" };
}

// ============================================================
// Mock 폴백 (키 없을 때)
// ============================================================
function mockPlaceInfo(query: string): PlaceInfo {
  return {
    name: query.split(" ")[0] || "샘플업체",
    category: "음식점>한식",
    address: "서울시 강남구 역삼동 123-4",
    roadAddress: "서울시 강남구 역삼로 123",
    telephone: "02-000-0000",
    source: "mock",
  };
}

/**
 * 주변 랜드마크 검색 (네이버 지역검색 우회)
 * 카카오 로컬 API 대체. 정확한 반경 필터는 안 되지만 같은 동/구 결과로 근사
 */
export async function searchNearbyLandmarks(
  baseAddress: string
): Promise<{ name: string; category: string; address: string }[]> {
  if (!HAS_NAVER_KEY()) {
    return [
      { name: "역삼초등학교", category: "학교", address: baseAddress },
      { name: "역삼역", category: "지하철역", address: baseAddress },
    ];
  }
  // 주소에서 동·구 추출
  const dong = baseAddress.match(/[가-힣]+(?:[0-9]동|동)/)?.[0];
  const gu = baseAddress.match(/[가-힣]+구/)?.[0];
  const region = dong || gu || baseAddress.split(" ")[0];

  const queries = [
    `${region} 초등학교`,
    `${region} 지하철역`,
    `${region} 역`,
    `${region} 대학교`,
    `${region} 마트`,
    `${region} 공원`,
  ];

  const result: { name: string; category: string; address: string }[] = [];
  const seen = new Set<string>();
  for (const q of queries) {
    const url = `${NAVER_OPENAPI}/local.json?query=${encodeURIComponent(q)}&display=3`;
    try {
      const res = await fetch(url, { headers: naverHeaders() });
      if (!res.ok) continue;
      const data = await res.json();
      const items: NaverLocalItem[] = data.items || [];
      for (const it of items) {
        const name = stripBold(it.title);
        if (seen.has(name)) continue;
        // 같은 행정구역 내 결과만
        if (gu && !it.address.includes(gu)) continue;
        seen.add(name);
        result.push({
          name,
          category: it.category.split(/[>·,]/).pop()?.trim() || "기타",
          address: it.address,
        });
      }
    } catch (e) {
      // 한 쿼리 실패해도 계속
    }
  }
  return result;
}

function mockReviews(placeName: string, count: number): ReviewBlob {
  const samples = [
    `${placeName} 회식하기 좋아요. 룸도 있고 주차 가능합니다.`,
    `${placeName} 가족 모임으로 다녀왔는데 어른들도 좋아하셨어요.`,
    `점심 특선이 가성비 좋아요. 직장인 점심 추천!`,
    `데이트 코스로 분위기도 좋고 음식도 맛있었어요.`,
    `회식 자리로 적당해요. 단체 예약 가능했고 친절했습니다.`,
    `근처에 사는데 동네 맛집입니다. 자주 가요.`,
    `퇴근 후 혼술하기 편해요. 1인 좌석도 있어요.`,
    `접대 자리로 활용했는데 깔끔하고 조용했어요.`,
    `아이와 함께 갔는데 아이 의자도 있고 메뉴도 다양해요.`,
    `주말에 줄서서 먹었어요. 진짜 동네 핫플이에요.`,
  ];
  const texts: string[] = [];
  for (let i = 0; i < count; i++) {
    texts.push(samples[i % samples.length]);
  }
  return { count: texts.length, texts, source: "mock" };
}
