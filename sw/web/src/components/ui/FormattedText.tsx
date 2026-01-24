import React from "react";

interface FormattedTextProps {
  text: string | null | undefined;
  className?: string;
}

/**
 * 텍스트 내의 특수 문장부호를 파싱하여 스타일을 적용하는 컴포넌트
 * 지원 부호: " ", ' ', 『 』, 《 》, 「 」, 〈 〉
 */
export default function FormattedText({ text, className = "" }: FormattedTextProps) {
  if (!text) return null;

  // 정규식 분리 (순서 중요하지 않음, split은 매칭된 순서대로 분리)
  // 매칭 그룹을 포함하여 split하면 구분자도 결과 배열에 포함됨
  const parts = text.split(/(".*?"|'.*?'|『.*?』|《.*?》|「.*?」|〈.*?〉)/g);

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
        // 홑따옴표 (강조, 금색 명조)
        if (part.startsWith("'") && part.endsWith("'")) {
          return (
            <span key={i} className="font-serif text-accent mx-0.5">
              {part}
            </span>
          );
        }
        // 겹낫표 (책 제목 등, 굵은 흰색)
        if (part.startsWith('『') && part.endsWith('』')) {
          return (
            <span key={i} className="text-white font-bold">
              {part}
            </span>
          );
        }
        // 겹화살괄호 (작품명 등, 명조 흰색)
        if (part.startsWith('《') && part.endsWith('》')) {
          return (
            <span key={i} className="font-serif text-text-primary">
              {part}
            </span>
          );
        }
        // 홑낫표 (소제목 등, 중간 굵기 흰색)
        if (part.startsWith('「') && part.endsWith('」')) {
          return (
            <span key={i} className="text-white/90 font-medium">
              {part}
            </span>
          );
        }
        // 홑화살괄호 (보조 인용, 명조 회색 이탤릭)
        if (part.startsWith('〈') && part.endsWith('〈')) { // Typo fix: endsWith should be 〉 but I need to be careful with copy paste
           // Wait, I should check the character closing bracket for 〈. It is 〉.
           // Let's verify the character code or visual.
           // Standard Korean Keyboard: 〈 〉
           return (
            <span key={i} className="font-serif text-text-secondary italic">
              {part}
            </span>
          );
        }
        // Double check end char for < >
        if (part.startsWith('〈') && part.endsWith('〉')) {  
           return (
            <span key={i} className="font-serif text-text-secondary italic">
              {part}
            </span>
          );
        }
        
        // 일반 텍스트
        return <span key={i}>{part}</span>;
      })}
    </span>
  );
}
