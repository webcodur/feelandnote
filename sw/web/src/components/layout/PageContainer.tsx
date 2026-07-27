"use client";

interface PageContainerProps {
  children: React.ReactNode;
  className?: string;
  wide?: boolean;
}

export default function PageContainer({
  children,
  className = "",
  wide = false,
}: PageContainerProps) {
  return (
    <div className={`${wide ? "w-full max-w-[1400px]" : "container"} mx-auto px-3 md:px-4 py-4 md:py-8 ${className}`}>
      {children}
    </div>
  );
}
