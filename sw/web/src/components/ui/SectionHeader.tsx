/*
  파일명: /components/ui/SectionHeader.tsx
  기능: 섹션 헤더 컴포넌트
  책임: 제목, 설명, 아이콘, 링크를 포함한 섹션 헤더를 표시한다.
*/ // ------------------------------

import Link from "next/link";

interface SectionHeaderProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  linkText?: string;
  linkHref?: string;
  className?: string;
  variant?: "default" | "hero";
  englishTitle?: string;
}

export default function SectionHeader({
  title,
  description,
  icon,
  action,
  linkText,
  linkHref,
  className = "",
  variant = "default",
  englishTitle,
}: SectionHeaderProps) {
  if (variant === "hero") {
    return (
      <div className={`flex flex-col items-center text-center md:flex-row md:items-end md:justify-between md:text-left mb-0 border-b border-accent-dim/10 pb-6 md:pb-4 ${className}`}>
        <div className={`flex flex-col gap-1 md:gap-2 ${linkHref ? "mb-4 md:mb-0" : ""}`}>
          {englishTitle && (
            <span className="font-cinzel text-[8px] md:text-[10px] text-accent tracking-[0.4em] md:tracking-[0.6em] uppercase">
              {englishTitle}
            </span>
          )}
          <h2 className="font-serif font-black text-xl md:text-4xl tracking-tighter text-text-primary">
            {title}
          </h2>
          {description && (
            <p className="text-[10px] md:text-sm text-text-tertiary max-w-[280px] md:max-w-none">{description}</p>
          )}
        </div>
        {linkHref && (
          <Link
            href={linkHref}
            className="flex items-center gap-1 md:gap-2 px-3 md:px-4 py-1.5 md:py-2 bg-accent/10 hover:bg-accent/20 text-accent rounded-lg text-xs md:text-sm font-medium font-sans group whitespace-nowrap"
          >
            {linkText ?? "더보기"}
            <span className="group-hover:translate-x-1 transition-transform">→</span>
          </Link>
        )}
      </div>
    );
  }

  return (
    <div className={`flex flex-col gap-2 sm:flex-row sm:justify-between sm:items-center ${className}`}>
      <div>
        <h1 className="text-lg md:text-xl flex items-center gap-1.5">
          {icon && <span className="text-accent">{icon}</span>}
          {title}
        </h1>
        {description && (
          <p className="text-text-secondary text-xs md:text-sm mt-0.5">{description}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
      {!action && linkText && linkHref && (
        <Link
          href={linkHref}
          className="text-accent text-sm font-semibold hover:underline shrink-0"
        >
          {linkText}
        </Link>
      )}
    </div>
  );
}
