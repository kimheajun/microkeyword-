/**
 * 리뷰 텍스트 → Claude API → 4 카테고리 중 "목적" + "히든" 자동 추출
 *
 * 입력: 업체명·카테고리·리뷰 텍스트 모음
 * 출력: 추출된 목적 키워드 + 히든 키워드 (+ 분석 근거)
 */

import Anthropic from "@anthropic-ai/sdk";
import { PURPOSE_DICT, HIDDEN_DICT } from "./dictionaries";

export interface ReviewAnalysis {
  purposes: string[]; // 카테고리 3
  hidden: string[]; // 카테고리 4
  reasoning: string; // 분석 근거 (사용자에게 보여줌)
  source: "claude" | "fallback";
}

const HAS_ANTHROPIC_KEY = () => !!process.env.ANTHROPIC_API_KEY;

export async function analyzeReviews(
  placeName: string,
  category: string,
  reviewTexts: string[]
): Promise<ReviewAnalysis> {
  if (!HAS_ANTHROPIC_KEY() || reviewTexts.length === 0) {
    return fallback();
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
  const model = process.env.ANTHROPIC_MODEL || "claude-opus-4-7";

  const reviewSample = reviewTexts.slice(0, 30).join("\n---\n");

  const prompt = `당신은 한국 자영업자 네이버 광고 키워드 추출 전문가입니다.

**업체명**: ${placeName}
**카테고리**: ${category}

**수집된 리뷰 텍스트** (블로그·후기에서 ${reviewTexts.length}개 발췌):
${reviewSample}

위 리뷰들을 분석해서 이 업체에 광고할 때 사용할 **2가지 키워드 카테고리**를 추출하세요.

## 카테고리 3: 목적 (방문 목적·상황)
- **단일 명사** 형태만 (예: "혼밥", "데이트", "회식")
- **2~5자** 짧은 단어
- 합성어·구문 금지 (예: "강남데이트" X, "데이트" O)
- 다음 사전에서 적합한 것 5~10개 우선 + 리뷰에서 발견된 새 단어만 추가

사전 후보:
${PURPOSE_DICT.join(", ")}

## 카테고리 4: 히든 (찾는 말투·검색어 수식어)
- **단일 단어 수식어**만 (예: "맛집", "추천", "근처", "후기")
- **2~5자** 짧은 단어
- **합성어 절대 금지**: "강남구청역맛집", "한티역카페", "강남카페추천" 같은 [지역+히든] 합성어 X
  → 리뷰에서 그런 표현이 보여도 분해해서 단일 단어만 추출 ("강남카페" → "카페"는 카테고리 2임 → 히든에 X)
- 다음 사전에서 적합한 것 8~15개 우선 + 리뷰에서 발견된 새 단일 단어만 추가

사전 후보:
${HIDDEN_DICT.join(", ")}

## 중요 원칙
- 카테고리 3·4는 카테고리 1(지역) + 다른 카테고리와 자동으로 조합되므로, 절대 카테고리 3·4 단어 자체에 지역명·업종명이 포함되면 안 됨.
- 예시 (잘못): hidden에 "한티역카페", "강남카페" → 한티역(지역)과 카페(업종) 합쳐진 합성어, 우리 시스템과 중복.
- 예시 (정답): hidden에 "맛집", "추천", "동네", "근처" → 단일 수식어, 지역과 자동 조합돼서 "한티역 맛집" 생성.

## 출력 형식 (반드시 이 JSON 한 객체만, 설명·코드블록 없이)
{
  "purposes": ["...", "..."],
  "hidden": ["...", "..."],
  "reasoning": "리뷰에서 X 같은 표현이 자주 나와서 Y 목적으로 추출했고, Z..."
}`;

  try {
    const resp = await client.messages.create({
      model,
      max_tokens: 1500,
      messages: [{ role: "user", content: prompt }],
    });

    const textBlock = resp.content.find((b) => b.type === "text");
    const text = textBlock && "text" in textBlock ? textBlock.text : "";
    // JSON 추출 (코드블록 제거)
    const cleaned = text.replace(/```json\n?|```/g, "").trim();
    const data = JSON.parse(cleaned);

    // 후처리 필터: 합성어·긴 단어 제거
    const sanitize = (arr: any): string[] => {
      if (!Array.isArray(arr)) return [];
      return arr
        .filter((s) => typeof s === "string")
        .map((s) => s.trim())
        .filter((s) => s.length >= 2 && s.length <= 5)
        .filter((s) => !/[가-힣]+(역|동|구|시|점|관|로|길)/.test(s)) // 지역 접미사 포함 단어 제외
        .filter((s) => !/카페|식당|커피|치킨|레스토랑|호텔|학교/.test(s)); // 업종 단어 제외 (카테고리 2 중복)
    };

    return {
      purposes: sanitize(data.purposes),
      hidden: sanitize(data.hidden),
      reasoning: typeof data.reasoning === "string" ? data.reasoning : "",
      source: "claude",
    };
  } catch (e) {
    console.error("[review-analyzer] Claude 호출 실패:", e);
    return fallback();
  }
}

function fallback(): ReviewAnalysis {
  return {
    purposes: PURPOSE_DICT.slice(0, 8),
    hidden: HIDDEN_DICT.slice(0, 15),
    reasoning: "(리뷰 분석 실패 또는 키 미설정 — 사전 디폴트 사용)",
    source: "fallback",
  };
}
