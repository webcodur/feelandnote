/*
  파일명: /components/features/content/ContentDetailPage.tsx
  기능: 콘텐츠 상세 페이지 메인 컴포넌트
  책임: 아코디언 레이아웃으로 콘텐츠 정보, 내 리뷰, 내 노트, 모든 리뷰를 조합한다.
*/ // ------------------------------
"use client";

import { useState, useEffect, type ReactNode } from "react";
import { useRouter } from "@/i18n/navigation";
import { ArrowLeft } from "lucide-react";
import Button from "@/components/ui/Button";
import DecorativeLabel from "@/components/ui/DecorativeLabel";
import ShareButtons from "@/components/ui/ShareButtons";
import AccordionSection from "./AccordionSection";
import ContentInfoSection from "./ContentInfoSection";
import ContentRecordButton from "./ContentRecordButton";
import MyReviewSection from "./MyReviewSection";
import MyNoteSection from "./MyNoteSection";
import AllReviewsSection from "./AllReviewsSection";
import RecentContentsSection from "./RecentContentsSection";
import { ContentCharacters, ContentCurated } from "./ContentRelations";
import { useRecentContents } from "@/hooks/useRecentContents";
import { getContentDetail, getPublicContentInfo, getContentViewerState, type ContentDetailData } from "@/actions/contents/getContentDetail";
import { createClient } from "@/lib/db/client";
import { useTranslations, useLocale } from "next-intl";
import { useSearchParams } from 'next/navigation';
import { getContentDetailHref, selectContentBookEdition } from '@/lib/books/contentEdition';

interface ContentDetailPageProps {
  initialData: ContentDetailData;
  relatedSections?: ReactNode;
  reviewsSection?: ReactNode;
}

export default function ContentDetailPage({ initialData, relatedSections, reviewsSection }: ContentDetailPageProps) {
  const router = useRouter();
  const t = useTranslations("contentDetail");
  const [data, setData] = useState(initialData);
  const [isAuthResolved, setIsAuthResolved] = useState(false);
  const searchParams = useSearchParams();
  const locale = useLocale();
  const requestedLanguage = searchParams.get('bookLanguage');

  useEffect(() => {
    if (!initialData.content.enrichmentPending) return;
    let active = true;
    void getPublicContentInfo(initialData.content.id, locale).then(content => {
      if (active && content) setData(previous => ({ ...previous, content }));
    }).catch(() => console.error('[ContentDetailPage] supplementary information unavailable'));
    return () => { active = false; };
  }, [initialData.content, locale]);

  // An explicit search-language override is resolved after hydration.
  useEffect(() => {
    if (initialData.content.type !== 'BOOK') return;
    if ((requestedLanguage !== 'ko' && requestedLanguage !== 'en') || requestedLanguage === (initialData.content.editionLocale ?? locale)) {
      setData(previous => ({ ...previous, content: initialData.content }));
      return;
    }
    let active = true;
    void getContentDetail(initialData.content.id, 'book', requestedLanguage).then(result => {
      if (!active) return;
      setData(previous => ({ ...previous, content: result.content }));
      document.title = result.content.title;
    }).catch(error => console.error('[ContentDetailPage:book-language]', error));
    return () => { active = false; };
  }, [initialData.content, requestedLanguage, locale]);

  const { userRecord, isLoggedIn, initialReviews, fictionCharacters, curatedEntries } = data;
  const selection = selectContentBookEdition(data.content, searchParams.getAll('editionId'));
  const content = selection.content;
  const unavailable = selection.status === 'invalid' || selection.status === 'unavailable';
  const editions = data.content.bookEditions ?? [];
  const selectedScope = editions.find(edition => edition.id === content.purchaseEditionId)?.textScope;
  const changeEdition = (id: string) => {
    const query = new URLSearchParams(searchParams.toString());
    if (id) query.set('editionId', id); else query.delete('editionId');
    window.history.replaceState(null, '', `${window.location.pathname}${query.size ? `?${query}` : ''}${window.location.hash}`);
  };

  // 최근 접근 콘텐츠
  const { recentItems, addItem } = useRecentContents(content.id);

  useEffect(() => {
    addItem({
      id: content.id,
      type: content.type,
      title: content.title,
      titleBadge: content.titleBadge,
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
    <div className="max-w-3xl mx-auto" data-content-work-id={content.id}>
      {/* 뒤로가기 + 기록·SNS 공유 */}
      <div className="flex items-center justify-between gap-2 mb-4">
        <Button
          variant="ghost"
          className="flex items-center gap-2 text-text-secondary text-sm font-semibold"
          onClick={() => router.back()}
        >
          <ArrowLeft size={16} />
          <span>{t("back")}</span>
        </Button>
        <div className="flex items-center gap-2">
          <ContentRecordButton
            content={content}
            userRecord={userRecord}
            isLoggedIn={isLoggedIn}
            isAuthResolved={isAuthResolved}
            onRecordChange={handleRecordChange}
          />
          <ShareButtons title={content.title} path={content.type === 'BOOK'
            ? getContentDetailHref(content.id, unavailable ? undefined : content.purchaseEditionId)
            : `/content/${content.id}`} />
        </div>
      </div>

      {/* 최근 본 콘텐츠 */}
      <RecentContentsSection items={recentItems} />

      <div className="space-y-4">
        {/* 1. 콘텐츠 정보 */}
        <AccordionSection title={t("contentInfo")} defaultOpen>
          {content.type === 'BOOK' && editions.length > 0 && (
            <div className="mb-5 space-y-2 rounded-xl border border-border bg-white/[0.02] p-3 sm:p-4">
              <label className="block space-y-2">
                <span className="text-sm font-semibold text-text-primary">{t('editionSelection', { count: editions.length })}</span>
                <select aria-label={t('editionSelection', { count: editions.length })}
                  value={unavailable ? '' : content.purchaseEditionId ?? ''}
                  onChange={event => changeEdition(event.target.value)}
                  className="w-full min-w-0 cursor-pointer rounded-lg border border-border bg-bg-main p-2.5 text-sm text-text-primary hover:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
                  <option value="" disabled>{t('chooseEdition')}</option>
                  {editions.map(edition => <option key={edition.id} value={edition.id}>
                    {[edition.title, t(edition.locale === 'en' ? 'editionEnglish' : 'editionKorean'), edition.publisher, edition.isbn].filter(Boolean).join(' · ')}
                  </option>)}
                </select>
              </label>
              <p className="text-xs leading-relaxed text-text-secondary">{t('editionWorkRecords')}</p>
              {!unavailable && selectedScope && (
                <p className="break-words text-xs leading-relaxed text-text-secondary">{t('editionScope')}: {selectedScope === 'complete' ? t('editionCompleteText') : selectedScope}</p>
              )}
            </div>
          )}
          {unavailable && (
            <div role="alert" className="mb-4 space-y-3 rounded-lg border border-amber-400/30 bg-amber-400/5 p-4 text-sm text-text-secondary">
              <p>{t(selection.status === 'invalid' ? 'invalidEdition' : 'unavailableEdition')}</p>
              <button type="button" onClick={() => changeEdition('')}
                className="rounded-lg border border-accent/40 px-3 py-2 text-accent hover:border-accent hover:bg-accent/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
                {t('openWorkInfo')}
              </button>
            </div>
          )}
          {(!unavailable || content.type !== 'BOOK') && <ContentInfoSection key={content.purchaseEditionId ?? 'work'} content={content} />}
        </AccordionSection>

        {/* 등장·연관 도서로 지정된 콘텐츠만 인물을 양방향 연결한다. */}
        {relatedSections ?? <>
          <ContentCharacters characters={fictionCharacters} />
          <ContentCurated entries={curatedEntries} />
        </>}

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
            badge={<span className="text-[11px] bg-white/5 px-1.5 py-0.5 rounded">{t("private")}</span>}
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
          {reviewsSection ?? <AllReviewsSection
            contentId={content.id}
            contentTitle={content.title}
            contentType={content.type}
            initialReviews={initialReviews}
          />}
        </div>

      </div>
    </div>
  );
}
