"use client";

interface PageContainerProps {
  children: React.ReactNode;
  className?: string;
}

export default function PageContainer({ children, className = "" }: PageContainerProps) {
  return (
    <div className={`container mx-auto py-4 md:py-8 ${className}`}>
      {children}
    </div>
  );
}
