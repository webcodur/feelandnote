import React from "react";

interface FormattedTextProps {
  text: string | null | undefined;
  className?: string;
  highlightClassName?: string;
  highlightStyle?: React.CSSProperties;
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
 * 인용부호와 본문을 한 텍스트 노드로 출력해 검색 로봇의 엔티티 오독을 막는다.
 */
export default function FormattedText({
  text,
  className = "",
  highlightClassName,
  highlightStyle,
}: FormattedTextProps) {
  if (!text) return null;

  const parts = text.split(/(".*?"|“.*?”|(?<!\w)'[^'\n]*'(?!\w)|‘.*?’|『.*?』|《.*?》|「.*?」|〈.*?〉|<.*?>)/g);
  const doubleQuoteClass = highlightClassName
    ? `font-semibold ${highlightClassName}`
    : "font-medium text-accent-hover";
  const bookTitleClass = highlightClassName
    ? `font-bold ${highlightClassName}`
    : "text-white font-bold";
  const inlineQuoteClass = highlightClassName
    ? `font-medium ${highlightClassName}`
    : "font-serif text-accent";

  return (
    <span className={className}>
      {parts.map((part, i) => {
        // 쌍따옴표
        if (
          (part.startsWith('"') && part.endsWith('"')) ||
          (part.startsWith("“") && part.endsWith("”"))
        ) {
          const inner = part.slice(1, -1);
          return (
            <span key={i} className={doubleQuoteClass} style={highlightStyle}>
              {`“${inner}”`}
            </span>
          );
        }

        // 대형 그룹: 『 』, 《 》 → 《 》로 출력
        if (
          (part.startsWith('『') && part.endsWith('』')) ||
          (part.startsWith('《') && part.endsWith('》'))
        ) {
          const inner = part.slice(1, -1);
          return (
            <span key={i} className={bookTitleClass} style={highlightStyle}>
              {`《${inner}》`}
            </span>
          );
        }

        // 소형 그룹: 「 」, 〈 〉, < >, ' ' → ‘ ’로 출력
        if (
          (part.startsWith('「') && part.endsWith('」')) ||
          (part.startsWith('〈') && part.endsWith('〉')) ||
          (part.startsWith('<') && part.endsWith('>')) ||
          (part.startsWith("'") && part.endsWith("'")) ||
          (part.startsWith("‘") && part.endsWith("’"))
        ) {
          const inner = part.slice(1, -1);
          return (
            <span key={i} className={inlineQuoteClass} style={highlightStyle}>
              {`‘${inner}’`}
            </span>
          );
        }

        // 일반 텍스트 (개행 처리)
        return (
          <React.Fragment key={i}>
            {part.split("\n").map((line, j, arr) => (
              <React.Fragment key={j}>
                {line}
                {j < arr.length - 1 && <br />}
              </React.Fragment>
            ))}
          </React.Fragment>
        );
      })}
    </span>
  );
}
