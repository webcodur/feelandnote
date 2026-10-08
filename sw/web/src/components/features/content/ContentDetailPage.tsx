"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { ArrowLeft } from "lucide-react";
import Button from "@/components/ui/Button";
import ShareButtons from "@/components/ui/ShareButtons";
import type { ContentDetailData } from "@/actions/contents/getContentDetail";
import { getContentDetailHref } from "@/lib/books/contentEdition";
import ContentInfoSection from "./ContentInfoSection";
import ContentRecordButton from "./ContentRecordButton";
import ContentEditionSelection from "./ContentEditionSelection";
import ContentDetailSection from "./ContentDetailSection";
import ContentDetailNavigation from "./ContentDetailNavigation";
import MyReviewSection from "./MyReviewSection";
import MyNoteSection from "./MyNoteSection";
import AllReviewsSection from "./AllReviewsSection";
import RecentHistoryRail from "@/components/shared/RecentHistoryRail";
import { ContentCharacters, ContentCurated } from "./ContentRelations";
import { useContentDetailState } from "./useContentDetailState";
import styles from "./ContentDetail.module.css";
import type { BookBannerTheme } from "@/lib/books/bookBanner";

interface Props {
  bannerTheme?: BookBannerTheme;
  initialData: ContentDetailData;
  relatedSections?: ReactNode;
  reviewsSection?: ReactNode;
}

export default function ContentDetailPage({ initialData, relatedSections, reviewsSection, bannerTheme = "library" }: Props) {
  const router = useRouter();
  const t = useTranslations("contentDetail");
  const { content, userRecord, isLoggedIn, isAuthResolved, initialReviews, fictionCharacters, curatedEntries,
    selection, unavailable, editions, changeEdition, recentItems, handleRecordChange } = useContentDetailState(initialData);

  return (
    <ContentDetailNavigation workId={content.id}>
      <div className="flex items-center justify-between gap-3">
        <Button variant="ghost" className="flex items-center gap-2 text-sm font-semibold text-text-secondary"
          onClick={() => router.back()}><ArrowLeft size={16} /><span>{t("back")}</span></Button>
      </div>
      <RecentHistoryRail items={recentItems} className="pt-2" />
      <div className={`${styles.stack} ${recentItems.length > 0 ? "pt-6! md:pt-8!" : ""}`}>
        <ContentDetailSection id="work-information" title={t("contentInfo")} opening>
          <ContentInfoSection key={content.purchaseEditionId ?? "work"} content={content} unavailable={unavailable} bannerTheme={bannerTheme}
            actions={<>
              <ContentRecordButton content={content} userRecord={userRecord} isLoggedIn={isLoggedIn}
                isAuthResolved={isAuthResolved} onRecordChange={handleRecordChange} />
              <ShareButtons title={content.title} comfortable iconOnly showLabel={false} align="center"
                path={content.type === "BOOK" ? getContentDetailHref(content.id, unavailable ? undefined : content.purchaseEditionId) : "/content/" + content.id} />
            </>}
            editionSelection={content.type === "BOOK" && (editions.length > 0 || unavailable)
              ? <ContentEditionSelection content={content} editions={editions} status={selection.status} onChange={changeEdition} /> : undefined} />
        </ContentDetailSection>
        {relatedSections ?? <>
          <ContentCharacters characters={fictionCharacters} />
          <ContentCurated entries={curatedEntries} />
        </>}
        {isLoggedIn && <ContentDetailSection id="work-my-review" title={t("myReview")}>
          <div className={styles.reviewBody}><MyReviewSection content={content} userRecord={userRecord} onRecordChange={handleRecordChange} /></div>
        </ContentDetailSection>}
        {userRecord && isLoggedIn && <ContentDetailSection id="work-my-note" title={t("myNote")}
          headerActions={<span className="rounded-full border border-border px-2 py-0.5 text-xs text-text-tertiary">{t("private")}</span>}>
          <div className={styles.reviewBody}><MyNoteSection contentId={content.id} /></div>
        </ContentDetailSection>}
        <ContentDetailSection id="work-reviews" title={t("othersReviews")}>
          <div className={styles.reviewBody}>{reviewsSection ?? <AllReviewsSection contentId={content.id}
            contentTitle={content.title} contentType={content.type} initialReviews={initialReviews} />}</div>
        </ContentDetailSection>
      </div>
    </ContentDetailNavigation>
  );
}
