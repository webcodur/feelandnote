"use client";

import { ArrowLeft, ArrowRight } from "lucide-react";

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
      : "z-10 col-start-4 row-span-2 row-start-1 hidden border-s md:flex"
    : direction === "previous"
      ? "flex border-e md:hidden"
      : "flex border-s md:hidden";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className={`${placementClass} items-center justify-center border-white/10 bg-bg-secondary/55 text-text-secondary hover:bg-accent/[0.08] hover:text-accent active:bg-accent/[0.13] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent/70 disabled:cursor-default disabled:bg-bg-secondary/35 disabled:text-text-tertiary md:bg-bg-secondary/55`}
    >
      <Icon className="h-5 w-5 md:h-6 md:w-6" strokeWidth={1.6} aria-hidden />
    </button>
  );
}

interface HeaderProps {
  title: string;
  creator: string | null;
  previousLabel: string;
  nextLabel: string;
  disabled: boolean;
  onPrevious: () => void;
  onNext: () => void;
}

export function ExpandTitleHeader({
  title,
  creator,
  previousLabel,
  nextLabel,
  disabled,
  onPrevious,
  onNext,
}: HeaderProps) {
  return (
    <header className="col-start-2 row-start-1 grid h-[64px] min-h-[64px] grid-cols-[40px_minmax(0,1fr)_40px] items-stretch border-b border-white/[0.08] bg-bg-secondary/80 text-center md:col-start-3 md:flex md:flex-col md:justify-center md:px-3 md:py-2">
      <ExpandArrowButton
        direction="previous"
        label={previousLabel}
        disabled={disabled}
        placement="header"
        onClick={onPrevious}
      />
      <div className="min-w-0 self-center px-1 md:w-full md:px-0">
        <h3
          data-testid="expand-selected-title"
          className="truncate font-sans text-sm font-bold text-text-primary sm:text-base md:text-lg"
          title={title}
          aria-live="polite"
        >
          {title}
        </h3>
        {creator && <p className="truncate text-sm text-text-secondary">{creator}</p>}
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
