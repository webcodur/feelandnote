"use client";

import { useId, type MouseEvent, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { getPaginationRange } from "./paginationRange";

interface PaginationProps {
  presentation?: "default" | "quiet";
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  /** Locale-relative URL. Ordinary clicks use onPageChange; modified clicks follow the link. */
  getPageHref?: (page: number) => string;
  isLoading?: boolean;
  pageSize?: number;
  pageSizeOptions?: number[];
  onPageSizeChange?: (size: number) => void;
  showPageSizeSelector?: boolean;
}

const controlClass = "inline-flex min-h-11 min-w-11 items-center justify-center gap-1 rounded-lg border border-transparent px-3 text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-accent";
const availableClass = "text-text-secondary hover:border-white/15 hover:bg-white/5 hover:text-text-primary";
const unavailableClass = "cursor-not-allowed text-text-tertiary";

export function Pagination({
  presentation = "default", currentPage, totalPages, onPageChange, getPageHref, isLoading = false,
  pageSize, pageSizeOptions, onPageSizeChange, showPageSizeSelector = false,
}: PaginationProps) {
  const t = useTranslations("shared.ui.pagination");
  const sizeId = useId();
  const { current, total, items } = getPaginationRange(currentPage, totalPages);
  const sizes = [...new Set((pageSizeOptions ?? []).filter(size => Number.isInteger(size) && size > 0))];
  const showSize = showPageSizeSelector && pageSize != null && onPageSizeChange && sizes.length > 0;
  const pageLabel = (page: number) => t(page === total ? "lastPage" : "page", { page });

  if (total <= 1 && !showSize) return null;

  const control = (page: number, label: string, children: ReactNode, rel?: "prev" | "next", boundary = false) => {
    const active = !rel && page === current;
    const disabled = boundary || isLoading;
    const style = `${controlClass} ${active ? "bg-accent/10 font-semibold text-accent hover:bg-accent/20" : disabled ? unavailableClass : availableClass}`;
    const changePage = () => { if (!disabled && page !== current) onPageChange(page); };
    const followPage = (event: MouseEvent<HTMLAnchorElement>) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      changePage();
    };
    if (getPageHref && !boundary) return (
      <Link href={getPageHref(page)} prefetch={false} onClick={followPage} rel={rel}
        aria-label={label} aria-current={active ? "page" : undefined} aria-disabled={isLoading || undefined}
        className={style}>{children}</Link>
    );
    return (
      <button type="button" onClick={changePage} disabled={disabled} aria-label={label}
        aria-current={active ? "page" : undefined} className={style}>{children}</button>
    );
  };

  return (
    <div className={`mx-auto flex w-fit max-w-full flex-col items-center gap-3 ${presentation === "default" ? "rounded-xl border border-white/10 bg-bg-card p-2" : ""}`}>
      {total > 1 && (
        <nav aria-label={t("label")} aria-busy={isLoading}>
          <ul className="flex items-center justify-center gap-1">
            <li>{control(current - 1, t("previous"), <><ChevronLeft size={16} aria-hidden /><span>{t("previous")}</span></>, "prev", current === 1)}</li>
            <li className="min-w-20 px-2 text-center text-sm tabular-nums text-text-primary md:hidden">
              <span role="status" aria-atomic="true"><span aria-hidden="true">{current} / {total}</span><span className="sr-only">{t("summary", { current, total })}</span></span>
            </li>
            {items.map(item => (
              <li key={item} className="hidden md:block">
                {typeof item === "number" && control(item, pageLabel(item), item)}
                {typeof item === "string" && <span aria-hidden="true" className="flex min-h-11 w-6 items-center justify-center text-text-secondary">...</span>}
              </li>
            ))}
            <li>{control(current + 1, t("next"), <><span>{t("next")}</span><ChevronRight size={16} aria-hidden /></>, "next", current === total)}</li>
          </ul>
        </nav>
      )}
      {showSize && (
        <div className="flex items-center gap-2 text-sm text-text-secondary">
          <label htmlFor={sizeId}>{t("pageSize")}</label>
          <select id={sizeId} value={pageSize} disabled={isLoading} onChange={event => onPageSizeChange?.(Number(event.target.value))}
            className="min-h-11 min-w-20 rounded-lg border border-white/15 bg-bg-card px-3 text-sm text-text-primary hover:border-white/30 outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-not-allowed">
            {!sizes.includes(pageSize!) && <option value={pageSize}>{pageSize}</option>}
            {sizes.map(size => <option key={size} value={size}>{size}</option>)}
          </select>
        </div>
      )}
    </div>
  );
}
