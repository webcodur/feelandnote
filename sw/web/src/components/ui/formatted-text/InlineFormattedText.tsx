import React from "react";
import { splitEmphasis } from "./emphasis";

export interface FormattedTextProps {
  text: string | null | undefined;
  className?: string;
  highlightClassName?: string;
  highlightStyle?: React.CSSProperties;
  /** 원문 기준 강조 범위 — 겹치는 출력 조각을 <mark>로 감싼다. 모든 부호 변환이 1:1이라 오프셋이 유지된다 */
  mark?: { start: number; end: number } | null;
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
export default function InlineFormattedText({
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
            // 원래 글자색·굵기는 그대로 두고 현재 읽는 구간에만 초록 배경·밑줄을 더한다.
            <span key={key} className={partClass} style={partClass && highlightClassName ? highlightStyle : undefined}>
              {marked && (
                <mark className="rounded-sm bg-reading-active/10 text-inherit underline decoration-reading-active/70 decoration-1 underline-offset-4 [box-decoration-break:clone]" aria-current="true">
                  {lines(value, key)}
                </mark>
              )}
              {!marked && lines(value, key)}
            </span>
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
