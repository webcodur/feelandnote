/*
  파일명: /components/features/content/ContentDetailPage.tsx
  기능: 콘텐츠 상세 페이지 메인 컴포넌트
  책임: 아코디언 레이아웃으로 콘텐츠 정보, 내 리뷰, 내 노트, 모든 리뷰를 조합한다.
*/ // ------------------------------
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "@/i18n/navigation";
import { ArrowLeft } from "lucide-react";
import Button from "@/components/ui/Button";
import DecorativeLabel from "@/components/ui/DecorativeLabel";
import ShareButtons from "@/components/ui/ShareButtons";
import AccordionSection from "./AccordionSection";
import ContentInfoSection from "./ContentInfoSection";
import MyReviewSection from "./MyReviewSection";
import MyNoteSection from "./MyNoteSection";
import AllReviewsSection from "./AllReviewsSection";
import RecentContentsSection from "./RecentContentsSection";
import FigureBookCharactersSection from "./FigureBookCharactersSection";
import CuratedEntriesSection from "./CuratedEntriesSection";
import { useRecentContents } from "@/hooks/useRecentContents";
import { getContentViewerState, type ContentDetailData } from "@/actions/contents/getContentDetail";
import { createClient } from "@/lib/db/client";
import { useTranslations } from "next-intl";

interface ContentDetailPageProps {
  initialData: ContentDetailData;
}

export default function ContentDetailPage({ initialData }: ContentDetailPageProps) {
  const router = useRouter();
  const t = useTranslations("contentDetail");
  const tCurated = useTranslations("library.curated");
  const [data, setData] = useState(initialData);
  const [isAuthResolved, setIsAuthResolved] = useState(false);

  const { content, userRecord, isLoggedIn, initialReviews, fictionCharacters, curatedEntries } = data;

  // 최근 접근 콘텐츠
  const { recentItems, addItem } = useRecentContents(content.id);

  useEffect(() => {
    addItem({
      id: content.id,
      type: content.type,
      title: content.title,
      creator: content.creator ?? null,
      thumbnail: content.thumbnail ?? null,
    });
  }, [content.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    let isActive = true;
    const db = createClient();

    const hydrateViewer = async () => {
      try {
        // getSession은 브라우저 저장소만 확인한다. 익명 방문자는 여기서 끝나므로
        // 익명 방문자의 정적 페이지가 원본 서버에 추가 요청을 보내지 않게 한다.
        const { data: { session } } = await db.auth.getSession();
        if (!session) return;

        const viewer = await getContentViewerState(content.id);
        if (isActive) setData((prev) => ({ ...prev, ...viewer }));
      } catch (error) {
        console.error("[ContentDetailPage:viewer]", error);
      } finally {
        if (isActive) setIsAuthResolved(true);
      }
    };

    void hydrateViewer();
    return () => {
      isActive = false;
    };
  }, [content.id]);

  const handleRecordChange = (newRecord: ContentDetailData["userRecord"]) => {
    setData((prev) => ({ ...prev, userRecord: newRecord }));
  };

  return (
    <div className="max-w-3xl mx-auto">
      {/* 뒤로가기 + SNS 공유 */}
      <div className="flex items-center justify-between gap-2 mb-4">
        <Button
          variant="ghost"
          className="flex items-center gap-2 text-text-secondary text-sm font-semibold"
          onClick={() => router.back()}
        >
          <ArrowLeft size={16} />
          <span>{t("back")}</span>
        </Button>
        <ShareButtons title={content.title} path={`/content/${content.id}`} />
      </div>

      {/* 최근 본 콘텐츠 */}
      <RecentContentsSection items={recentItems} />

      <div className="space-y-4">
        {/* 1. 콘텐츠 정보 */}
        <AccordionSection title={t("contentInfo")} defaultOpen>
          <ContentInfoSection
            content={content}
            userRecord={userRecord}
            isLoggedIn={isLoggedIn}
            isAuthResolved={isAuthResolved}
            onRecordChange={handleRecordChange}
          />
        </AccordionSection>

        {/* 등장·연관 도서로 지정된 콘텐츠만 인물을 양방향 연결한다. */}
        {fictionCharacters.length > 0 && (
          <AccordionSection
            title={t("fictionCharacters")}
            badge={(
              <span className="rounded-full border border-accent/20 bg-accent/[0.06] px-2 py-0.5 text-[10px] text-accent">
                {t("fictionCharactersCount", { count: fictionCharacters.length })}
              </span>
            )}
            defaultOpen
          >
            <FigureBookCharactersSection characters={fictionCharacters} />
          </AccordionSection>
        )}

        {/* 기관·매체가 이 작품을 뽑은 이력 — 대학 필독서·언론 선정·수상 */}
        {curatedEntries.length > 0 && (
          <AccordionSection
            title={tCurated("onContent.title")}
            badge={(
              <span className="rounded-full border border-accent/20 bg-accent/[0.06] px-2 py-0.5 text-[10px] text-accent">
                {tCurated("onContent.badge", { count: curatedEntries.length })}
              </span>
            )}
            defaultOpen
          >
            <CuratedEntriesSection entries={curatedEntries} />
          </AccordionSection>
        )}

        {/* 2. 내 리뷰 (로그인 시 표시) */}
        {isLoggedIn && (
          <AccordionSection
            title={t("myReview")}
            badge={
              userRecord?.rating && (
                <span className="text-xs text-yellow-400">{"★".repeat(userRecord.rating)}</span>
              )
            }
            defaultOpen
          >
            <MyReviewSection
              content={content}
              userRecord={userRecord}
              onRecordChange={handleRecordChange}
            />
          </AccordionSection>
        )}

        {/* 3. 내 노트 (기록이 있고 로그인 시) */}
        {userRecord && isLoggedIn && (
          <AccordionSection
            title={t("myNote")}
            badge={<span className="text-[10px] bg-white/5 px-1.5 py-0.5 rounded">{t("private")}</span>}
            defaultOpen={false}
          >
            <MyNoteSection contentId={content.id} />
          </AccordionSection>
        )}

        {/* 4. 모든 리뷰 (항상 표시) */}
        <div className="bg-bg-card border border-border rounded-xl p-4">
          <div className="mb-4">
            <DecorativeLabel label={t("othersReviews")} />
          </div>
          <AllReviewsSection
            contentId={content.id}
            contentTitle={content.title}
            contentType={content.type}
            initialReviews={initialReviews}
          />
        </div>

      </div>
    </div>
  );
}
