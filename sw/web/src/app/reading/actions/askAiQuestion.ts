/*
  파일명: /app/reading/actions/askAiQuestion.ts
  기능: AI 질문 Server Action
  책임: Gemini API를 사용해 독서 관련 질문에 답변한다.
*/ // ------------------------------

"use server";

import { createClient } from "@/lib/supabase/server";
import { callGemini } from "@feelandnote/ai-services/gemini";

export interface AiGeneratedSection {
  type: "character" | "timeline" | "conceptMap" | "comparison" | "glossary";
  title: string;
  data: any;
}

interface RequestAiGenerationParams {
  request: string;
  bookTitle?: string;
  bookAuthor?: string;
  notes: string[];
  apiKey?: string;
}

interface RequestAiGenerationResult {
  success: boolean;
  summary: string;
  sections: AiGeneratedSection[];
  error?: string;
  recoveryPrompt?: string;
  rawText?: string;
}

export async function requestAiGeneration({
  request,
  bookTitle,
  bookAuthor,
  notes,
  apiKey,
}: RequestAiGenerationParams): Promise<RequestAiGenerationResult> {
  try {
    let activeApiKey = apiKey;

    if (!activeApiKey) {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("gemini_api_key")
          .eq("id", user.id)
          .single();

        activeApiKey = profile?.gemini_api_key;
      }
    }

    // 사용자 키가 없으면 시스템 키 사용
    if (!activeApiKey) {
      activeApiKey = process.env.GEMINI_API_KEY;
    }

    if (!activeApiKey) {
      return { 
        success: false, 
        summary: "", 
        sections: [], 
        error: "AI 서비스를 이용할 수 없습니다 (API 키 누락). 외부 AI 가이드를 이용해 보세요." 
      };
    }

    const contextParts: string[] = [];
    if (bookTitle) {
      contextParts.push(`[현재 책] 제목: ${bookTitle}${bookAuthor ? `, 저자: ${bookAuthor}` : ""}`);
    }
    if (notes.length > 0) {
      contextParts.push(`[사용자 메모]\n${notes.join("\n")}`);
    }

    const prompt = `당신은 독서 지원 및 데이터 분석 전문가입니다. 사용자의 요청(request)과 현재 읽고 있는 책의 컨텍스트(context)를 분석하여, 요청에 가장 적합한 형태의 데이터를 JSON으로 생성하세요.

**지원하는 데이터 타입**:
1. **character**: 인물 조직도 - 등장인물, 세력 관계, 조직 구조 분석
2. **timeline**: 타임라인 - 시간순 사건, 역사적 흐름, 플롯 전개
3. **conceptMap**: 개념 맵 - 철학 개념, 이론 체계, 아이디어 계층 구조
4. **comparison**: 비교표 - 여러 항목의 특징 비교, 장단점 분석
5. **glossary**: 용어집 - 전문 용어, 생소한 단어, 개념 정의

**당신의 임무**:
1. 사용자 요청을 분석하여 가장 적합한 데이터 타입을 선택하십시오.
2. 책의 내용과 사용자 메모를 바탕으로 정확하고 유용한 데이터를 생성하십시오.
3. 사용자가 특정 장이나 구간을 언급했다면 해당 부분에 집중하십시오.

**반드시 지켜야 할 규칙**:
1. 오직 유효한 JSON 객체 하나만 출력하십시오.
2. 마크다운 코드 블록(\`\`\`json)은 절대로 사용하지 마십시오.
3. 데이터의 논리적 일관성을 유지하십시오.

JSON 스키마:
{
  "summary": "생성한 데이터에 대한 2~3문장의 요약 (한국어)",
  "sections": [
    {
      "type": "character" | "timeline" | "conceptMap" | "comparison" | "glossary",
      "title": "섹션 제목",
      "data": { /* 타입별 데이터 구조 */ }
    }
  ]
}

**타입별 데이터 구조**:

1. character (인물 조직도):
{
  "characters": [
    {
      "names": ["이름", "별명"],
      "gender": "male" | "female" | "unknown",
      "description": "인물 설명",
      "group": "소속 조직 (예: 조선군, 탐정사무소)",
      "subgroup": "세부 조직 (예: 이순신 휘하)",
      "rank": "직급/역할 (예: 장군, 탐정)",
      "relations": [{ "targetName": "상대 이름", "type": "관계 유형" }]
    }
  ]
}

2. timeline (타임라인):
{
  "events": [
    {
      "date": "날짜/시점 (예: 1592년 4월, 3장)",
      "title": "사건 제목",
      "description": "상세 설명",
      "category": "카테고리 (예: 정치, 경제, 전쟁, 문화)"
    }
  ]
}

3. conceptMap (개념 맵):
{
  "concepts": [
    {
      "name": "개념명",
      "description": "개념 설명",
      "parentId": null, // 부모 개념의 name (최상위는 null)
      "level": 0 // 계층 레벨
    }
  ]
}

4. comparison (비교표):
{
  "items": [
    {
      "name": "비교 대상 이름",
      "criteria": {
        "기준1": "값1",
        "기준2": "값2"
      }
    }
  ],
  "criteriaOrder": ["기준1", "기준2"]
}

5. glossary (용어집):
{
  "terms": [
    {
      "term": "용어",
      "definition": "정의",
      "category": "카테고리 (예: 역사, 철학)",
      "page": "페이지 번호 (선택)"
    }
  ]
}

현재 컨텍스트:
${contextParts.join("\n")}

사용자 요청: ${request}
`;

    const result = await callGemini({
      apiKey: activeApiKey,
      prompt,
      maxOutputTokens: 4000,
    }, { json: true });

    if (result.error) {
      return { success: false, summary: "", sections: [], error: result.error };
    }

    // JSON 파싱 시도
    try {
      // JSON 모드가 활성화되어도 간혹 포함될 수 있는 노이즈 제거
      let jsonStr = result.text?.trim() || "{}";
      
      // 마크다운 코드 블록 제거 (RegExp)
      jsonStr = jsonStr.replace(/^```[a-z]*\n?/i, "").replace(/\n?```$/i, "");
      
      const parsed = JSON.parse(jsonStr);
      
      return {
        success: true,
        summary: parsed.summary || "자료 생성이 완료되었습니다.",
        sections: parsed.sections || [],
      };
    } catch (parseErr) {
      console.error("AI 응답 JSON 파싱 실패:", result.text);
      
      const recoveryInstructions = `당신은 데이터 복구 전문가입니다. 아래는 시스템에서 AI(Gemini)에게 요청했으나 응답이 잘리거나 형식이 깨져서 도착한 데이터입니다.
이 데이터를 분석하여 원래 의도했던 유효한 JSON 형식으로 복구해주세요. 

**사용자 요청**:
${request}

**요구사항**:
1. 오직 유효한 JSON 객체 하나만 출력하십시오.
2. 시스템이 기대하는 JSON 스키마를 반드시 준수하십시오.
3. 데이터가 잘렸다면 문맥을 고려하여 가장 자연스럽게 마무리하십시오.

**기대 스키마**:
{
  "summary": "내용 요약",
  "sections": [
    {
      "type": "character" | "timeline" | "conceptMap" | "comparison" | "glossary",
      "title": "...",
      "data": { /* 타입에 맞는 구조 */ }
    }
  ]
}

**전달된 깨진 데이터**:
${result.text}
`;

      if (result.finishReason === "MAX_TOKENS") {
        return { 
          success: false, 
          summary: "", 
          sections: [], 
          error: "AI 응답이 너무 길어 처리가 중단되었습니다. 복구 프롬프트를 사용하여 다른 AI에게 요청해 볼 수 있습니다.",
          recoveryPrompt: recoveryInstructions,
          rawText: result.text
        };
      }

      return { 
        success: false, 
        summary: "", 
        sections: [], 
        error: `AI 응답 구조 분석에 실패했습니다. 복구 프롬프트를 복사하여 다른 AI(Claude 등)에게 수정을 요청해 보세요.`,
        recoveryPrompt: recoveryInstructions,
        rawText: result.text
      };
    }
  } catch (err) {
    console.error("AI 자료 생성 실패:", err);
    return { success: false, summary: "", sections: [], error: "요청 처리 중 오류가 발생했습니다." };
  }
}
