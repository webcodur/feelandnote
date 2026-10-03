"use client";

import { useId, useState, type MouseEvent, type ReactNode } from "react";
import { ChevronLeft, ChevronRight, CornerDownLeft } from "lucide-react";
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

const controlClass = "inline-flex min-h-11 min-w-11 items-center justify-center gap-1 rounded-lg border px-3 text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-accent";
const availableClass = "text-text-secondary hover:border-white/15 hover:bg-white/5 hover:text-text-primary";
const unavailableClass = "cursor-not-allowed text-text-tertiary";

export function Pagination({
  presentation = "default", currentPage, totalPages, onPageChange, getPageHref, isLoading = false,
  pageSize, pageSizeOptions, onPageSizeChange, showPageSizeSelector = false,
}: PaginationProps) {
  const t = useTranslations("shared.ui.pagination");
  const sizeId = useId();
  const [gotoOpen, setGotoOpen] = useState(false);
  const [gotoValue, setGotoValue] = useState("");
  const { current, total, items } = getPaginationRange(currentPage, totalPages);
  const sizes = [...new Set((pageSizeOptions ?? []).filter(size => Number.isInteger(size) && size > 0))];
  const showSize = showPageSizeSelector && pageSize != null && onPageSizeChange && sizes.length > 0;
  const pageLabel = (page: number) => t(page === total ? "lastPage" : "page", { page });

  const submitGoto = () => {
    const target = Number.parseInt(gotoValue, 10);
    if (!isLoading && target >= 1 && target <= total) onPageChange(target);
    setGotoOpen(false);
  };

  // 누르면 번호 입력으로 바뀌는 goto 칸 — 모바일에서는 ‹ › 사이 가운데, 데스크톱에서는 번호열 뒤에 선다
  const gotoControl = gotoOpen ? (
    <div className="flex items-center gap-1">
      <input
        autoFocus
        type="text"
        inputMode="numeric"
        value={gotoValue}
        onChange={event => setGotoValue(event.target.value.replace(/\D/g, ""))}
        onKeyDown={event => {
          if (event.key === "Enter") submitGoto();
          if (event.key === "Escape") setGotoOpen(false);
        }}
        onBlur={() => setTimeout(() => setGotoOpen(false), 150)}
        aria-label={t("goto")}
        placeholder={`${current}`}
        className="h-11 w-14 rounded-lg border border-accent/40 bg-bg-card px-2 text-center text-sm tabular-nums text-text-primary outline-none focus-visible:ring-2 focus-visible:ring-accent"
      />
      <button type="button" onClick={submitGoto} onMouseDown={event => event.preventDefault()}
        aria-label={t("go")} title={t("go")}
        className="flex h-11 w-9 items-center justify-center rounded-lg border border-white/15 bg-white/[0.025] text-text-secondary hover:bg-white/5 hover:text-text-primary">
        <CornerDownLeft size={14} aria-hidden />
      </button>
    </div>
  ) : (
    <button type="button" onClick={() => { setGotoValue(""); setGotoOpen(true); }} disabled={isLoading}
      title={t("goto")}
      className="flex min-h-11 min-w-20 items-center justify-center rounded-lg border border-white/15 bg-white/[0.025] px-3 text-sm tabular-nums text-text-primary hover:border-white/30 hover:bg-white/5 disabled:cursor-not-allowed disabled:text-text-tertiary">
      <span role="status" aria-atomic="true"><span aria-hidden="true">{current} / {total}</span><span className="sr-only">{t("summary", { current, total })}</span></span>
    </button>
  );

  if (total <= 1 && !showSize) return null;

  const control = (page: number, label: string, children: ReactNode, rel?: "prev" | "next", boundary = false) => {
    const active = !rel && page === current;
    const disabled = boundary || isLoading;
    const outline = rel ? disabled ? "border-white/5 bg-white/[0.025]" : "border-white/15 bg-white/[0.025]" : "border-transparent";
    const style = `${controlClass} ${outline} ${active ? "bg-accent/10 font-semibold text-accent hover:bg-accent/20" : disabled ? unavailableClass : availableClass}`;
    const changePage = () => { if (!disabled && page !== current) onPageChange(page); };
    const followPage = (event: MouseEvent<HTMLAnchorElement>) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      changePage();
    };
    if (getPageHref && !boundary) return (
      <Link href={getPageHref(page)} prefetch={false} onClick={followPage} rel={rel}
        aria-label={label} title={rel ? label : undefined} aria-current={active ? "page" : undefined} aria-disabled={isLoading || undefined}
        className={style}>{children}</Link>
    );
    return (
      <button type="button" onClick={changePage} disabled={disabled} aria-label={label} title={rel ? label : undefined}
        aria-current={active ? "page" : undefined} className={style}>{children}</button>
    );
  };

  return (
    <div className={`mx-auto flex w-fit max-w-full flex-col items-center gap-3 ${presentation === "default" ? "rounded-xl border border-white/10 bg-bg-card p-2" : ""}`}>
      {total > 1 && (
        <nav aria-label={t("label")} aria-busy={isLoading}>
          <ul className="flex items-center justify-center gap-1">
            <li>{control(current - 1, t("previous"), <ChevronLeft size={18} aria-hidden />, "prev", current === 1)}</li>
            {items.map(item => (
              <li key={item} className="hidden md:block">
                {typeof item === "number" && control(item, pageLabel(item), item)}
                {typeof item === "string" && <span aria-hidden="true" className="flex min-h-11 w-6 items-center justify-center text-text-secondary">...</span>}
              </li>
            ))}
            <li>{gotoControl}</li>
            <li>{control(current + 1, t("next"), <ChevronRight size={18} aria-hidden />, "next", current === total)}</li>
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
