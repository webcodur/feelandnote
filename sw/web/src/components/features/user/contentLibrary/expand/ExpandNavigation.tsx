"use client";

import type { ReactNode } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";

import CreatorNames from "@/components/shared/content/creatorLink/CreatorNames";
import type { TitleBadge } from "@/lib/utils/content-locale";

interface ArrowButtonProps {
  direction: "previous" | "next";
  label: string;
  disabled: boolean;
  placement: "desktop" | "header";
  onClick: () => void;
}

export function ExpandArrowButton({
  direction,
  label,
  disabled,
  placement,
  onClick,
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
      data-testid={`expand-${placement}-${direction === "previous" ? "prev" : "next"}`}
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
}

export function ExpandTitleHeader({
  title,
  titleBadge,
  creator,
  previousLabel,
  nextLabel,
  disabled,
  onPrevious,
  onNext,
  titleAddon,
}: HeaderProps) {
  return (
    <header className="col-start-1 row-start-1 flex h-[64px] min-h-[64px] items-stretch border-b border-white/[0.08] bg-bg-secondary/80 text-center md:col-start-2 md:flex md:flex-col md:justify-center md:px-3 md:py-2">
      <ExpandArrowButton
        direction="previous"
        label={previousLabel}
        disabled={disabled}
        placement="header"
        onClick={onPrevious}
      />
      <div className="min-w-0 flex-1 self-stretch px-1 md:w-full md:px-0">
        <div className="flex h-full min-w-0 flex-col justify-center text-center">
          <div className="flex min-w-0 items-center justify-center gap-1">
            <h3
              data-testid="expand-selected-title"
              className={`min-w-0 truncate font-sans text-sm font-bold sm:text-base md:text-lg ${titleBadge ? "text-text-tertiary line-through decoration-text-tertiary/70" : "text-text-primary"}`}
              title={title}
              aria-live="polite"
            >
              {title}
            </h3>
            {titleAddon}
          </div>
          {creator && (
            <p className="truncate text-sm text-text-secondary">
              <CreatorNames text={creator} />
            </p>
          )}
        </div>
      </div>
      <ExpandArrowButton
        direction="next"
        label={nextLabel}
        disabled={disabled}
        placement="header"
        onClick={onNext}
      />
    </header>
  );
}

interface BottomNavigationProps {
  label: string;
  previousLabel: string;
  nextLabel: string;
  disabled: boolean;
  onPrevious: () => void;
  onNext: () => void;
}

export function ExpandBottomNavigation({
  label,
  previousLabel,
  nextLabel,
  disabled,
  onPrevious,
  onNext,
}: BottomNavigationProps) {
  return (
    <nav
      aria-label={label}
      data-testid="expand-bottom-navigation"
      className="grid grid-cols-2 border-t border-white/10 bg-bg-secondary/55 md:hidden"
    >
      <button
        type="button"
        onClick={onPrevious}
        data-testid="expand-bottom-prev"
        disabled={disabled}
        className="flex min-h-[48px] items-center justify-center gap-2 border-e border-white/10 text-sm font-medium text-text-secondary hover:bg-white/[0.05] hover:text-accent active:bg-white/[0.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent/70 disabled:cursor-default disabled:text-text-tertiary"
      >
        <ArrowLeft className="h-4 w-4" strokeWidth={1.7} aria-hidden />
        <span>{previousLabel}</span>
      </button>
      <button
        type="button"
        onClick={onNext}
        data-testid="expand-bottom-next"
        disabled={disabled}
        className="flex min-h-[48px] items-center justify-center gap-2 text-sm font-medium text-text-secondary hover:bg-white/[0.05] hover:text-accent active:bg-white/[0.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent/70 disabled:cursor-default disabled:text-text-tertiary"
      >
        <span>{nextLabel}</span>
        <ArrowRight className="h-4 w-4" strokeWidth={1.7} aria-hidden />
      </button>
    </nav>
  );
}
