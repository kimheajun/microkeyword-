/**
 * 네이버 플레이스 URL 파싱 → 업체ID 추출
 *
 * 지원 형식:
 *  - https://m.place.naver.com/restaurant/{id}/home
 *  - https://map.naver.com/p/entry/place/{id}
 *  - https://pcmap.place.naver.com/restaurant/{id}/home
 *  - https://naver.me/{shortcode}  (단축 → 리다이렉트 추적 필요)
 */

export interface PlaceIdResult {
  placeId: string;
  category?: string; // restaurant / hairshop / accommodation 등
}

const ID_PATTERNS: { regex: RegExp; categoryGroup?: number; idGroup: number }[] = [
  // m.place.naver.com/{category}/{id}/home
  { regex: /m\.place\.naver\.com\/([a-z]+)\/(\d+)/i, categoryGroup: 1, idGroup: 2 },
  // pcmap.place.naver.com/{category}/{id}/home
  { regex: /pcmap\.place\.naver\.com\/([a-z]+)\/(\d+)/i, categoryGroup: 1, idGroup: 2 },
  // map.naver.com/p/entry/place/{id}
  { regex: /map\.naver\.com\/.+?\/place\/(\d+)/i, idGroup: 1 },
  // map.naver.com/v5/.../{id}
  { regex: /map\.naver\.com\/v5\/(?:entry\/)?(?:[a-z]+\/)?(\d+)/i, idGroup: 1 },
];

export function parsePlaceUrl(url: string): PlaceIdResult | null {
  for (const p of ID_PATTERNS) {
    const m = url.match(p.regex);
    if (m) {
      return {
        placeId: m[p.idGroup],
        category: p.categoryGroup ? m[p.categoryGroup] : undefined,
      };
    }
  }
  return null;
}

/**
 * naver.me 단축 URL → 실제 URL로 리다이렉트 추적
 */
export async function resolveShortUrl(url: string): Promise<string> {
  if (!/naver\.me\//.test(url)) return url;
  try {
    const res = await fetch(url, {
      method: "HEAD",
      redirect: "follow",
    });
    return res.url;
  } catch {
    return url;
  }
}

export async function parsePlaceUrlAsync(url: string): Promise<PlaceIdResult | null> {
  const resolved = await resolveShortUrl(url.trim());
  return parsePlaceUrl(resolved);
}

/**
 * 네이버 플레이스 페이지에서 og:title 등 메타태그로 업체명·카테고리 추출
 * placeId만 있을 때 검색 키워드 만들기 위해 사용
 */
export async function fetchPlaceMeta(
  placeId: string,
  category?: string
): Promise<{ title: string | null; description: string | null }> {
  const cat = category || "restaurant";
  const url = `https://m.place.naver.com/${cat}/${placeId}/home`;
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1",
        "Accept-Language": "ko-KR,ko;q=0.9",
      },
    });
    if (!res.ok) return { title: null, description: null };
    const html = await res.text();

    const og = (prop: string) =>
      html.match(
        new RegExp(
          `<meta[^>]+property=["']og:${prop}["'][^>]+content=["']([^"']+)["']`,
          "i"
        )
      )?.[1] || null;

    let title = og("title");
    if (!title) {
      title = html.match(/<title>([^<]+)<\/title>/i)?.[1] || null;
    }
    if (title) {
      // 제어문자(\x00-\x1f) 제거
      title = title.replace(/[\x00-\x1f\x7f]/g, "");
      // " : 네이버" / " | 네이버" / " - 네이버" 같은 사이트명 꼬리 제거
      title = title.replace(/\s*[:\-|]\s*네이버.*$/i, "");
      title = title.trim();
      if (!title) title = null;
    }

    return {
      title,
      description: og("description"),
    };
  } catch {
    return { title: null, description: null };
  }
}
