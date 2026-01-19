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
  // 글자 사이에 공백 추가 (예: "프로필" -> "프 로 필")
  const spacedLabel = label.split("").join(" ");

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className="h-px w-10 bg-accent/40" />
      <span className="text-serif text-accent text-xs sm:text-sm tracking-widest font-black whitespace-nowrap">
        {spacedLabel}
      </span>
      <div className="h-px w-10 bg-accent/40" />
    </div>
  );
}
