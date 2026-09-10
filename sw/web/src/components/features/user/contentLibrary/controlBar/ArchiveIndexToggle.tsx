"use client";

import { Menu } from "lucide-react";
import { useTranslations } from "next-intl";

import { cn } from "@/lib/utils";

interface ArchiveIndexToggleProps {
  isOpen: boolean;
  onToggle: () => void;
  label?: string;
  className?: string;
}

export default function ArchiveIndexToggle({
  isOpen,
  onToggle,
  label,
  className,
}: ArchiveIndexToggleProps) {
  const t = useTranslations("archiveSearch");
  const resolvedLabel = label ?? t("expandIndexTitle");

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={isOpen}
      aria-label={resolvedLabel}
      title={resolvedLabel}
      className={cn(
        "flex min-h-[2.5rem] shrink-0 items-center justify-center gap-1.5 rounded-lg border border-accent/25 bg-white/5 px-3 text-sm font-semibold text-text-primary hover:border-accent/50 hover:bg-white/10 hover:text-text-primary",
        isOpen && "border-accent/50 bg-accent/10 text-accent",
        className,
      )}
    >
      <Menu size={16} strokeWidth={1.8} aria-hidden />
      <span>{resolvedLabel}</span>
    </button>
  );
}
