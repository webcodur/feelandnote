"use client";

import { forwardRef, type ButtonHTMLAttributes } from "react";
import { BookOpenText, Check } from "lucide-react";
import ContentCover from "@/components/ui/ContentCover";
import { getCategoryByDbType } from "@/constants/categories";
import { cn } from "@/lib/utils";

interface Props extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  selected: boolean;
  title: string;
  creator?: string | null;
  metadata?: string;
  unavailable?: boolean;
  thumbnailUrl?: string | null;
  contentType?: string;
  number?: number;
}

/** 리뷰·책장·판본 목록의 동일한 선택 행. 제목과 서지는 두 줄 안에 담는다. */
const LibraryIndexItem = forwardRef<HTMLButtonElement, Props>(function LibraryIndexItem({
  selected, title, creator, metadata, unavailable, thumbnailUrl, contentType = "BOOK", number, className, ...props
}, ref) {
  const detail = [creator, metadata].filter(Boolean).join(" · ");
  const CoverIcon = getCategoryByDbType(contentType)?.lucideIcon ?? BookOpenText;
  return (
    <button {...props} ref={ref} type="button" title={[title, detail].filter(Boolean).join(" — ")}
      aria-current={selected ? "true" : undefined} aria-pressed={selected}
      data-library-index-item data-library-index-selected={selected || undefined}
      className={cn("group/index-item flex min-h-11 w-full items-center gap-3 border-b border-white/[0.08] px-3 py-2 text-start outline-none last:border-b-0 hover:bg-white/[0.06] hover:text-text-primary focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent",
        selected ? "bg-accent/10 text-accent shadow-[inset_2px_0_var(--color-accent)]" : "text-text-secondary", className)}>
      {number !== undefined && <span data-library-index-number aria-hidden className="w-6 shrink-0 text-end text-xs font-medium tabular-nums text-text-secondary">{number}.</span>}
      <span data-library-index-cover aria-hidden className="relative flex h-12 w-8 shrink-0 items-center justify-center overflow-hidden rounded-sm border border-white/10 bg-white/5">
        <ContentCover src={thumbnailUrl} alt="" sizes="32px" className="object-contain"
          fallback={<CoverIcon size={16} className="text-text-tertiary" />} />
      </span>
      <span className="min-w-0 flex-1">
        <span className={cn("block truncate text-[15px] font-semibold leading-[22px] text-text-primary group-hover/index-item:text-white", selected && "text-accent",
          unavailable && "text-text-tertiary line-through decoration-text-tertiary/70")}>{title}</span>
        {detail && <span className="block truncate text-[13px] leading-[19px] text-text-secondary">{detail}</span>}
      </span>
      <span className="flex w-4 shrink-0 justify-center text-accent" aria-hidden>
        {selected && <Check size={15} strokeWidth={2.5} />}
      </span>
    </button>
  );
});

export default LibraryIndexItem;
