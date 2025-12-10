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
  const actualMinWidth = minWidth ?? (compact ? 160 : 220);
  const actualGap = gap ?? (compact ? 4 : 6);

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
