/**
 * 카카오 로컬 API 래퍼
 * - 업체 검색 → 좌표 (lat/lng)
 * - 카테고리 검색 → 1.5km 반경 POI (랜드마크)
 *
 * 키 없으면 mock 폴백
 */

const KAKAO_API = "https://dapi.kakao.com/v2/local";
const HAS_KAKAO_KEY = () => !!process.env.KAKAO_REST_KEY;

function kakaoHeaders() {
  return { Authorization: `KakaoAK ${process.env.KAKAO_REST_KEY!}` };
}

export interface Coord {
  lat: number;
  lng: number;
}

export interface POI {
  name: string;
  category_group_code: string; // SC4, BK9, AT4, MT1, SW8, OL7
  distance_m: number;
}

/**
 * 업체명으로 좌표 찾기 (카카오 키워드 검색)
 */
export async function geocodeByQuery(query: string): Promise<Coord | null> {
  if (!HAS_KAKAO_KEY()) {
    return { lat: 37.5004, lng: 127.0366 }; // 역삼동 mock
  }
  const url = `${KAKAO_API}/search/keyword.json?query=${encodeURIComponent(query)}&size=1`;
  const res = await fetch(url, { headers: kakaoHeaders() });
  if (!res.ok) {
    console.error(`[kakao] keyword.json HTTP ${res.status}`);
    return null;
  }
  const data = await res.json();
  const doc = data.documents?.[0];
  if (!doc) return null;
  return { lat: parseFloat(doc.y), lng: parseFloat(doc.x) };
}

/**
 * 1.5km 반경 카테고리별 POI (랜드마크) 검색
 */
const POI_CATEGORIES: { code: string; label: string; max: number }[] = [
  { code: "SC4", label: "학교", max: 5 },
  { code: "SW8", label: "지하철역", max: 3 },
  { code: "MT1", label: "대형마트", max: 3 },
  { code: "AT4", label: "관광명소", max: 3 },
  { code: "BK9", label: "은행", max: 2 },
];

export async function nearbyLandmarks(
  coord: Coord,
  radius_m: number = 1500
): Promise<POI[]> {
  if (!HAS_KAKAO_KEY()) {
    return mockLandmarks();
  }
  const result: POI[] = [];
  for (const cat of POI_CATEGORIES) {
    const url = `${KAKAO_API}/search/category.json?category_group_code=${cat.code}&x=${coord.lng}&y=${coord.lat}&radius=${radius_m}&size=15`;
    const res = await fetch(url, { headers: kakaoHeaders() });
    if (!res.ok) continue;
    const data = await res.json();
    const docs = (data.documents || []).slice(0, cat.max);
    for (const d of docs) {
      result.push({
        name: d.place_name,
        category_group_code: cat.code,
        distance_m: parseInt(d.distance, 10),
      });
    }
  }
  return result;
}

function mockLandmarks(): POI[] {
  return [
    { name: "역삼초등학교", category_group_code: "SC4", distance_m: 320 },
    { name: "역삼역", category_group_code: "SW8", distance_m: 480 },
    { name: "강남역", category_group_code: "SW8", distance_m: 1100 },
    { name: "GS25 역삼점", category_group_code: "MT1", distance_m: 220 },
  ];
}
