/*
  파일명: /components/features/profile/GuestbookContent.tsx
  기능: 방명록 콘텐츠 컴포넌트
  책임: 방명록 목록 표시 및 CRUD 처리
*/ // ------------------------------
"use client";

import { useState, useCallback, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Pagination } from "@/components/ui";
import { MessageSquare } from "lucide-react";
import type { GuestbookEntryWithAuthor } from "@/types/database";
import { updateGuestbookEntry, deleteGuestbookEntry, getGuestbookEntries } from "@/actions/guestbook";
import { createClient } from "@/lib/supabase/client";
import EntryItem from "./guestbook/EntryItem";
import WriteForm from "./guestbook/WriteForm";
import type { GuestbookContentProps, CurrentUser } from "./guestbook/types";

const PAGE_SIZE = 10;

export default function GuestbookContent({
  profileId,
  currentUser: currentUserProp,
  isOwner,
  initialEntries,
  initialTotal,
}: GuestbookContentProps) {
  const t = useTranslations("profileSection.guestbook");

  // 서버가 사용자를 주입하지 않은 경우(정적 렌더 화면) 클라이언트에서 본인 id를 조회한다.
  // 방명록은 작성 폼 노출 여부와 본인 글 수정/삭제 판정에 id만 사용한다(닉네임·아바타 미사용).
  const [selfUser, setSelfUser] = useState<CurrentUser>(null);
  const currentUser: CurrentUser = currentUserProp !== undefined ? currentUserProp : selfUser;

  useEffect(() => {
    if (currentUserProp !== undefined) return;
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setSelfUser({ id: user.id, nickname: null, avatar_url: null });
    });
  }, [currentUserProp]);
  const [entries, setEntries] = useState(initialEntries.slice(0, PAGE_SIZE));
  const [total, setTotal] = useState(initialTotal);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const fetchPage = async (page: number) => {
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
  };

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
  }, []);

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
    []
  );

  return (
    <>
      {/* 작성 폼 (로그인 사용자만) */}
      {currentUser && <WriteForm profileId={profileId} onSubmit={handleAddEntry} />}

      {/* 방명록 목록 */}
      {entries.length > 0 ? (
        <div className={isLoading ? "opacity-50 pointer-events-none" : ""}>
          <div className="divide-y divide-white/[0.04]">
            {entries.map((entry) => (
              <EntryItem
                key={entry.id}
                entry={entry}
                currentUser={currentUser}
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
      ) : (
        <div className="text-center py-10">
          <MessageSquare size={20} strokeWidth={1.5} className="mx-auto mb-2 text-text-tertiary/15" />
          <p className="text-xs text-text-tertiary/40 font-sans">{t("empty")}</p>
        </div>
      )}
    </>
  );
}
