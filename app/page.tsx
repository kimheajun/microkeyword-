"use client";

import { useState } from "react";
import type { CombinedKeyword, CategoryResult } from "@/lib/extractor";

interface POI {
  name: string;
  category_group_code: string;
  distance_m: number;
}

interface PlaceInfo {
  name: string;
  category: string;
  address: string;
  roadAddress: string;
  telephone?: string;
  source: "naver-api" | "mock";
}

interface KeywordRow extends CombinedKeyword {
  pc?: number;
  mobile?: number;
  pcDisplay?: string;
  mobileDisplay?: string;
  totalDisplay?: string;
  pcUnder10?: boolean;
  mobileUnder10?: boolean;
  compIdx?: string;
}

interface AnalyzeResult {
  placeInfo: PlaceInfo;
  coord?: { lat: number; lng: number };
  landmarks: POI[];
  reviewCount: number;
  reviewSource: "naver-api" | "mock";
  analysisSource: "claude" | "fallback";
  analysisReasoning: string;
  categories: CategoryResult;
  totalCombined: number;
  valid: KeywordRow[];
  excluded: number;
  byPattern: Record<string, KeywordRow[]>;
  realVolumeCount: number;
  volumeSource: "naver-searchad" | "mock";
  trace: string[];
}

const PATTERN_LABELS: Record<string, string> = {
  "1+2": "지역 + 업종",
  "1+3": "지역 + 목적",
  "1+4": "지역 + 히든",
  "1+2+3": "지역 + 업종 + 목적",
  "1+2+4": "지역 + 업종 + 히든",
  "1+3+4": "지역 + 목적 + 히든",
  "1+2+3+4": "지역 + 업종 + 목적 + 히든 (롱테일)",
};

const CATEGORY_COLORS: Record<number, string> = {
  1: "bg-blue-100 text-blue-800",
  2: "bg-emerald-100 text-emerald-800",
  3: "bg-purple-100 text-purple-800",
  4: "bg-amber-100 text-amber-800",
};

export default function Home() {
  const [url, setUrl] = useState("");
  const [showFallback, setShowFallback] = useState(false);
  const [placeName, setPlaceName] = useState("");
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalyzeResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activePattern, setActivePattern] = useState<string>("all");
  const [displayCount, setDisplayCount] = useState<number>(100);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, placeName, address }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "분석 실패");
      }
      const data = (await res.json()) as AnalyzeResult;
      setResult(data);
      setActivePattern("all");
      setDisplayCount(100);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  const visibleKeywords = result
    ? activePattern === "all"
      ? result.valid
      : result.byPattern[activePattern] || []
    : [];

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">플레이스 URL → 키워드 자동 추출</h1>
        <p className="text-sm text-gray-600 mt-1">
          네이버 플레이스 URL만 넣으면 업체 정보·리뷰를 자동 분석해서 광고용 키워드 200~500개를 분류해드립니다.
        </p>
      </div>

      {/* 입력 영역 */}
      <form onSubmit={handleSubmit} className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm mb-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            네이버 플레이스 URL
          </label>
          <div className="flex gap-2">
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://m.place.naver.com/restaurant/12345678/home"
              className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
            />
            <button
              type="submit"
              disabled={loading || (!url && !placeName)}
              className="bg-gray-900 hover:bg-gray-800 disabled:bg-gray-400 text-white font-semibold px-6 py-2 rounded-md transition-colors whitespace-nowrap"
            >
              {loading ? "분석 중..." : "키워드 자동 추출"}
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-1.5">
            지원: m.place.naver.com / map.naver.com / pcmap.place.naver.com / naver.me
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowFallback((v) => !v)}
          className="text-xs text-gray-500 hover:text-gray-900 underline"
        >
          {showFallback ? "URL만 사용" : "URL 인식 안 되면 → 업체명 직접 입력"}
        </button>

        {showFallback && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-gray-100">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">업체명</label>
              <input
                type="text"
                value={placeName}
                onChange={(e) => setPlaceName(e.target.value)}
                placeholder="예: 옆집고깃집 역삼점"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">주소 (선택)</label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="예: 서울시 강남구 역삼동 123"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
              />
            </div>
          </div>
        )}

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">{error}</div>
        )}
      </form>

      {/* 결과 영역 */}
      {!result && (
        <div className="bg-white rounded-lg border border-dashed border-gray-300 p-12 text-center text-gray-400">
          <div className="text-5xl mb-3">🔍</div>
          <div className="text-sm">플레이스 URL을 넣고 [키워드 자동 추출] 버튼을 누르세요</div>
          <div className="text-xs mt-2 text-gray-400">
            업체 정보·블로그 리뷰·1.5km 랜드마크가 자동 분석됩니다
          </div>
        </div>
      )}

      {result && (
        <div className="space-y-5">
          {/* 분석 흐름 trace */}
          <div className="bg-gray-900 text-gray-100 rounded-lg p-4 font-mono text-xs space-y-1">
            {result.trace.map((line, i) => (
              <div key={i}>{line}</div>
            ))}
          </div>

          {/* 업체 정보 + 리뷰 분석 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="bg-white rounded-lg border border-gray-200 p-5 shadow-sm">
              <h2 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                업체 정보
                <SourceBadge source={result.placeInfo.source} />
              </h2>
              <dl className="text-sm space-y-1.5">
                <Row label="업체명" value={result.placeInfo.name} />
                <Row label="카테고리" value={result.placeInfo.category} />
                <Row label="주소" value={result.placeInfo.address} />
                {result.placeInfo.telephone && <Row label="전화" value={result.placeInfo.telephone} />}
                {result.coord && (
                  <Row label="좌표" value={`${result.coord.lat.toFixed(5)}, ${result.coord.lng.toFixed(5)}`} />
                )}
              </dl>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-5 shadow-sm">
              <h2 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                리뷰 분석
                <SourceBadge source={result.analysisSource === "claude" ? "naver-api" : "mock"} label={result.analysisSource === "claude" ? "Claude" : "사전 폴백"} />
              </h2>
              <div className="text-xs text-gray-500 mb-2">
                블로그 리뷰 {result.reviewCount}개 분석
              </div>
              <p className="text-sm text-gray-700 leading-relaxed bg-gray-50 p-3 rounded border border-gray-100">
                {result.analysisReasoning || "(분석 근거 없음)"}
              </p>
            </div>
          </div>

          {/* 랜드마크 */}
          {result.landmarks.length > 0 && (
            <div className="bg-white rounded-lg border border-gray-200 p-5 shadow-sm">
              <h2 className="font-semibold text-gray-900 mb-2">1.5km 랜드마크 ({result.landmarks.length})</h2>
              <div className="flex flex-wrap gap-1.5">
                {result.landmarks.map((p, i) => (
                  <span key={i} className="px-2 py-0.5 rounded bg-blue-50 border border-blue-100 text-xs text-blue-700">
                    {p.name} <span className="text-blue-400">{p.distance_m}m</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* 통계 */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Stat label="총 조합" value={result.totalCombined} />
            <Stat label="유효 키워드" value={result.valid.length} highlight />
            <Stat label="조회수 0 제외" value={result.excluded} muted />
            <Stat label="패턴" value={Object.keys(result.byPattern).length} />
          </div>

          {/* 4 카테고리 */}
          <div className="bg-white rounded-lg border border-gray-200 p-5 shadow-sm">
            <h2 className="font-semibold text-gray-900 mb-3">자동 추출된 4 카테고리</h2>
            <div className="space-y-2">
              <CategoryRow num={1} label="지역 (필수)" items={result.categories.region} colorClass={CATEGORY_COLORS[1]} />
              <CategoryRow num={2} label="업종/메뉴" items={result.categories.industry} colorClass={CATEGORY_COLORS[2]} />
              <CategoryRow num={3} label="목적 (리뷰 분석)" items={result.categories.purpose} colorClass={CATEGORY_COLORS[3]} />
              <CategoryRow num={4} label="히든 (리뷰 분석)" items={result.categories.hidden} colorClass={CATEGORY_COLORS[4]} />
            </div>
          </div>

          {/* 키워드 결과 */}
          <div className="bg-white rounded-lg border border-gray-200 p-5 shadow-sm">
            <div className="flex flex-wrap gap-2 mb-4">
              <PatternBtn active={activePattern === "all"} onClick={() => { setActivePattern("all"); setDisplayCount(100); }}>
                전체 ({result.valid.length})
              </PatternBtn>
              {Object.entries(result.byPattern).map(([pattern, kws]) => (
                <PatternBtn
                  key={pattern}
                  active={activePattern === pattern}
                  onClick={() => { setActivePattern(pattern); setDisplayCount(100); }}
                >
                  {PATTERN_LABELS[pattern] || pattern} ({kws.length})
                </PatternBtn>
              ))}
            </div>

            <div className="overflow-hidden rounded border border-gray-200">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                  <tr>
                    <th className="text-left px-3 py-2 font-medium">키워드</th>
                    <th className="text-left px-3 py-2 font-medium hidden sm:table-cell">패턴</th>
                    <th className="text-right px-3 py-2 font-medium">PC</th>
                    <th className="text-right px-3 py-2 font-medium">모바일</th>
                    <th className="text-right px-3 py-2 font-medium">총합</th>
                    <th className="text-center px-3 py-2 font-medium hidden md:table-cell">경쟁</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {visibleKeywords.slice(0, displayCount).map((k, i) => (
                    <tr key={`${k.keyword}-${i}`} className="hover:bg-gray-50">
                      <td className="px-3 py-2">
                        <div className="font-medium text-gray-900">{k.keyword}</div>
                        <div className="flex gap-1 mt-0.5">
                          {k.parts.map((p, j) => (
                            <span
                              key={j}
                              className={`text-xs px-1.5 py-0.5 rounded ${CATEGORY_COLORS[p.category]}`}
                            >
                              {p.word}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-3 py-2 text-gray-500 text-xs hidden sm:table-cell">
                        {PATTERN_LABELS[k.pattern]}
                      </td>
                      <td className={`px-3 py-2 text-right font-mono text-xs ${(k.pc ?? 0) === 0 ? "text-gray-400" : "text-gray-700"}`}>
                        {k.pcDisplay ?? "0"}
                      </td>
                      <td className={`px-3 py-2 text-right font-mono text-xs ${(k.mobile ?? 0) === 0 ? "text-gray-400" : "text-gray-700"}`}>
                        {k.mobileDisplay ?? "0"}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <span className={`font-mono text-xs font-semibold px-2 py-0.5 rounded ${
                          (k.searchVolume ?? 0) >= 1000
                            ? "bg-orange-100 text-orange-700"
                            : (k.searchVolume ?? 0) >= 100
                            ? "bg-blue-100 text-blue-700"
                            : (k.searchVolume ?? 0) > 0
                            ? "bg-gray-100 text-gray-700"
                            : "bg-gray-50 text-gray-400"
                        }`}>
                          {k.totalDisplay ?? "0"}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-center text-xs hidden md:table-cell">
                        {k.compIdx && (
                          <span className={`px-1.5 py-0.5 rounded ${
                            k.compIdx === "높음" ? "bg-red-50 text-red-700" :
                            k.compIdx === "중간" ? "bg-yellow-50 text-yellow-700" :
                            "bg-emerald-50 text-emerald-700"
                          }`}>
                            {k.compIdx}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {visibleKeywords.length > displayCount && (
                <button
                  type="button"
                  onClick={() => setDisplayCount((n) => n + 100)}
                  className="w-full px-3 py-3 bg-gray-50 hover:bg-gray-100 text-sm text-gray-700 font-medium border-t border-gray-200 transition-colors flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.06l3.71-3.83a.75.75 0 111.08 1.04l-4.25 4.39a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                  </svg>
                  100개 더 보기 ({displayCount.toLocaleString()} / {visibleKeywords.length.toLocaleString()})
                </button>
              )}
              {visibleKeywords.length > 100 && visibleKeywords.length <= displayCount && (
                <div className="px-3 py-2 bg-gray-50 text-xs text-gray-500 text-center">
                  전체 {visibleKeywords.length.toLocaleString()}개 모두 표시 중
                </div>
              )}
            </div>

            <p className="text-xs text-gray-500 mt-3">
              * 네이버 검색광고 API 실시간 조회. PC + 모바일 월간 검색수 합계.
              {result.realVolumeCount > 0 && ` 검증된 키워드 ${result.realVolumeCount}개 표시 (네이버 응답 그대로 — 0 포함).`}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex">
      <dt className="w-20 text-gray-500 shrink-0">{label}</dt>
      <dd className="text-gray-900 font-medium">{value}</dd>
    </div>
  );
}

function Stat({ label, value, highlight, muted }: { label: string; value: number; highlight?: boolean; muted?: boolean }) {
  return (
    <div className={`bg-white rounded-lg border p-4 shadow-sm ${
      highlight ? "border-orange-300 bg-orange-50/50" : muted ? "border-gray-200 opacity-70" : "border-gray-200"
    }`}>
      <div className={`text-2xl font-bold ${highlight ? "text-orange-600" : "text-gray-900"}`}>
        {value.toLocaleString()}
      </div>
      <div className="text-xs text-gray-500 mt-1">{label}</div>
    </div>
  );
}

function CategoryRow({ num, label, items, colorClass }: { num: number; label: string; items: string[]; colorClass: string }) {
  return (
    <div className="flex items-start gap-3 py-1">
      <div className={`shrink-0 w-7 h-7 rounded-full ${colorClass} flex items-center justify-center text-xs font-bold`}>
        {num}
      </div>
      <div className="flex-1">
        <div className="text-xs text-gray-500 mb-1">{label} · {items.length}개</div>
        <div className="flex flex-wrap gap-1">
          {items.map((item, i) => (
            <span key={i} className={`px-2 py-0.5 rounded text-xs ${colorClass}`}>{item}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

function PatternBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
        active
          ? "bg-gray-900 text-white"
          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
      }`}
    >
      {children}
    </button>
  );
}

function SourceBadge({ source, label }: { source: "naver-api" | "mock"; label?: string }) {
  if (source === "naver-api") {
    return <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 font-medium">{label || "실 API"}</span>;
  }
  return <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-200 text-gray-600 font-medium">{label || "mock"}</span>;
}
