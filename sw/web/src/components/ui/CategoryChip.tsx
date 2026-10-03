"use client";

import type { CSSProperties, MouseEventHandler, ReactNode } from "react";
import { Link } from "@/i18n/navigation";
import { getCategoryByDbType } from "@/constants/categories";
import { CONTENT_TYPE_COLORS } from "@/constants/categoryColors";
import { EXPLORE_NAV_LAYOUT as layout, selectionChipTone } from "@/components/shared/exploreNavLayout";
import { cn } from "@/lib/utils";

/** 랭킹 선택기와 같은 각진 칩. media에는 매체 ID(book 또는 BOOK)를 넘긴다. */
export default function CategoryChip({ selected, media, children, href, onClick, disabled, className, scroll = false, role, ariaLabel }: {
  selected: boolean;
  media?: string;
  children: ReactNode;
  href?: string;
  onClick?: MouseEventHandler<HTMLAnchorElement | HTMLButtonElement>;
  disabled?: boolean;
  className?: string;
  scroll?: boolean;
  role?: "radio";
  ariaLabel?: string;
}) {
  const category = media ? getCategoryByDbType(media.toUpperCase()) : undefined;
  const color = category ? CONTENT_TYPE_COLORS[category.dbType as keyof typeof CONTENT_TYPE_COLORS] : undefined;
  const Icon = category?.lucideIcon;
  const style = color ? { "--chip-c": color } as CSSProperties : undefined;
  const classes = cn(layout.chip, layout.square, selectionChipTone(selected, Boolean(color)),
    "cursor-pointer disabled:cursor-not-allowed disabled:opacity-40", className);
  const content = <>{Icon && <Icon size={13} aria-hidden />}{children}</>;

  return href && !disabled ? (
    <Link href={href} prefetch={false} scroll={scroll} onClick={onClick} aria-current={selected ? "page" : undefined}
      className={classes} style={style}>{content}</Link>
  ) : (
    <button type="button" disabled={disabled} onClick={onClick} role={role} aria-label={ariaLabel}
      aria-pressed={role ? undefined : selected} aria-checked={role === "radio" ? selected : undefined}
      className={classes} style={style}>{content}</button>
  );
}
