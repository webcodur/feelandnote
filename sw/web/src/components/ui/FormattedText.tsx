import React from "react";

interface FormattedTextProps {
  text: string | null | undefined;
  className?: string;
}

/**
 * 텍스트 내의 특수 문장부호를 파싱하여 스타일을 적용하는 컴포넌트
 * 대형 부호 (『 』, 《 》) → 《 》로 통일 출력
 * 소형 부호 (「 」, 〈 〉, < >, ' ') → ' '로 통일 출력
 * 쌍따옴표 (" ") → 그대로 출력
 */
export default function FormattedText({ text, className = "" }: FormattedTextProps) {
  if (!text) return null;

  const parts = text.split(/(".*?"|'.*?'|『.*?』|《.*?》|「.*?」|〈.*?〉|<.*?>)/g);

  return (
    <span className={className}>
      {parts.map((part, i) => {
        // 쌍따옴표
        if (part.startsWith('"') && part.endsWith('"')) {
          return (
            <span key={i} className="text-accent/80">
              {part}
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
              《{inner}》
            </span>
          );
        }

        // 소형 그룹: 「 」, 〈 〉, < >, ' ' → ' '로 출력
        if (
          (part.startsWith('「') && part.endsWith('」')) ||
          (part.startsWith('〈') && part.endsWith('〉')) ||
          (part.startsWith('<') && part.endsWith('>')) ||
          (part.startsWith("'") && part.endsWith("'"))
        ) {
          const inner = part.slice(1, -1);
          return (
            <span key={i} className="font-serif text-accent">
              '{inner}'
            </span>
          );
        }

        // 일반 텍스트
        return <span key={i}>{part}</span>;
      })}
    </span>
  );
}
