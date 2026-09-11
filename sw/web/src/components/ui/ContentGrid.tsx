/*
  파일명: /components/ui/ContentGrid.tsx
  기능: 콘텐츠 그리드 컴포넌트
  책임: 반응형 그리드 레이아웃을 제공한다.
*/ // ------------------------------

// #region Variant 설정
const VARIANT_CONFIG = {
  poster: { minWidth: 150, gap: 12 },
  list: { minWidth: 340, gap: 16 },
  wide: { minWidth: 150, gap: 12 },
} as const;

type Variant = keyof typeof VARIANT_CONFIG;
// #endregion

interface ContentGridProps {
  children: React.ReactNode;
  variant?: Variant;
  minWidth?: number;
  gap?: number;
  className?: string;
  compact?: boolean;
}

export default function ContentGrid({
  children,
  variant = "poster",
  minWidth,
  gap,
  className = "",
  compact = false,
}: ContentGridProps) {
  const config = VARIANT_CONFIG[variant];
  const actualMinWidth = minWidth ?? (compact ? 100 : config.minWidth);
  const actualGap = gap ?? (compact ? 12 : config.gap);

  // list/wide: 모바일에서 세로 정렬, md부터 그리드
  const isMobileStack = variant === "list";

  const gridStyle = {
    gridTemplateColumns: `repeat(auto-fill, minmax(${actualMinWidth}px, 1fr))`,
    gap: `${actualGap}px`,
  };

  if (isMobileStack) {
    return (
      <div
        className={`flex flex-col items-center gap-3 md:grid md:justify-center ${className}`}
        style={gridStyle}
      >
        {children}
      </div>
    );
  }

  return (
    <div className={`grid ${className}`} style={gridStyle}>
      {children}
    </div>
  );
}
