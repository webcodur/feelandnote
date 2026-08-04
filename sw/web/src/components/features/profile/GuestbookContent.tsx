/*
  파일명: /components/features/profile/GuestbookContent.tsx
  기능: 방명록 콘텐츠 컴포넌트
  책임: 방명록 목록 표시 및 CRUD 처리
*/ // ------------------------------
"use client";

import { useState, useCallback, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Pagination } from "@/components/ui";
import { LogIn, MessageSquare } from "lucide-react";
import type { GuestbookEntryWithAuthor } from "@/types/database";
import { updateGuestbookEntry, deleteGuestbookEntry, getGuestbookEntries } from "@/actions/guestbook";
import { createClient } from "@/lib/supabase/client";
import { Link } from "@/i18n/navigation";
import EntryItem from "./guestbook/EntryItem";
import WriteForm from "./guestbook/WriteForm";
import type { GuestbookContentProps, CurrentUserId } from "./guestbook/types";

const PAGE_SIZE = 10;

export default function GuestbookContent({
  profileId,
  currentUserId: currentUserIdProp,
  isOwner,
  initialEntries,
  initialTotal,
  hideEmptyState = false,
  isFiction = false,
}: GuestbookContentProps) {
  const t = useTranslations("profileSection.guestbook");
  const tFiction = useTranslations("profileSection.fictionGuestbook");

  // 서버가 사용자를 주입하지 않은 경우(정적 렌더 화면) 클라이언트에서 본인 id를 조회한다.
  const [selfUserId, setSelfUserId] = useState<CurrentUserId>(null);
  const [isAuthResolved, setIsAuthResolved] = useState(
    currentUserIdProp !== undefined,
  );
  const currentUserId: CurrentUserId = currentUserIdProp !== undefined ? currentUserIdProp : selfUserId;
  const [entries, setEntries] = useState(initialEntries.slice(0, PAGE_SIZE));
  const [total, setTotal] = useState(initialTotal);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  // 정적 셀럽 화면은 공개 목록을 seed로 받는다. 로그인 사용자는 차단 필터를
  // 다시 적용하기 전까지 목록을 감춰 차단한 작성자가 잠깐 노출되는 일을 막는다.
  const [isEntriesResolved, setIsEntriesResolved] = useState(
    currentUserIdProp !== undefined,
  );

  useEffect(() => {
    if (currentUserIdProp !== undefined) return;
    let isActive = true;
    const supabase = createClient();
    const resolveCurrentUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (isActive) setSelfUserId(user?.id ?? null);
      } catch (error) {
        console.error("Resolve guestbook user error:", error);
        if (isActive) setSelfUserId(null);
      } finally {
        if (isActive) setIsAuthResolved(true);
      }
    };
    void resolveCurrentUser();

    return () => {
      isActive = false;
    };
  }, [currentUserIdProp]);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const fetchPage = useCallback(async (page: number) => {
    setIsLoading(true);
    try {
      const offset = (page - 1) * PAGE_SIZE;
      const result = await getGuestbookEntries({ profileId, limit: PAGE_SIZE, offset });
      setEntries(result.entries);
      setTotal(result.total);
      setCurrentPage(page);
    } catch (error) {
      console.error("Fetch page error:", error);
    } finally {
      setIsLoading(false);
    }
  }, [profileId]);

  useEffect(() => {
    if (currentUserIdProp !== undefined || !isAuthResolved) return;

    if (!currentUserId) {
      setIsEntriesResolved(true);
      return;
    }

    setIsEntriesResolved(false);
    void fetchPage(1).finally(() => setIsEntriesResolved(true));
  }, [currentUserId, currentUserIdProp, fetchPage, isAuthResolved]);

  const handleAddEntry = useCallback((entry: GuestbookEntryWithAuthor) => {
    // 새 글 작성 시 1페이지로 이동하여 최신 목록 표시
    setEntries((prev) => [entry, ...prev].slice(0, PAGE_SIZE));
    setTotal((prev) => prev + 1);
    setCurrentPage(1);
  }, []);

  const handleDeleteEntry = useCallback(async (id: string) => {
    if (!confirm(t("deleteConfirm"))) return;

    try {
      await deleteGuestbookEntry(id);
      setEntries((prev) => prev.filter((e) => e.id !== id));
      setTotal((prev) => prev - 1);
    } catch (error) {
      console.error("Delete guestbook entry error:", error);
      alert(t("deleteFailed"));
    }
  }, [t]);

  const handleUpdateEntry = useCallback(
    async (id: string, content: string, isPrivate: boolean) => {
      try {
        await updateGuestbookEntry({ entryId: id, content, isPrivate });
        setEntries((prev) =>
          prev.map((e) => (e.id === id ? { ...e, content, is_private: isPrivate } : e))
        );
      } catch (error) {
        console.error("Update guestbook entry error:", error);
        alert(t("updateFailed"));
      }
    },
    [t]
  );

  return (
    <>
      {/* 로그인 확인 중에도 작성 영역의 자리가 보여 빈 박스로 오해되지 않게 한다. */}
      {!isAuthResolved ? (
        <div
          className="mb-8 min-h-[118px] animate-pulse rounded-lg border border-white/[0.04] bg-white/[0.02] p-4"
          aria-hidden
        >
          <div className="h-3 w-2/5 rounded bg-white/[0.05]" />
          <div className="mt-3 h-3 w-3/5 rounded bg-white/[0.035]" />
          <div className="mt-7 ml-auto h-7 w-28 rounded bg-white/[0.05]" />
        </div>
      ) : currentUserId ? (
        <WriteForm
          profileId={profileId}
          onSubmit={handleAddEntry}
          entryCount={total}
          isFiction={isFiction}
        />
      ) : (
        <Link
          href="/login"
          className="group mb-8 block overflow-hidden rounded-lg border border-accent-dim/20 bg-white/[0.02] hover:border-accent/50 hover:bg-accent/[0.025]"
        >
          <div className="min-h-[76px] px-4 py-4 text-sm group-hover:text-text-secondary">
            {isFiction ? tFiction("loginPrompt") : t("loginPrompt")}
          </div>
          <div className="flex items-center justify-between gap-3 border-t border-white/[0.05] px-4 py-3">
            <span className="text-xs">
              {isFiction ? tFiction("loginHint") : t("loginHint")}
            </span>
            <span className="inline-flex shrink-0 items-center gap-1.5 rounded bg-accent/90 px-3 py-1.5 text-[11px] font-bold text-bg-main group-hover:bg-accent">
              <LogIn size={11} strokeWidth={2} aria-hidden />
              {t("loginAction")}
            </span>
          </div>
        </Link>
      )}

      {/* 방명록 목록 */}
      {!isEntriesResolved ? (
        <div className="min-h-24 animate-pulse rounded-lg border border-white/[0.04] bg-white/[0.02]" aria-hidden />
      ) : entries.length > 0 ? (
        <div className={isLoading ? "opacity-50 pointer-events-none" : ""}>
          <div className="divide-y divide-white/[0.04]">
            {entries.map((entry) => (
              <EntryItem
                key={entry.id}
                entry={entry}
                currentUserId={currentUserId}
                isOwner={isOwner}
                onDelete={handleDeleteEntry}
                onUpdate={handleUpdateEntry}
              />
            ))}
          </div>

          {totalPages > 1 && (
            <div className="pt-6 mt-4 border-t border-white/[0.04]">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={fetchPage}
              />
            </div>
          )}
        </div>
      ) : !hideEmptyState && (
        <div className="text-center py-10">
          <MessageSquare size={20} strokeWidth={1.5} className="mx-auto mb-2" />
          <p className="text-xs font-sans">
            {isFiction ? tFiction("empty") : t("empty")}
          </p>
        </div>
      )}
    </>
  );
}
