"use client";
import { useLocale, useTranslations } from "next-intl";
import BookIntroductionPanel from "@/components/shared/BookIntroductionPanel";
import { FormattedText } from "@/components/ui";
import PendingBlock from "@/components/ui/pending/PendingBlock";
import RetryBlock from "@/components/ui/pending/RetryBlock";
import { useBookIntroduction } from "@/hooks/useBookIntroduction";
import type { ContentDetailData } from "@/actions/contents/getContentDetail";
import type { ContentMetadata } from "@/types/content";
import styles from "./ContentDetail.module.css";

export default function ContentIntroduction({ content }: { content: ContentDetailData["content"] }) {
  const tCeleb = useTranslations("celebPage");
  const locale = useLocale();
  const bookIntroduction = useBookIntroduction(
    content.type === 'BOOK' ? content.bookIntroduction : null,
    content.editionLocale ?? locale,
    content.type === 'BOOK' ? content.description : null,
  );
  const description = content.type === 'BOOK' ? bookIntroduction.description : content.description;

  const metadata = content.metadata as unknown as ContentMetadata | null;
  return <div className={styles.description} data-content-introduction data-loading={bookIntroduction.loading || undefined}>
  {(description || bookIntroduction.loading || bookIntroduction.failed) && <h3 className={styles.introductionHeading}>{tCeleb("sourceWorkIntroduction")}</h3>}
  {bookIntroduction.loading && <PendingBlock variant="panel" minHeight="min-h-28" />}
  {bookIntroduction.failed && <RetryBlock onRetry={bookIntroduction.retry} />}
  {description && (
    <div className="relative">
      <BookIntroductionPanel
        contentType={content.type}
        description={description}
        label={tCeleb("sourceWorkIntroduction")}
        attribution={content.type === "BOOK" ? content.introductionAttribution : undefined}
        showSource={content.type === "BOOK"}
        sourceTitle={content.title}
        sourceTitleBadge={content.titleBadge}
        className="mt-0 min-h-0!"
        appearance="plain"
        showFullText
      />
    </div>
  )}

  {/* 게임 스토리라인 */}
  {content.type === "GAME" && metadata?.storyline && (
    <div className="relative py-0.5">
      <div className="text-sm text-text-secondary/90 leading-relaxed whitespace-pre-wrap font-normal">
        <FormattedText text={metadata.storyline} />
      </div>

    </div>
  )}

  </div>;
}
