import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface MetadataFieldProps {
  label: string;
  value: ReactNode;
  compact?: boolean;
  nowrap?: boolean;
  className?: string;
}

export default function MetadataField({
  label,
  value,
  compact = false,
  nowrap = false,
  className,
}: MetadataFieldProps) {
  return (
    <div
      className={cn(
        "grid min-w-0 overflow-hidden rounded-md border border-white/[0.08] bg-white/[0.025]",
        compact
          ? "grid-cols-[4.25rem_minmax(0,1fr)] text-xs"
          : "grid-cols-[4.5rem_minmax(0,1fr)] text-sm",
        className,
      )}
    >
      <span
        className={cn(
          "flex items-center justify-center border-e border-white/[0.08] bg-white/[0.035] px-2 text-center font-medium text-text-secondary",
          compact ? "py-1.5" : "py-2.5",
        )}
      >
        {label}
      </span>
      <span
        className={cn(
          "min-w-0 font-medium text-text-primary",
          compact ? "px-2.5 py-1.5" : "px-3 py-2.5",
          nowrap ? "whitespace-nowrap" : "break-words",
        )}
      >
        {value}
      </span>
    </div>
  );
}
