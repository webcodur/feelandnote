import { useState } from "react";
import { Sparkles, Save, Check, Copy, ExternalLink, AlertCircle, BookOpen, Users, Calendar, Network, Table as TableIcon, BookText } from "lucide-react";
import type { AiGeneratedSection } from "../actions/askAiQuestion";
import type { SelectedBook, SectionType } from "../types";

interface Props {
  selectedBook: SelectedBook | null;
  notes: string[];
  onAddSections: (sections: AiGeneratedSection[]) => void;
}

type GenerationType = "character" | "timeline" | "conceptMap" | "comparison" | "glossary";
type ColorType = "blue" | "purple" | "pink" | "orange" | "cyan";

const GENERATION_TYPES: Array<{
  type: GenerationType;
  label: string;
  icon: typeof Users;
  color: ColorType;
}> = [
  { type: "character" as const, label: "인물 조직도", icon: Users, color: "blue" },
  { type: "timeline" as const, label: "타임라인", icon: Calendar, color: "purple" },
  { type: "conceptMap" as const, label: "개념 맵", icon: Network, color: "pink" },
  { type: "comparison" as const, label: "비교표", icon: TableIcon, color: "orange" },
  { type: "glossary" as const, label: "용어집", icon: BookText, color: "cyan" },
];

export default function AiGenerationPanel({ selectedBook, notes, onAddSections }: Props) {
  const [selectedType, setSelectedType] = useState<GenerationType>("character");
  const [manualJson, setManualJson] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const generatePrompt = () => {
    if (!selectedBook) return "";

    const contextParts: string[] = [];
    contextParts.push(`[현재 책] 제목: ${selectedBook.title}${selectedBook.author ? `, 저자: ${selectedBook.author}` : ""}`);

    if (notes.length > 0) {
      contextParts.push(`[현재 작성 중인 메모]\n${notes.join("\n")}`);
    }

    const context = contextParts.join("\n");

    const prompts: Record<GenerationType, string> = {
      character: `당신은 독서 지원 및 인물 관계 분석 전문가입니다. 아래 도서의 등장인물과 조직 구조를 분석하여 인물 조직도 데이터를 JSON으로 생성하세요.

**작업 목표**: 책 속의 복잡한 인물 관계, 대립 구조, 조직 체계를 명확히 파악할 수 있도록 구조화

**규칙**:
1. 오직 유효한 JSON 객체 하나만 출력 (코드 블록 \`\`\`json 사용)
2. 모든 인물의 group(조직), subgroup(세부조직), rank(직급) 명시
3. 관계의 targetName은 반드시 characters 내 names 중 하나

**JSON 스키마**:
{
  "summary": "인물 관계 분석 요약 (2~3문장)",
  "sections": [{
    "type": "character",
    "title": "인물 관계도 제목",
    "data": {
      "characters": [{
        "names": ["이름", "별명"],
        "gender": "male" | "female" | "unknown",
        "description": "인물 특징",
        "group": "소속 조직 (예: 조선군, 탐정사무소)",
        "subgroup": "세부 조직 (예: 이순신 휘하)",
        "rank": "직급/역할 (예: 장군, 탐정)",
        "relations": [{"targetName": "상대 이름", "type": "관계"}]
      }]
    }
  }]
}

**현재 컨텍스트**:
${context}

**요청**: 위 도서의 주요 인물과 조직 구조를 분석하여 인물 관계도를 생성해줘.`,

      timeline: `당신은 독서 지원 및 시간 흐름 분석 전문가입니다. 아래 도서의 사건을 시간 순서대로 정리한 타임라인 데이터를 JSON으로 생성하세요.

**작업 목표**: 책의 플롯, 역사적 사건, 중요한 전환점을 시간순으로 파악

**규칙**:
1. 오직 유효한 JSON 객체 하나만 출력 (코드 블록 \`\`\`json 사용)
2. 날짜는 구체적으로 (예: 1592년 4월, 3장, 첫 만남)
3. 카테고리 활용 (정치, 경제, 사회, 문화, 전쟁, 기타)

**JSON 스키마**:
{
  "summary": "타임라인 요약 (2~3문장)",
  "sections": [{
    "type": "timeline",
    "title": "타임라인 제목",
    "data": {
      "events": [{
        "date": "날짜/시점",
        "title": "사건 제목",
        "description": "상세 설명",
        "category": "카테고리"
      }]
    }
  }]
}

**현재 컨텍스트**:
${context}

**요청**: 위 도서의 주요 사건을 시간순으로 정리한 타임라인을 생성해줘.`,

      conceptMap: `당신은 독서 지원 및 개념 구조 분석 전문가입니다. 아래 도서의 핵심 개념과 그 계층 구조를 분석한 개념 맵 데이터를 JSON으로 생성하세요.

**작업 목표**: 철학, 이론, 아이디어의 계층적 관계를 명확히 시각화

**규칙**:
1. 오직 유효한 JSON 객체 하나만 출력 (코드 블록 \`\`\`json 사용)
2. parentId는 부모 개념의 name (최상위는 null)
3. level은 0부터 시작 (최상위 개념은 0)

**JSON 스키마**:
{
  "summary": "개념 구조 요약 (2~3문장)",
  "sections": [{
    "type": "conceptMap",
    "title": "개념 맵 제목",
    "data": {
      "concepts": [{
        "name": "개념명",
        "description": "개념 설명",
        "parentId": null,
        "level": 0
      }]
    }
  }]
}

**현재 컨텍스트**:
${context}

**요청**: 위 도서의 핵심 개념과 그 관계를 계층적으로 정리한 개념 맵을 생성해줘.`,

      comparison: `당신은 독서 지원 및 비교 분석 전문가입니다. 아래 도서에서 비교되는 여러 항목을 기준별로 정리한 비교표 데이터를 JSON으로 생성하세요.

**작업 목표**: 여러 대상의 특징, 장단점, 차이점을 명확히 비교

**규칙**:
1. 오직 유효한 JSON 객체 하나만 출력 (코드 블록 \`\`\`json 사용)
2. 비교 기준은 명확하고 일관성 있게
3. criteriaOrder는 중요한 순서대로 배열

**JSON 스키마**:
{
  "summary": "비교 분석 요약 (2~3문장)",
  "sections": [{
    "type": "comparison",
    "title": "비교표 제목",
    "data": {
      "items": [{
        "name": "항목명",
        "criteria": {
          "기준1": "값1",
          "기준2": "값2"
        }
      }],
      "criteriaOrder": ["기준1", "기준2"]
    }
  }]
}

**현재 컨텍스트**:
${context}

**요청**: 위 도서에서 비교되는 주요 항목들을 기준별로 정리한 비교표를 생성해줘.`,

      glossary: `당신은 독서 지원 및 용어 정의 전문가입니다. 아래 도서에 등장하는 전문 용어와 생소한 단어를 정리한 용어집 데이터를 JSON으로 생성하세요.

**작업 목표**: 어려운 용어의 정의를 명확히 제공하여 이해 증진

**규칙**:
1. 오직 유효한 JSON 객체 하나만 출력 (코드 블록 \`\`\`json 사용)
2. 용어는 가나다/알파벳순 권장
3. 카테고리 활용 (역사, 철학, 경제, 과학 등)

**JSON 스키마**:
{
  "summary": "용어집 요약 (2~3문장)",
  "sections": [{
    "type": "glossary",
    "title": "용어집 제목",
    "data": {
      "terms": [{
        "term": "용어",
        "definition": "정의",
        "category": "카테고리",
        "page": "페이지 (선택)"
      }]
    }
  }]
}

**현재 컨텍스트**:
${context}

**요청**: 위 도서의 전문 용어와 생소한 단어를 정리한 용어집을 생성해줘.`,
    };

    return prompts[selectedType];
  };

  const handleManualSubmit = () => {
    try {
      if (!manualJson.trim()) return;
      
      const cleanJson = manualJson.trim().replace(/^```[a-z]*\n?/i, "").replace(/\n?```$/i, "");
      const parsed = JSON.parse(cleanJson);
      
      if (parsed.sections && Array.isArray(parsed.sections)) {
        onAddSections(parsed.sections);
        setManualJson("");
        setError(null);
        alert("데이터가 워크스페이스에 추가되었습니다.");
      } else {
        setError("유효한 Feelandnote 데이터 구조가 아닙니다.");
      }
    } catch (err) {
      setError("JSON 형식이 올바르지 않습니다. 코드를 다시 확인해주세요.");
    }
  };

  if (!selectedBook) {
    return (
      <div className="rounded-xl border border-dashed border-border/50 bg-white/5 p-6 text-center">
        <BookOpen className="mx-auto size-8 text-text-tertiary/30 mb-3" />
        <p className="text-sm text-text-secondary">분석할 책을 먼저 선택해주세요</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 rounded-xl bg-[#1a1f27] p-5 shadow-2xl border border-white/10 max-h-[80vh] overflow-y-auto">
      {/* 1. 분석 요청 섹션 */}
      <section className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
        <div className="flex items-center gap-2 text-sm font-medium text-white/90">
          <Sparkles className="size-4 text-accent" />
          <span>
            현재 <span className="text-accent font-bold mx-0.5">{selectedBook.title}</span>의 정보를 바탕으로...
          </span>
        </div>

        {/* 타입 선택 */}
        <div className="grid grid-cols-5 gap-1.5">
          {GENERATION_TYPES.map(({ type, label, icon: Icon, color }) => {
            const isSelected = selectedType === type;
            const colorClasses = {
              blue: isSelected ? "bg-blue-500/20 text-blue-400 border-blue-500/50" : "bg-white/5 text-text-secondary hover:bg-blue-500/10 hover:text-blue-400",
              purple: isSelected ? "bg-purple-500/20 text-purple-400 border-purple-500/50" : "bg-white/5 text-text-secondary hover:bg-purple-500/10 hover:text-purple-400",
              pink: isSelected ? "bg-pink-500/20 text-pink-400 border-pink-500/50" : "bg-white/5 text-text-secondary hover:bg-pink-500/10 hover:text-pink-400",
              orange: isSelected ? "bg-orange-500/20 text-orange-400 border-orange-500/50" : "bg-white/5 text-text-secondary hover:bg-orange-500/10 hover:text-orange-400",
              cyan: isSelected ? "bg-cyan-500/20 text-cyan-400 border-cyan-500/50" : "bg-white/5 text-text-secondary hover:bg-cyan-500/10 hover:text-cyan-400",
            };

            return (
              <button
                key={type}
                onClick={() => {
                  setSelectedType(type);
                  setIsCopied(false);
                }}
                className={`flex flex-col items-center gap-1 rounded-lg border p-2 text-[10px] font-medium transition-all ${colorClasses[color]}`}
              >
                <Icon className="size-4" />
                <span className="text-center leading-tight">{label}</span>
              </button>
            );
          })}
        </div>

        {/* 사용 방법 안내 */}
        <div className="rounded-lg bg-white/5 p-3 text-xs text-text-tertiary space-y-1.5 leading-relaxed">
          <p className="flex gap-2">
            <span className="font-bold text-accent">1.</span>
            <span>아래 버튼으로 프롬프트를 복사하세요.</span>
          </p>
          <p className="flex gap-2">
            <span className="font-bold text-accent">2.</span>
            <span>Claude나 ChatGPT에 붙여넣어 분석을 요청하세요.</span>
          </p>
          <p className="flex gap-2">
            <span className="font-bold text-accent">3.</span>
            <span>생성된 JSON 코드를 하단 입력창에 붙여넣으세요.</span>
          </p>
        </div>

        <button
          onClick={() => copyToClipboard(generatePrompt())}
          className={`group w-full flex items-center justify-center gap-2 rounded-lg py-3 text-xs font-bold transition-all ${
            isCopied 
              ? 'bg-green-500/20 text-green-400 ring-1 ring-green-500/50' 
              : 'bg-accent/10 text-accent hover:bg-accent hover:text-white ring-1 ring-accent/30 hover:ring-accent'
          }`}
        >
          {isCopied ? (
            <>
              <Check className="size-4" />
              프롬프트 복사완료!
            </>
          ) : (
            <>
              <Copy className="size-4 group-hover:scale-110 transition-transform" />
              {GENERATION_TYPES.find((t) => t.type === selectedType)?.label} 프롬프트 복사하기
            </>
          )}
        </button>

        <div className="grid grid-cols-2 gap-2">
          <a 
            href="https://claude.ai" 
            target="_blank" 
            className="flex items-center justify-center gap-1.5 py-2.5 rounded-lg bg-white/5 text-[11px] text-text-secondary hover:bg-[#d97757]/20 hover:text-[#d97757] hover:border-[#d97757]/30 border border-transparent transition-all"
          >
            Claude <ExternalLink className="size-3 opacity-50" />
          </a>
          <a 
            href="https://chatgpt.com" 
            target="_blank" 
            className="flex items-center justify-center gap-1.5 py-2.5 rounded-lg bg-white/5 text-[11px] text-text-secondary hover:bg-[#74aa9c]/20 hover:text-[#74aa9c] hover:border-[#74aa9c]/30 border border-transparent transition-all"
          >
            ChatGPT <ExternalLink className="size-3 opacity-50" />
          </a>
          <a 
            href="https://grok.x.ai" 
            target="_blank" 
            className="flex items-center justify-center gap-1.5 py-2.5 rounded-lg bg-white/5 text-[11px] text-text-secondary hover:bg-white/20 hover:text-white hover:border-white/30 border border-transparent transition-all"
          >
            Grok <ExternalLink className="size-3 opacity-50" />
          </a>
          <a 
            href="https://gemini.google.com" 
            target="_blank" 
            className="flex items-center justify-center gap-1.5 py-2.5 rounded-lg bg-white/5 text-[11px] text-text-secondary hover:bg-[#4b90ff]/20 hover:text-[#4b90ff] hover:border-[#4b90ff]/30 border border-transparent transition-all"
          >
            Gemini <ExternalLink className="size-3 opacity-50" />
          </a>
        </div>
      </section>

      <div className="h-px bg-white/10" />

      {/* 2. 결과 적용 섹션 */}
      <section className="space-y-3 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-75">
        <div className="flex items-center gap-2 text-xs font-semibold text-text-secondary">
          <Save className="size-3.5" />
          결과 데이터 적용
        </div>
        
        <div className="relative">
          <textarea
            value={manualJson}
            onChange={(e) => setManualJson(e.target.value)}
            placeholder='AI 응답의 ```json ... ``` 부분을 복사해서 붙여넣으세요'
            className="w-full h-32 resize-none rounded-lg bg-black/30 p-3 text-[11px] font-mono text-text-primary placeholder:text-text-tertiary/30 focus:outline-none focus:ring-1 focus:ring-accent transition-all custom-scrollbar border border-white/5"
          />
          {error && (
            <div className="absolute bottom-2 right-2 left-2 flex items-center gap-1.5 rounded-md bg-red-500/20 p-2 text-[10px] text-red-300 backdrop-blur-sm animate-in fade-in slide-in-from-bottom-1">
              <AlertCircle className="size-3 shrink-0" />
              {error}
            </div>
          )}
        </div>

        <button
          onClick={handleManualSubmit}
          disabled={!manualJson.trim()}
          className="w-full flex items-center justify-center gap-2 rounded-lg bg-accent py-3 text-xs font-bold text-white shadow-lg shadow-accent/20 hover:bg-accent-hover hover:shadow-accent/40 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
        >
          <Sparkles className="size-4" />
          데이터 생성하기
        </button>
      </section>
    </div>
  );
}
