"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Book, Film, Gamepad2, Music, Star } from "lucide-react";
import ContentCover from "@/components/ui/ContentCover";
import NoEditionBadge from "@/components/ui/NoEditionBadge";
import ContentPurchaseAction from "@/components/features/commerce/ContentPurchaseAction";
import type { ContentDetailData } from "@/actions/contents/getContentDetail";
import type { ContentMetadata as Metadata } from "@/types/content";
import ContentMetadata from "./ContentMetadata";
import ContentIntroduction from "./ContentIntroduction";
import ContentMediaDetails from "./ContentMediaDetails";
import styles from "./ContentDetail.module.css";
import ContentBanner from "./ContentBanner";
import type { BookBannerTheme } from "@/lib/books/bookBanner";

const TYPE_ICONS = { BOOK: Book, VIDEO: Film, GAME: Gamepad2, MUSIC: Music };
interface Props {
  bannerTheme: BookBannerTheme;
  content: ContentDetailData["content"];
  actions?: ReactNode;
  editionSelection?: ReactNode;
  unavailable?: boolean;
}

/** 표지·작품 정보·조작을 인물 상세의 대표 정보 판과 같은 위계로 배치한다. */
export default function ContentInfoSection({ content, actions, editionSelection, unavailable, bannerTheme }: Props) {
  const tCategory = useTranslations("content.category");
  const Icon = TYPE_ICONS[content.type];
  const metadata = content.metadata as unknown as Metadata | null;
  const rating = metadata?.voteAverage ?? metadata?.rating;
  const isSquare = content.type === "MUSIC";
  return (
    <div className={styles.hero} data-content-edition-info={content.purchaseEditionId ?? "work"}>
      <ContentBanner type={content.type} theme={bannerTheme} metadata={metadata} mediaTheme={content.mediaBannerTheme} />
      <div className={styles.identity}>
        <div className={styles.coverColumn}>
          <div className={[styles.cover, isSquare && styles.squareCover].filter(Boolean).join(" ")}>
            <ContentCover src={content.thumbnail} alt={content.title} priority
              sizes="(max-width: 767px) 96px, 160px" className="object-contain"
              fallbackTitle={content.title} ContentIcon={Icon} />
          </div>
          {!unavailable && <ContentPurchaseAction contentId={content.id} type={content.type} placement="content-detail"
            editionId={content.purchaseEditionId} bookLocale={content.editionLocale}
            isbn={typeof content.metadata?.isbn === "string" ? content.metadata.isbn : undefined}
            title={content.title} creator={content.creator} thumbnail={content.thumbnail} links={content.affiliateLinks} />}
        </div>
        <div className={styles.informationColumn}>
          <div className={styles.identityCopy}>
            <div className={styles.heading}>
              <span className={styles.category}><Icon size={15} aria-hidden="true" />{tCategory(content.type.toLowerCase())}</span>
              <h1 className={styles.title}>
                <NoEditionBadge contentType={content.type} badge={content.titleBadge} className="me-1.5 align-middle" />
                {content.title}
              </h1>
              {content.type === "VIDEO" && metadata?.tagline && <p className={styles.tagline}>{metadata.tagline}</p>}
            </div>
            <ContentMetadata content={content} />
            <div className={styles.actions}>
              {actions}
              {rating !== undefined && rating > 0 && <span className="inline-flex items-center gap-1 rounded-md border border-accent/20 px-2 py-1 text-xs font-semibold text-accent">
                <Star size={12} aria-hidden="true" />{rating.toFixed(1)}
              </span>}
            </div>
          </div>
          {editionSelection && <div className={styles.editionSlot}>{editionSelection}</div>}
          {!unavailable && <div className={styles.introductionSlot}><ContentIntroduction content={content} /></div>}
        </div>
      </div>
      {!unavailable && content.type !== "BOOK" && <div className={styles.extras}><ContentMediaDetails content={content} /></div>}
    </div>
  );
}
