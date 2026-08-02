import type { CSSProperties, ReactNode } from "react";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { factionThemeHref } from "./utils";
import type { CollectionTheme } from "./types";

interface ThemeActionProps {
  theme: CollectionTheme;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
  /** 카드가 여는 대상 설명 — 접근성 라벨 */
  openLabel: string;
}

/* 카드 전체가 그 테마 전용 페이지로 가는 링크다 — 중간 겹창 없이 직행한다 */
export default function ThemeAction({
  theme,
  className,
  style,
  children,
  openLabel,
}: ThemeActionProps) {
  const baseClassName = cn("group text-start", className);

  if (!theme.tag.is_featured) {
    return (
      <div
        className={cn(baseClassName, "cursor-not-allowed opacity-50")}
        style={style}
        aria-disabled="true"
      >
        {children}
      </div>
    );
  }

  return (
    <div className={baseClassName} style={style}>
      {children}
      <Link
        href={factionThemeHref(theme)}
        className="absolute inset-0 z-10 focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-accent"
        aria-label={`${theme.name}: ${openLabel}`}
      />
    </div>
  );
}
