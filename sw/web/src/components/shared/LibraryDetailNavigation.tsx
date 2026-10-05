"use client";

import type { ReactNode } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";

import { Link } from "@/i18n/navigation";
import CreatorNames from "@/components/shared/content/creatorLink/CreatorNames";
import type { TitleBadge } from "@/lib/utils/content-locale";
import LibraryTitleIndexButton, { type LibraryTitleIndexControl } from "./LibraryTitleIndexButton";

export const LIBRARY_DETAIL_FRAME_CLASS = "relative grid w-full min-w-0 grid-cols-[minmax(0,1fr)] overflow-hidden rounded-xl border border-white/20 bg-bg-card md:grid-cols-[48px_minmax(0,1fr)_48px]";

interface ArrowButtonProps {
  direction: "previous" | "next";
  label: string;
  disabled: boolean;
  placement: "desktop" | "header";
  onClick: () => void;
  testPrefix?: string;
}

export function LibraryArrowButton({
  direction,
  label,
  disabled,
  placement,
  onClick,
  testPrefix = "expand",
}: ArrowButtonProps) {
  const Icon = direction === "previous" ? ArrowLeft : ArrowRight;
  const placementClass = placement === "desktop"
    ? direction === "previous"
      ? "z-10 col-start-1 row-span-2 row-start-1 hidden border-e md:flex"
      : "z-10 col-start-3 row-span-2 row-start-1 hidden border-s md:flex"
    : direction === "previous"
      ? "flex w-12 shrink-0 border-e md:hidden"
      : "flex w-12 shrink-0 border-s md:hidden";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      data-testid={`${testPrefix}-${placement}-${direction === "previous" ? "prev" : "next"}`}
      className={`${placementClass} items-center justify-center border-white/10 bg-bg-secondary/55 text-text-secondary hover:bg-accent/[0.08] hover:text-accent active:bg-accent/[0.13] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent/70 disabled:cursor-default disabled:bg-bg-secondary/35 disabled:text-text-tertiary md:bg-bg-secondary/55`}
    >
      <Icon className="h-5 w-5 md:h-6 md:w-6" strokeWidth={1.6} aria-hidden />
    </button>
  );
}

interface HeaderProps {
  title: string;
  titleBadge?: TitleBadge | null;
  creator: string | null;
  previousLabel: string;
  nextLabel: string;
  disabled: boolean;
  onPrevious: () => void;
  onNext: () => void;
  /** 제목 옆에 붙는 작은 조작(안내 아이콘 등). 제목이 길어 잘려도 자리를 지킨다 */
  titleAddon?: ReactNode;
  indexControl?: LibraryTitleIndexControl;
  testPrefix?: string;
}

export function LibraryTitleHeader({
  title,
  titleBadge,
  creator,
  previousLabel,
  nextLabel,
  disabled,
  onPrevious,
  onNext,
  titleAddon,
  indexControl,
  testPrefix = "expand",
}: HeaderProps) {
  return (
    <header data-library-detail-header className={`col-start-1 row-start-1 flex h-[64px] min-h-[64px] items-stretch border-b border-white/[0.08] bg-bg-secondary/80 text-center md:col-start-2 md:flex md:flex-col md:justify-center ${indexControl ? "md:py-0" : "md:px-3 md:py-2"}`}>
      <LibraryArrowButton
        direction="previous"
        label={previousLabel}
        disabled={disabled}
        placement="header"
        testPrefix={testPrefix}
        onClick={onPrevious}
      />
      <div className={`min-w-0 flex-1 self-stretch md:w-full ${indexControl ? "" : "px-1 md:px-0"}`}>
        <div className="group/title relative flex h-full min-w-0 flex-col justify-center text-center">
          {indexControl && <LibraryTitleIndexButton title={title} control={indexControl} testPrefix={testPrefix} />}
          <div className={`flex min-w-0 items-center justify-center gap-1 ${indexControl ? "pointer-events-none relative px-8" : ""}`}>
            <h3
              data-testid={`${testPrefix}-selected-title`}
              className={`min-w-0 truncate font-sans text-[15px] font-bold sm:text-[17px] md:text-[19px] ${indexControl ? "w-full group-hover/title:text-accent" : ""} ${titleBadge ? "text-text-tertiary line-through decoration-text-tertiary/70" : "text-white"}`}
              title={title}
              aria-live="polite"
            >
              {title}
            </h3>
            {titleAddon && <span className="pointer-events-auto">{titleAddon}</span>}
          </div>
          {creator && (
            <p className={`truncate text-[15px] text-text-secondary ${indexControl ? "pointer-events-none relative px-8 leading-5 [&_button]:pointer-events-auto" : ""}`}>
              <CreatorNames text={creator} />
            </p>
          )}
        </div>
      </div>
      <LibraryArrowButton
        direction="next"
        label={nextLabel}
        disabled={disabled}
        placement="header"
        testPrefix={testPrefix}
        onClick={onNext}
      />
    </header>
  );
}

interface BottomNavigationProps {
  label: string;
  previousLabel: string;
  nextLabel: string;
  /** 가운데 칸 — 지금 보는 작품의 상세 페이지로 가는 링크. 없으면 이동 단추만 둔다 */
  detailHref?: string;
  detailLabel?: string;
  disabled: boolean;
  onPrevious: () => void;
  onNext: () => void;
  /** 긴 본문을 다 읽은 자리에서 넘기는 화면은 넓은 화면에도 이동 단추를 둔다 */
  showOnDesktop?: boolean;
  testPrefix?: string;
}

/* 좁은 화면에서 이전·다음으로 이동한다. 상세 링크를 쓰는 화면과 showOnDesktop을 켠 화면은 넓은 화면에도 둔다. */
export function LibraryBottomNavigation({
  label,
  previousLabel,
  nextLabel,
  detailHref,
  detailLabel,
  disabled,
  onPrevious,
  onNext,
  showOnDesktop = false,
  testPrefix = "expand",
}: BottomNavigationProps) {
  const desktopVisible = showOnDesktop || (detailHref && detailLabel);
  return (
    <nav
      aria-label={label}
      data-testid={`${testPrefix}-bottom-navigation`}
      className={`flex items-stretch justify-center border-t border-white/10 bg-bg-secondary/55 ${desktopVisible ? "" : "md:hidden"}`}
    >
      <button
        type="button"
        onClick={onPrevious}
        data-testid={`${testPrefix}-bottom-prev`}
        disabled={disabled}
        aria-label={previousLabel}
        title={previousLabel}
        className={`flex min-h-[44px] flex-1 items-center justify-center border-e border-white/10 text-sm font-medium text-text-secondary hover:bg-white/[0.05] hover:text-accent active:bg-white/[0.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent/70 disabled:cursor-default disabled:text-text-tertiary ${desktopVisible ? "" : "md:hidden"}`}
      >
        <ArrowLeft className="h-4 w-4 shrink-0" strokeWidth={1.7} aria-hidden />
      </button>
      {detailHref && detailLabel ? (
        <Link
          href={detailHref}
          data-testid={`${testPrefix}-bottom-detail`}
          className="flex min-h-[44px] flex-1 items-center justify-center px-3 text-center text-sm font-medium text-accent hover:bg-accent/[0.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent/70 md:flex-none md:px-10"
        >
          <span className="truncate">{detailLabel}</span>
        </Link>
      ) : null}
      <button
        type="button"
        onClick={onNext}
        data-testid={`${testPrefix}-bottom-next`}
        disabled={disabled}
        aria-label={nextLabel}
        title={nextLabel}
        className={`flex min-h-[44px] flex-1 items-center justify-center text-sm font-medium text-text-secondary hover:bg-white/[0.05] hover:text-accent active:bg-white/[0.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent/70 disabled:cursor-default disabled:text-text-tertiary ${desktopVisible ? "" : "md:hidden"} ${detailHref && detailLabel ? "border-s border-white/10" : ""}`}
      >
        <ArrowRight className="h-4 w-4 shrink-0" strokeWidth={1.7} aria-hidden />
      </button>
    </nav>
  );
}
