"use client";

import { Menu, type LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { cn } from "@/lib/utils";

interface ArchiveIndexToggleProps {
  isOpen: boolean;
  onToggle: () => void;
  label?: string;
  className?: string;
  /** 목록 아이콘 대신 쓸 아이콘. 같은 줄에 같은 모양의 단추를 여럿 둘 때 구분한다 */
  icon?: LucideIcon;
}

export default function ArchiveIndexToggle({
  isOpen,
  onToggle,
  label,
  className,
  icon: Icon = Menu,
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
      <Icon size={16} strokeWidth={1.8} aria-hidden />
      <span className="truncate">{resolvedLabel}</span>
    </button>
  );
}
