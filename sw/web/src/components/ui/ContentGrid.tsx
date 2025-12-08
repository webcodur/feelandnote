interface ContentGridProps {
  children: React.ReactNode;
  minWidth?: number;
  gap?: number;
  className?: string;
}

export default function ContentGrid({
  children,
  minWidth = 160,
  gap = 5,
  className = "",
}: ContentGridProps) {
  return (
    <div
      className={`grid gap-${gap} ${className}`}
      style={{
        gridTemplateColumns: `repeat(auto-fill, minmax(${minWidth}px, 1fr))`,
        gap: `${gap * 4}px`,
      }}
    >
      {children}
    </div>
  );
}
