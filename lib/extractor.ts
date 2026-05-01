/**
 * 4 카테고리 키워드 추출 + 조합 생성
 * - 카테고리 1 (지역): 행정구역 + 비행정구역 + 카카오 1.5km 랜드마크
 * - 카테고리 2 (업종/메뉴): 입력 + 동의어 사전
 * - 카테고리 3 (목적): 리뷰 분석 결과
 * - 카테고리 4 (히든): 리뷰 분석 결과
 *
 * 1번 필수, 6 패턴 조합
 */

import { SYNONYM_DICT } from "./dictionaries";
import type { POI } from "./kakao-local";

export interface CategoryResult {
  region: string[];
  industry: string[];
  purpose: string[];
  hidden: string[];
}

export interface CombinedKeyword {
  keyword: string;
  pattern: string;
  parts: { category: number; word: string }[];
  searchVolume?: number;
}

/**
 * 카테고리 1: 지역
 * 입력: 주소 문자열 + 카카오 POI 리스트
 *
 * 추출 원칙:
 *  - 정식 행정명 + 약식 표현 둘 다 추출 (논현동 + 논현)
 *  - 도로명/지번 등 노이즈 제외
 *  - POI는 역명·학교명 등 짧은 이름만, 너무 긴 음식점명 제외
 */
export function buildRegionCategory(address: string, pois: POI[]): string[] {
  const result = new Set<string>();

  // 1) 행정구역 — 구·동만 (시 단위는 너무 광범위해서 광고 키워드로 무의미)
  const dongs = address.match(/[가-힣]+(?:[0-9]동|동)/g) || [];
  const gus = address.match(/[가-힣]+구/g) || [];

  for (const d of dongs) {
    result.add(d); // "논현동"
    const stem = d.replace(/(\d*동)$/, ""); // "논현"
    if (stem && stem.length >= 2 && stem !== d) result.add(stem);
  }
  for (const g of gus) {
    result.add(g); // "강남구"
    const stem = g.replace(/구$/, ""); // "강남"
    if (stem && stem.length >= 2 && stem !== g) result.add(stem);
  }

  // 2) 동+구 결합 (정식 + 약식)
  const dong = dongs[0];
  const gu = gus[0];
  if (dong && gu) {
    result.add(`${gu} ${dong}`); // "강남구 논현동"
    const guStem = gu.replace(/구$/, "");
    const dongStem = dong.replace(/(\d*동)$/, "");
    if (guStem && dongStem) {
      result.add(`${guStem} ${dongStem}`); // "강남 논현"
    }
  }

  // 3) POI → 랜드마크 (엄격한 화이트리스트: 역·초중고만)
  for (const p of pois) {
    const name = p.name;

    // (a) 역명 화이트리스트 — "XX역" 패턴이면 무조건 통과
    const stationMatch = name.match(/^([가-힣]+)역/);
    if (stationMatch) {
      result.add(stationMatch[0]); // "신사역"
      const stationStem = stationMatch[1]; // "신사"
      if (stationStem.length >= 2) result.add(stationStem);
      continue;
    }

    // (b) 초·중·고 화이트리스트 — "XX초등학교/중학교/고등학교"
    const schoolMatch = name.match(/^([가-힣]+)(초등학교|중학교|고등학교)$/);
    if (schoolMatch) {
      result.add(name); // "논현초등학교"
      const abbrev = { 초등학교: "초", 중학교: "중", 고등학교: "고" }[schoolMatch[2]];
      result.add(`${schoolMatch[1]}${abbrev}`); // "논현초"
      continue;
    }

    // 그 외 모두 제외 (음식점·마트·대학교·사업장·기타)
    //  - 길어서 키워드성 없음
    //  - 1+4 패턴에서 "강남홈식자재마트 맛집" 같은 노이즈 키워드 만듦
  }

  return [...result].filter((s) => s.length >= 2 && s.length <= 15);
}

/**
 * 카테고리 2: 업종/메뉴/서비스
 * 입력: 네이버 카테고리 ("음식점>한식>주꾸미요리") + 메뉴 추정
 *
 * 추출 원칙:
 *  - 네이버 카테고리 트리 분해
 *  - "주꾸미요리" → "주꾸미"도 추출 (요리/전문점 접미사 제거)
 *  - 동의어 사전 확장
 *  - "음식점", "기타" 같은 너무 광범위한 용어 제외
 */
export function buildIndustryCategory(
  naverCategory: string,
  extraTerms: string[] = []
): string[] {
  const result = new Set<string>();
  const tooBroad = new Set(["음식점", "쇼핑", "기타", "서비스", "전문"]);

  // 네이버 카테고리 ">"로 분리
  naverCategory.split(/[>·,]/).map((s) => s.trim()).forEach((s) => {
    if (s && !tooBroad.has(s)) result.add(s);
  });
  extraTerms.forEach((t) => {
    if (t && !tooBroad.has(t)) result.add(t);
  });

  // 접미사 제거: "주꾸미요리" → "주꾸미"
  for (const t of [...result]) {
    const stem = t.replace(/(요리|전문점|전문|음식|점)$/, "");
    if (stem && stem.length >= 2 && stem !== t) result.add(stem);
  }

  // 동의어 확장
  [...result].forEach((term) => {
    const synonyms = SYNONYM_DICT[term];
    if (synonyms) synonyms.forEach((s) => result.add(s));
  });
  return [...result].filter((s) => s.length >= 2 && s.length <= 10);
}

/**
 * 1번 필수 + 6 패턴 조합
 */
export function combine(cats: CategoryResult): CombinedKeyword[] {
  const result: CombinedKeyword[] = [];
  const seen = new Set<string>();

  const add = (parts: { category: number; word: string }[], pattern: string) => {
    const keyword = parts.map((p) => p.word).join(" ").replace(/\s+/g, " ").trim();
    const normalized = keyword.replace(/\s/g, "");
    if (seen.has(normalized) || keyword.length < 3) return;
    seen.add(normalized);
    result.push({ keyword, pattern, parts });
  };

  for (const r of cats.region) {
    // 1+2 (지역+업종) — "신사역 한식"
    for (const i of cats.industry) {
      add([{ category: 1, word: r }, { category: 2, word: i }], "1+2");
    }
    // 1+3 (지역+목적) — "신사역 회식"
    for (const p of cats.purpose) {
      add([{ category: 1, word: r }, { category: 3, word: p }], "1+3");
    }
    // 1+4 (지역+히든) — "신사역 맛집", "논현동 추천"
    for (const h of cats.hidden) {
      add([{ category: 1, word: r }, { category: 4, word: h }], "1+4");
    }
    // 1+2+3
    for (const i of cats.industry) {
      for (const p of cats.purpose) {
        add([
          { category: 1, word: r },
          { category: 2, word: i },
          { category: 3, word: p },
        ], "1+2+3");
      }
    }
    // 1+2+4
    for (const i of cats.industry) {
      for (const h of cats.hidden) {
        add([
          { category: 1, word: r },
          { category: 2, word: i },
          { category: 4, word: h },
        ], "1+2+4");
      }
    }
    // 1+3+4
    for (const p of cats.purpose) {
      for (const h of cats.hidden) {
        add([
          { category: 1, word: r },
          { category: 3, word: p },
          { category: 4, word: h },
        ], "1+3+4");
      }
    }
    // 1+2+3+4 (롱테일)
    for (const i of cats.industry) {
      for (const p of cats.purpose) {
        for (const h of cats.hidden) {
          add([
            { category: 1, word: r },
            { category: 2, word: i },
            { category: 3, word: p },
            { category: 4, word: h },
          ], "1+2+3+4");
        }
      }
    }
  }
  return result;
}

/**
 * 조회수 검증 mock (네이버 검색광고 API BYOK 연동 후 실제 호출 교체)
 */
export function mockSearchVolume(keyword: string): number {
  let hash = 0;
  for (let i = 0; i < keyword.length; i++) {
    hash = (hash * 31 + keyword.charCodeAt(i)) & 0xfffffff;
  }
  const lengthFactor = Math.max(0, 30 - keyword.length) / 30;
  const baseVolume = (hash % 5000) * lengthFactor;
  if ((hash % 10) < 3) return 0;
  return Math.floor(baseVolume);
}

export function groupByPattern(keywords: CombinedKeyword[]): Record<string, CombinedKeyword[]> {
  const result: Record<string, CombinedKeyword[]> = {};
  for (const k of keywords) {
    if (!result[k.pattern]) result[k.pattern] = [];
    result[k.pattern].push(k);
  }
  return result;
}
