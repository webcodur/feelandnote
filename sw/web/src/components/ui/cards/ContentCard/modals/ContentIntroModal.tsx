/*
  작품 소개 모달
  - 포스터 우하단 '소개' 뱃지에서 열린다
  - contentId로 getContentBrief를 호출해 소개글을 표시
*/
"use client";

import { useEffect, useState } from "react";
import { BookOpen } from "lucide-react";
import Modal, { ModalBody } from "@/components/ui/Modal";
import ContentImage from "@/components/ui/ContentImage";
import FormattedText from "@/components/ui/FormattedText";
import { getContentBrief, type ContentBrief } from "@/actions/contents/getContentBrief";
import { useLocale, useTranslations } from "next-intl";
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
  fallbackDescription?: string | null;
  fallbackMetadata?: ContentMetadata | null;
}

export default function ContentIntroModal({
  isOpen,
  onClose,
  contentId,
  contentTitle,
  contentCreator,
  contentType,
  contentThumbnail,
  fallbackDescription,
  fallbackMetadata,
}: ContentIntroModalProps) {
  const locale = useLocale();
  const t = useTranslations("content.intro");
  const tContent = useTranslations("content");
  const tMetadata = useTranslations("shared.content");
  const [brief, setBrief] = useState<ContentBrief | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const creatorLabel = {
    BOOK: tContent("creator.book"),
    VIDEO: tContent("creator.video"),
    GAME: tContent("creator.game"),
    MUSIC: tContent("creator.music"),
  }[contentType];
  const isBook = contentType === "BOOK" || brief?.category === "book";
  const genre = brief?.metadata?.genres?.join(", ")
    || brief?.metadata?.genre
    || fallbackMetadata?.genres?.join(", ")
    || fallbackMetadata?.genre;

  const bookMetadata = isBook
    ? [
        { label: creatorLabel, value: contentCreator },
        { label: tMetadata("publisher"), value: brief?.metadata?.publisher ?? fallbackMetadata?.publisher },
        { label: tMetadata("publishDate"), value: brief?.releaseDate ?? brief?.metadata?.publishDate ?? fallbackMetadata?.publishDate },
        { label: "ISBN", value: brief?.metadata?.isbn ?? fallbackMetadata?.isbn },
        { label: tMetadata("genre"), value: genre },
      ].filter((item): item is { label: string; value: string } => Boolean(item.value))
    : [];

  const generalMetadata = !isBook
    ? [
        { label: creatorLabel, value: contentCreator },
        { label: t("releasedLabel"), value: brief?.releaseDate ?? fallbackMetadata?.publishDate },
        { label: t("genresLabel"), value: genre },
      ].filter((item): item is { label: string; value: string } => Boolean(item.value))
    : [];

  useEffect(() => {
    if (!isOpen || !contentId) return;
    let cancelled = false;
    const fetch = async () => {
      setIsLoading(true);
      try {
        const data = await getContentBrief(contentId, locale);
        if (!cancelled) setBrief(data);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    fetch();
    return () => {
      cancelled = true;
    };
  }, [isOpen, contentId, locale]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t("title")} icon={BookOpen} size="xl">
      <ModalBody className="!p-0">
        <div className="flex flex-col sm:flex-row">
          {/* 좌측: 표지 앵커 */}
          <div className="sm:w-[176px] shrink-0 p-4 bg-gradient-to-b from-stone-900 to-stone-950 border-b sm:border-b-0 sm:border-r border-border/40 flex flex-col items-center">
            {contentThumbnail ? (
              <div className="relative w-32 sm:w-full aspect-[5/7] overflow-hidden rounded-lg border border-accent/30 shadow-lg">
                <ContentImage src={contentThumbnail} alt={contentTitle} sizes="160px" />
              </div>
            ) : (
              <div className="w-32 sm:w-full aspect-[5/7] bg-bg-card rounded-lg border border-accent/30 flex items-center justify-center">
                <BookOpen size={28} className="text-accent/50" />
              </div>
            )}
            <p className="mt-4 text-sm font-sans text-text-primary text-center leading-snug line-clamp-2">
              {contentTitle}
            </p>
            {!isLoading && bookMetadata.length > 0 && (
              <dl className="mt-4 w-full space-y-2 border-t border-white/10 pt-3">
                {bookMetadata.map((item) => (
                  <div key={item.label} className="min-w-0 text-center sm:text-start">
                    <dt className="text-[11px] font-medium text-text-tertiary">{item.label}</dt>
                    <dd className="mt-0.5 break-words text-xs leading-snug text-text-secondary">{item.value}</dd>
                  </div>
                ))}
              </dl>
            )}
          </div>

          {/* 우측: 소개 본문 */}
          <div className="flex-1 flex flex-col min-w-0 p-4 sm:p-5">
            {isLoading ? (
              <div className="space-y-2 py-2">
                <div className="h-3 w-full animate-pulse rounded bg-white/[0.06]" />
                <div className="h-3 w-11/12 animate-pulse rounded bg-white/[0.06]" />
                <div className="h-3 w-4/5 animate-pulse rounded bg-white/[0.06]" />
                <div className="h-3 w-3/4 animate-pulse rounded bg-white/[0.06]" />
              </div>
            ) : (brief?.description ?? fallbackDescription) ? (
              <div className="text-sm leading-relaxed text-text-secondary whitespace-pre-wrap">
                <FormattedText text={(brief?.description ?? fallbackDescription)!} />
              </div>
            ) : (
              <p className="text-sm italic text-text-tertiary py-4 text-center">{t("empty")}</p>
            )}
            {!isLoading && generalMetadata.length > 0 && (
              <dl className="mt-5 space-y-2 border-t border-white/10 pt-4 text-sm">
                {generalMetadata.map((item) => (
                  <div key={item.label} className="grid grid-cols-[auto_minmax(0,1fr)] gap-3">
                    <dt className="font-medium text-text-tertiary">{item.label}</dt>
                    <dd className="break-words text-text-secondary">{item.value}</dd>
                  </div>
                ))}
              </dl>
            )}
          </div>
        </div>
      </ModalBody>
    </Modal>
  );
}
