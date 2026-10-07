"use client";

import type { ReactNode } from "react";
import ContentReadingText from "@/components/ui/ContentReadingText";
import { PendingBlock, RetryBlock } from "@/components/ui/pending";
import { normalizeIntroBreaks } from "@/lib/utils/prose-line-breaks";

export default function ContentDescription({ title, description, source, status = "ready", loadingLabel, emptyLabel, failedLabel, onRetry }: {
  title: string;
  description?: string | null;
  source?: ReactNode;
  status?: "loading" | "ready" | "failed";
  loadingLabel?: string;
  emptyLabel: string;
  failedLabel?: string;
  onRetry?: () => void;
}) {
  const text = normalizeIntroBreaks(description ?? "");
  return <section aria-label={title} className="mt-5 border-t border-line pt-5 md:mt-6 md:pt-6">
    <div className="mb-3 flex items-center justify-between gap-3">
      <h3 className="text-sm font-semibold text-text-primary">{title}</h3>
      {text && source}
    </div>
    {text ? <ContentReadingText text={text} size="modal" tone="secondary" />
      : status === "loading" ? <PendingBlock variant="panel" minHeight="min-h-28" label={loadingLabel} />
        : status === "failed" ? <RetryBlock message={failedLabel} onRetry={onRetry} />
          : <p className="text-sm leading-relaxed text-text-secondary">{emptyLabel}</p>}
  </section>;
}
