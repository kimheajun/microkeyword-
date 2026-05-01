/**
 * 네이버 검색광고 API — 키워드 도구 (조회수)
 *
 * 인증: HMAC-SHA256 서명
 *  - X-Timestamp: ms 단위 timestamp
 *  - X-API-KEY: Access License
 *  - X-Customer: Customer ID
 *  - X-Signature: base64(HMAC-SHA256(`{timestamp}.{method}.{uri}`, SecretKey))
 *
 * Rate limit: 분당 60회 (RelKwdStat은 분당 200회 정도로 너그러움)
 * 1회 호출당 hintKeywords 최대 5개 → 연관 키워드 1,000개까지 응답
 */

import crypto from "crypto";

const BASE_URL = "https://api.searchad.naver.com";

export interface NaverSearchAdCreds {
  accessLicense: string;
  secretKey: string;
  customerId: string;
}

const HAS_KEYS = (creds?: NaverSearchAdCreds) => {
  if (creds) return !!creds.accessLicense && !!creds.secretKey && !!creds.customerId;
  return (
    !!process.env.NAVER_SEARCHAD_ACCESS_LICENSE &&
    !!process.env.NAVER_SEARCHAD_SECRET_KEY &&
    !!process.env.NAVER_SEARCHAD_CUSTOMER_ID
  );
};

export interface KeywordStat {
  keyword: string;
  pc: number;          // <10이면 9로 저장
  mobile: number;      // <10이면 9로 저장
  pcDisplay: string;   // "< 10" 또는 "320"
  mobileDisplay: string;
  total: number;       // pc + mobile (둘 다 <10이면 합쳐서 "< 20"으로 표시)
  totalDisplay: string;
  pcUnder10: boolean;
  mobileUnder10: boolean;
  compIdx?: string;    // 경쟁 정도 (낮음/중간/높음)
}

function sign(timestamp: string, method: string, uri: string, secret: string): string {
  const message = `${timestamp}.${method}.${uri}`;
  return crypto.createHmac("sha256", secret).update(message).digest("base64");
}

function getCreds(creds?: NaverSearchAdCreds): NaverSearchAdCreds {
  if (creds) return creds;
  return {
    accessLicense: process.env.NAVER_SEARCHAD_ACCESS_LICENSE!,
    secretKey: process.env.NAVER_SEARCHAD_SECRET_KEY!,
    customerId: process.env.NAVER_SEARCHAD_CUSTOMER_ID!,
  };
}

function headers(method: string, uri: string, creds: NaverSearchAdCreds) {
  const timestamp = Date.now().toString();
  return {
    "X-Timestamp": timestamp,
    "X-API-KEY": creds.accessLicense,
    "X-Customer": creds.customerId,
    "X-Signature": sign(timestamp, method, uri, creds.secretKey),
    "Content-Type": "application/json; charset=UTF-8",
  };
}

/**
 * 키워드 1~5개 → 연관 키워드 + 월 검색량
 * "+" 부호: 일반 키워드를 그대로 검증
 */
async function callKeywordTool(hintKeywords: string[], creds: NaverSearchAdCreds): Promise<KeywordStat[]> {
  const uri = "/keywordstool";
  const normalized = hintKeywords.map((k) => k.replace(/\s+/g, ""));
  const queryParams = new URLSearchParams({
    hintKeywords: normalized.join(","),
    showDetail: "1",
  });
  const url = `${BASE_URL}${uri}?${queryParams.toString()}`;

  const res = await fetch(url, { method: "GET", headers: headers("GET", uri, creds) });
  if (!res.ok) {
    const body = await res.text();
    console.error(`[naver-searchad] HTTP ${res.status}: ${body.slice(0, 200)}`);
    return [];
  }
  const data = await res.json();
  const list = data.keywordList || [];
  return list.map((item: any) => {
    const pc = parseQc(item.monthlyPcQcCnt);
    const mobile = parseQc(item.monthlyMobileQcCnt);
    const total = pc.value + mobile.value;
    return {
      keyword: item.relKeyword,
      pc: pc.value,
      mobile: mobile.value,
      pcDisplay: pc.display,
      mobileDisplay: mobile.display,
      total,
      totalDisplay: total.toLocaleString(),
      pcUnder10: pc.under10,
      mobileUnder10: mobile.under10,
      compIdx: item.compIdx,
    };
  });
}

// 네이버 응답 파싱
//  - "<10" → 0 (네이버 광고관리자 표시 기준)
//  - 숫자/문자열 숫자 → 그대로
//  - 빈값 → 0
function parseQc(v: any): { value: number; display: string; under10: boolean } {
  if (typeof v === "number") {
    return { value: v, display: v.toLocaleString(), under10: false };
  }
  if (typeof v === "string") {
    if (v.trim().startsWith("<")) {
      return { value: 0, display: "0", under10: true };
    }
    const n = parseInt(v.replace(/[^0-9]/g, ""), 10);
    if (isNaN(n)) return { value: 0, display: "0", under10: false };
    return { value: n, display: n.toLocaleString(), under10: false };
  }
  return { value: 0, display: "0", under10: false };
}

/**
 * 우리가 만든 조합 키워드들의 조회수 받기
 *  - 5개씩 배치, 분당 60회 한도 고려해 100ms 간격
 *  - 응답 키워드는 "정규화 (띄어쓰기 없음)" 형태로 매칭
 *  - 매칭 안 되면 빈 결과 (0)
 */
export async function fetchVolumes(
  keywords: string[],
  options: { batchSize?: number; maxKeywords?: number; creds?: NaverSearchAdCreds } = {}
): Promise<Map<string, KeywordStat>> {
  const result = new Map<string, KeywordStat>();
  const creds = getCreds(options.creds);
  if (!HAS_KEYS(options.creds) || keywords.length === 0) return result;

  const batchSize = options.batchSize ?? 5;
  const maxKeywords = options.maxKeywords ?? 500;
  const targetKeywords = keywords.slice(0, maxKeywords);

  for (let i = 0; i < targetKeywords.length; i += batchSize) {
    const batch = targetKeywords.slice(i, i + batchSize);
    try {
      const stats = await callKeywordTool(batch, creds);
      for (const stat of stats) {
        const normResp = stat.keyword.replace(/\s+/g, "");
        for (const k of batch) {
          if (k.replace(/\s+/g, "") === normResp) {
            result.set(k, stat);
            break;
          }
        }
      }
    } catch (e) {
      console.error(`[naver-searchad] batch ${i} 실패`, e);
    }
    if (i + batchSize < targetKeywords.length) {
      await new Promise((r) => setTimeout(r, 80));
    }
  }
  return result;
}

export const HAS_NAVER_SEARCHAD_KEYS = HAS_KEYS;
