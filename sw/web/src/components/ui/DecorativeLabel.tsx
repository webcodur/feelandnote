"use client";

interface DecorativeLabelProps {
  label: string;
  className?: string;
}

/**
 * Neo-Pantheon 스타일의 장식용 라벨 컴포넌트
 * 글자 사이 공백 및 양옆 구분선을 포함합니다.
 */
export default function DecorativeLabel({ label, className = "" }: DecorativeLabelProps) {
  // 단어별로 분리, 각 단어 내 글자 사이 공백 추가
  const words = label.split(" ").map((word) => word.split("").join(" "));

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className="h-px w-10 bg-accent/40" />
      <span className="flex items-center gap-4 text-serif text-accent text-xs sm:text-sm tracking-widest font-black whitespace-nowrap">
        {words.map((word, i) => (
          <span key={i}>{word}</span>
        ))}
      </span>
      <div className="h-px w-10 bg-accent/40" />
    </div>
  );
}
