interface DecorativeLabel2Props {
  label: string;
  className?: string;
}

/**
 * 좌측 라인 + CINZEL 라벨 형태의 섹션 헤더
 */
export default function DecorativeLabel2({ label, className = "" }: DecorativeLabel2Props) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className="w-10 h-[1px] bg-accent/50" />
      <span className="font-cinzel text-xs text-accent tracking-[0.2em] uppercase">{label}</span>
    </div>
  );
}
