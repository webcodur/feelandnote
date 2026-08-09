import React from "react";

interface FormattedTextProps {
  text: string | null | undefined;
  className?: string;
}

/**
 * 텍스트 내의 특수 문장부호를 파싱하여 스타일을 적용하는 컴포넌트
 * 대형 부호 (『 』, 《 》) → 《 》로 통일 출력
 * 소형 부호 (「 」, 〈 〉, < >, ' ') → ‘ ’로 통일 출력
 * 쌍따옴표 (" ") → “ ”로 통일 출력
 * 인용부호와 본문을 한 텍스트 노드로 출력해 검색 로봇의 엔티티 오독을 막는다.
 */
export default function FormattedText({ text, className = "" }: FormattedTextProps) {
  if (!text) return null;

  const parts = text.split(/(".*?"|(?<!\w)'[^'\n]*'(?!\w)|『.*?』|《.*?》|「.*?」|〈.*?〉|<.*?>)/g);

  return (
    <span className={className}>
      {parts.map((part, i) => {
        // 쌍따옴표
        if (part.startsWith('"') && part.endsWith('"')) {
          const inner = part.slice(1, -1);
          return (
            <span key={i} className="text-accent/80">
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
            <span key={i} className="text-white font-bold">
              {`《${inner}》`}
            </span>
          );
        }

        // 소형 그룹: 「 」, 〈 〉, < >, ' ' → ‘ ’로 출력
        if (
          (part.startsWith('「') && part.endsWith('」')) ||
          (part.startsWith('〈') && part.endsWith('〉')) ||
          (part.startsWith('<') && part.endsWith('>')) ||
          (part.startsWith("'") && part.endsWith("'"))
        ) {
          const inner = part.slice(1, -1);
          return (
            <span key={i} className="font-serif text-accent">
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
