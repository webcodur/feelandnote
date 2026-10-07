"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { validate as isUuid } from "uuid";
import { getContentBriefStrict, type ContentBrief } from "@/actions/contents/getContentBrief";
import BookIntroductionSource from "@/components/shared/BookIntroductionSource";
import Modal, { ModalBody } from "@/components/ui/Modal";
import ContentReadingText from "@/components/ui/ContentReadingText";
import { PendingBlock, RetryBlock } from "@/components/ui/pending";
import { normalizeIntroBreaks } from "@/lib/utils/prose-line-breaks";
import type { ContentType } from "@/types/database";

interface ContentIntroModalProps {
  isOpen: boolean;
  onClose: () => void;
  contentId: string;
  contentTitle: string;
  contentType: ContentType;
  bookLocale?: "ko" | "en";
  fallbackDescription?: string | null;
}

export default function ContentIntroModal({ isOpen, onClose, contentId, contentTitle,
  contentType, bookLocale, fallbackDescription }: ContentIntroModalProps) {
  const displayLocale = useLocale();
  const locale = contentType === "BOOK" ? bookLocale ?? displayLocale : displayLocale;
  const t = useTranslations("content.intro");
  const requestKey = JSON.stringify([contentId, locale]);
  const [result, setResult] = useState<{ key: string; brief: ContentBrief | null; failed?: boolean } | null>(null);
  const [attempt, setAttempt] = useState(0);
  const current = result?.key === requestKey ? result : null;
  const brief = current?.brief;
  const registered = isUuid(contentId);
  const loading = isOpen && registered && !current;
  const isBook = contentType === "BOOK";
  // 감상문·큐레이션 설명을 책 소개로 대신 쓰지 않는다.
  const description = isBook ? brief?.description : brief?.description ?? fallbackDescription;
  const text = normalizeIntroBreaks(description ?? "");

  useEffect(() => {
    if (!isOpen || !registered) return;
    let alive = true;
    getContentBriefStrict(contentId, locale)
      .then(brief => { if (alive) setResult({ key: requestKey, brief }); })
      .catch(() => { if (alive) setResult({ key: requestKey, brief: null, failed: true }); });
    return () => { alive = false; };
  }, [isOpen, registered, contentId, locale, requestKey, attempt]);

  return <Modal isOpen={isOpen} onClose={onClose} title={t("title")}
    ariaLabel={contentTitle + " — " + t("title")} stickyHeader widthClassName="max-w-[680px]" frame="plain"
    animateHeight={false} fadeClippedEnd scrollAreaClassName="[overflow-anchor:none]"
    boxClassName="overflow-hidden rounded-panel border border-line-strong bg-bg-card shadow-2xl"
    footer={text && brief?.introductionAttribution ? <div className="flex justify-end border-t border-line px-4 py-1 sm:px-6">
      <BookIntroductionSource attribution={brief.introductionAttribution} className="min-h-11 border-0 bg-transparent px-1" />
    </div> : undefined}>
    <ModalBody className="sm:p-6">
      {text ? <ContentReadingText text={text} size="modal" tone="primary" />
        : loading ? <PendingBlock variant="panel" minHeight="min-h-28" label={t("loading")} />
          : current?.failed ? <RetryBlock message={t("failed")} onRetry={() => { setResult(null); setAttempt(value => value + 1); }} />
            : <p className="text-sm leading-relaxed text-text-secondary">{t("empty")}</p>}
    </ModalBody>
  </Modal>;
}
