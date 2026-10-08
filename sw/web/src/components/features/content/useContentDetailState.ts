"use client";
import { useState, useEffect } from "react";
import { useLocale } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useRecentHistory } from "@/hooks/useRecentHistory";
import { getContentDetail, getPublicContentInfo, getContentViewerState, type ContentDetailData } from "@/actions/contents/getContentDetail";
import { createClient } from "@/lib/db/client";
import { getContentDetailHref, selectContentBookEdition } from "@/lib/books/contentEdition";

export function useContentDetailState(initialData: ContentDetailData) {
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
  const changeEdition = (id: string) => {
    const query = new URLSearchParams(searchParams.toString());
    if (id) query.set('editionId', id); else query.delete('editionId');
    window.history.replaceState(null, '', `${window.location.pathname}${query.size ? `?${query}` : ''}${window.location.hash}`);
  };

  // 최근 접근 콘텐츠
  const recentItems = useRecentHistory({ kind: "content", id: content.id, title: content.title,
    titles: { [locale]: content.title }, thumbnail: content.thumbnail ?? null,
    href: content.type === "BOOK" ? getContentDetailHref(content.id, unavailable ? undefined : content.purchaseEditionId) : `/content/${encodeURIComponent(content.id)}` });

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

  return { content, userRecord, isLoggedIn, isAuthResolved, initialReviews, fictionCharacters, curatedEntries,
    selection, unavailable, editions, changeEdition, recentItems, handleRecordChange };
}
