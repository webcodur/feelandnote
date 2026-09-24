import React from "react";

// 작은따옴표 안의 축약형은 닫는 부호가 아니다. 대시는 짝이 있는 삽입구만 강조한다.
// en dash는 양옆 공백으로 문장용 부호를 구분해 숫자 범위와 합성어를 보존한다.
const EMPHASIS_PATTERN = /("[^"\n]*"|“[^”\n]*”|(?<![\p{L}\p{N}])'(?=\S)[^\n]*?'(?![\p{L}\p{N}])|‘[^\n]*?’(?![\p{L}\p{N}])|『[^』\n]*』|《[^》\n]*》|「[^」\n]*」|〈[^〉\n]*〉|<[^>\n]*>|—[^—\n.!?]+—|(?<=\s)–[^–\n.!?]+–(?=\s|[.,;:!?]|$)|(?<!-)--[^\n.!?]+?--(?!-)|(?<![\p{L}\p{N}\p{M}])\p{L}[\p{L}\p{N}\p{M}’'·-]*[ \t]*\((?=[^()\n]*\p{L})[^()\n]+\))/gu;
const TERM_PATTERN = /^(\p{L}[\p{L}\p{N}\p{M}’'·-]*)([ \t]*\(([^()\n]+)\))$/u;

interface TextPart {
  text: string;
  emphasis: boolean;
  term?: "name" | "definition";
}

function splitEmphasis(text: string): TextPart[] {
  const parts = text.split(EMPHASIS_PATTERN);
  const result: TextPart[] = [];
  for (let i = 0; i < parts.length; i++) {
    const term = i % 2 === 1 ? parts[i].match(TERM_PATTERN) : null;
    if (!term) {
      result.push({ text: parts[i], emphasis: i % 2 === 1 });
      continue;
    }

    let name = term[1];
    const acronym = term[3];
    const previous = result.at(-1);
    // AI·CBT처럼 약칭의 머리글자가 맞을 때만 앞의 여러 영어 단어를 용어에 포함한다.
    if (/^[A-Z]{2,}$/.test(acronym) && previous && !previous.emphasis) {
      const words = Array.from(previous.text.matchAll(/[A-Za-z][A-Za-z'’-]*[ \t]+/g)).slice(-(acronym.length - 1));
      const start = words[0]?.index;
      const prefix = start === undefined ? "" : previous.text.slice(start);
      const initials = [...words.map((word) => word[0][0]), name[0]].join("").toUpperCase();
      if (initials === acronym && words.map((word) => word[0]).join("") === prefix) {
        name = prefix + name;
        previous.text = previous.text.slice(0, start);
      }
    }
    result.push({ text: name, emphasis: true, term: "name" });
    result.push({ text: term[2], emphasis: true, term: "definition" });
  }
  return result;
}

interface FormattedTextProps {
  text: string | null | undefined;
  className?: string;
  highlightClassName?: string;
  highlightStyle?: React.CSSProperties;
  /** 원문 기준 강조 범위 — 겹치는 출력 조각을 <mark>로 감싼다. 모든 부호 변환이 1:1이라 오프셋이 유지된다 */
  mark?: { start: number; end: number } | null;
}

/**
 * 작성자가 넣은 빈 줄은 그대로 문단 경계로 쓴다.
 * 오래된 단일 문단 데이터가 지나치게 길 때만 문장 경계에서 두 덩어리로 나눠 읽기 폭을 줄인다.
 */
export function splitReadableParagraphs(text: string | null | undefined): string[] {
  const normalized = text?.replace(/\r\n?/g, "\n").trim();
  if (!normalized) return [];

  const authoredParagraphs = normalized
    .split(/\n\s*\n+/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  if (authoredParagraphs.length > 1 || normalized.length < 360) {
    return authoredParagraphs;
  }

  const sentences = normalized
    .match(/[^.!?。]+(?:[.!?。]+[”’"'」』》]*|$)/g)
    ?.map((sentence) => sentence.trim())
    .filter(Boolean);

  if (!sentences || sentences.length < 4) return authoredParagraphs;

  const totalLength = sentences.reduce((sum, sentence) => sum + sentence.length, 0);
  let leftLength = 0;
  let splitAt = 2;
  let closestDistance = Number.POSITIVE_INFINITY;

  for (let index = 0; index < sentences.length - 2; index += 1) {
    leftLength += sentences[index].length;
    if (index < 1) continue;

    const distance = Math.abs(totalLength / 2 - leftLength);
    if (distance < closestDistance) {
      closestDistance = distance;
      splitAt = index + 1;
    }
  }

  return [sentences.slice(0, splitAt).join(" "), sentences.slice(splitAt).join(" ")];
}

/**
 * 텍스트 내의 특수 문장부호를 파싱하여 스타일을 적용하는 컴포넌트
 * 대형 부호 (『 』, 《 》) → 《 》로 통일 출력
 * 소형 부호 (「 」, 〈 〉, < >, ' ') → ‘ ’로 통일 출력
 * 쌍따옴표 (" ", “ ”) → “ ”로 통일 출력
 * 여닫는 작은따옴표 (‘ ’)도 인용문으로 인식해 같은 강조를 적용
 * 짝을 이룬 em dash·공백으로 분리된 en dash·이중 하이픈 삽입구는 원문 부호로 강조
 * 용어(원어·약칭·풀이)는 이름과 괄호를 서로 다른 굵기로 강조하며 원문 간격을 보존
 * 인용부호와 본문을 한 텍스트 노드로 출력해 검색 로봇의 엔티티 오독을 막는다.
 */
export default function FormattedText({
  text,
  className = "",
  highlightClassName,
  highlightStyle,
  mark,
}: FormattedTextProps) {
  if (!text) return null;

  const parts = splitEmphasis(text);
  const doubleQuoteClass = highlightClassName
    ? `font-semibold ${highlightClassName}`
    : "font-medium text-accent-hover";
  const bookTitleClass = highlightClassName
    ? `font-bold ${highlightClassName}`
    : "text-white font-bold";
  const inlineQuoteClass = highlightClassName
    ? `font-medium ${highlightClassName}`
    : "font-serif text-accent";

  const lines = (value: string, keyPrefix: string) =>
    value.split("\n").map((line, j, arr) => (
      <React.Fragment key={`${keyPrefix}-${j}`}>
        {line}
        {j < arr.length - 1 && <br />}
      </React.Fragment>
    ));

  const partStarts = new Array<number>(parts.length);
  {
    let offset = 0;
    for (let i = 0; i < parts.length; i++) { partStarts[i] = offset; offset += parts[i].text.length; }
  }
  return (
    <span className={className}>
      {parts.map(({ text: part, emphasis, term }, i) => {
        const partStart = partStarts[i];

        let rendered = part;
        let partClass: string | undefined;
        if (term) {
          partClass = term === "name"
            ? `font-semibold ${highlightClassName ?? "text-accent-hover"}`
            : `font-normal ${highlightClassName ?? "text-accent"}`;
        }
        // 쌍따옴표
        else if (
          (part.startsWith('"') && part.endsWith('"')) ||
          (part.startsWith("“") && part.endsWith("”"))
        ) {
          rendered = `“${part.slice(1, -1)}”`;
          partClass = doubleQuoteClass;
        }
        // 대형 그룹: 『 』, 《 》 → 《 》로 출력
        else if (
          (part.startsWith('『') && part.endsWith('』')) ||
          (part.startsWith('《') && part.endsWith('》'))
        ) {
          rendered = `《${part.slice(1, -1)}》`;
          partClass = bookTitleClass;
        }
        // 소형 그룹: 「 」, 〈 〉, < >, ' ' → ‘ ’로 출력
        else if (
          (part.startsWith('「') && part.endsWith('」')) ||
          (part.startsWith('〈') && part.endsWith('〉')) ||
          (part.startsWith('<') && part.endsWith('>')) ||
          (part.startsWith("'") && part.endsWith("'")) ||
          (part.startsWith("‘") && part.endsWith("’"))
        ) {
          rendered = `‘${part.slice(1, -1)}’`;
          partClass = inlineQuoteClass;
        }
        else if (
          emphasis && (
            (part.startsWith("—") && part.endsWith("—")) ||
            (part.startsWith("–") && part.endsWith("–")) ||
            (part.startsWith("--") && part.endsWith("--"))
          )
        ) {
          partClass = inlineQuoteClass;
        }

        const emit = (value: string, marked: boolean, key: string) =>
          value ? (
            marked ? (
              <mark key={key} className="rounded-sm bg-accent/15 text-accent [box-decoration-break:clone]" aria-current="true">{lines(value, key)}</mark>
            ) : (
              // 강조 스타일은 인용 조각에만 얹는다 — 일반 글자에 그라디언트가 깔리면 배경 네모가 된다
              <span key={key} className={partClass} style={partClass && highlightClassName ? highlightStyle : undefined}>{lines(value, key)}</span>
            )
          ) : null;

        const localStart = mark ? Math.max(0, mark.start - partStart) : 0;
        const localEnd = mark ? Math.min(rendered.length, mark.end - partStart) : 0;
        if (!mark || localEnd <= localStart) return emit(rendered, false, `${i}`);
        return (
          <React.Fragment key={i}>
            {emit(rendered.slice(0, localStart), false, `${i}-a`)}
            {emit(rendered.slice(localStart, localEnd), true, `${i}-b`)}
            {emit(rendered.slice(localEnd), false, `${i}-c`)}
          </React.Fragment>
        );
      })}
    </span>
  );
}
