/*
  파일명: /components/ui/ContentGrid.tsx
  기능: 콘텐츠 그리드 컴포넌트
  책임: 반응형 그리드 레이아웃을 제공한다.
*/ // ------------------------------

interface ContentGridProps {
  children: React.ReactNode;
  minWidth?: number;
  gap?: number;
  className?: string;
  compact?: boolean;
}

export default function ContentGrid({
  children,
  minWidth,
  gap,
  className = "",
  compact = false,
}: ContentGridProps) {
  const actualMinWidth = minWidth ?? (compact ? 100 : 130);
  const actualGap = gap ?? (compact ? 3 : 4);

  return (
    <div
      className={`grid ${className}`}
      style={{
        gridTemplateColumns: `repeat(auto-fill, minmax(${actualMinWidth}px, 1fr))`,
        gap: `${actualGap * 4}px`,
      }}
    >
      {children}
    </div>
  );
}
