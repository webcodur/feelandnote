"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { validate as isUuid } from "uuid";
import { getContentBriefStrict, type ContentBrief } from "@/actions/contents/getContentBrief";
import BookIntroductionSource from "@/components/shared/BookIntroductionSource";
import ContentInfoDialog from "@/components/shared/content/ContentInfoDialog";
import ContentDescription from "@/components/shared/content/ContentDescription";
import type { ContentType } from "@/types/database";
import type { ContentMetadata } from "@/types/content";

interface ContentIntroModalProps {
  isOpen: boolean;
  onClose: () => void;
  contentId: string;
  contentTitle: string;
  contentCreator?: string | null;
  contentType: ContentType;
  contentThumbnail?: string | null;
  bookLocale?: "ko" | "en";
  purchaseEnabled?: boolean;
  fallbackDescription?: string | null;
  fallbackMetadata?: ContentMetadata | null;
  detailHref?: string;
}

export default function ContentIntroModal({ isOpen, onClose, contentId, contentTitle, contentCreator,
  contentType, contentThumbnail, bookLocale, purchaseEnabled = true, fallbackDescription, fallbackMetadata, detailHref }: ContentIntroModalProps) {
  const displayLocale = useLocale();
  const locale = contentType === "BOOK" ? bookLocale ?? displayLocale : displayLocale;
  const t = useTranslations("content.intro");
  const tMetadata = useTranslations("shared.content");
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
  const metadata = isBook && registered ? brief?.metadata : brief?.metadata ?? fallbackMetadata;
  const genre = metadata?.genres?.join(" · ") || metadata?.genre;
  const facts = [
    isBook && metadata?.publisher ? { label: tMetadata("publisher"), value: metadata.publisher } : null,
    (brief?.releaseDate ?? metadata?.publishDate) ? { label: isBook ? tMetadata("publishDate") : t("releasedLabel"), value: brief?.releaseDate ?? metadata?.publishDate } : null,
    isBook && metadata?.isbn ? { label: "ISBN", value: metadata.isbn } : null,
    genre ? { label: tMetadata("genre"), value: genre } : null,
  ].filter(fact => fact !== null);

  useEffect(() => {
    if (!isOpen || !registered) return;
    let alive = true;
    getContentBriefStrict(contentId, locale)
      .then(brief => { if (alive) setResult({ key: requestKey, brief }); })
      .catch(() => { if (alive) setResult({ key: requestKey, brief: null, failed: true }); });
    return () => { alive = false; };
  }, [isOpen, registered, contentId, locale, requestKey, attempt]);

  return <ContentInfoDialog isOpen={isOpen} onClose={onClose} type={contentType} title={contentTitle}
    creator={contentCreator} thumbnail={contentThumbnail} facts={facts} detailHref={detailHref}
    purchase={registered && purchaseEnabled ? { contentId, type: contentType, title: contentTitle, creator: contentCreator,
      thumbnail: contentThumbnail, bookLocale, isbn: metadata?.isbn, placement: "content-intro" } : undefined}>
    <ContentDescription title={t("title")} description={description}
      source={brief?.description && <BookIntroductionSource attribution={brief.introductionAttribution} />}
      status={loading ? "loading" : current?.failed ? "failed" : "ready"}
      loadingLabel={t("loading")} emptyLabel={t("empty")} failedLabel={t("failed")}
      onRetry={() => { setResult(null); setAttempt(value => value + 1); }} />
  </ContentInfoDialog>;
}
