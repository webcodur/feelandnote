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
  /**
   * 좁은 화면에서 세로로 쌓는 대신 한 장씩 옆으로 넘기게 한다(variant="list" 전용).
   * 넓은 화면에서는 그대로 격자다.
   */
  mobileCarousel?: boolean;
}

export default function ContentGrid({
  children,
  variant = "poster",
  minWidth,
  gap,
  className = "",
  compact = false,
  mobileCarousel = false,
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
        className={`flex gap-3 md:grid md:justify-center ${
          mobileCarousel
            ? // 한 장씩 옆으로 넘긴다. md부터는 스냅과 가로 스크롤이 풀려 격자로 돌아간다
              "snap-x snap-mandatory overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&>*]:w-full [&>*]:shrink-0 [&>*]:snap-start md:overflow-visible md:[&>*]:w-auto"
            : "flex-col items-center"
        } ${className}`}
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
