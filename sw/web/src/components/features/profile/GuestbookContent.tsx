/*
  파일명: /components/features/profile/GuestbookContent.tsx
  기능: 방명록 콘텐츠 컴포넌트
  책임: 방명록 목록 표시 및 CRUD 처리
*/ // ------------------------------
"use client";

import { useState, useCallback } from "react";
import { InnerBox, Pagination } from "@/components/ui";
import { MessageSquare } from "lucide-react";
import type { GuestbookEntryWithAuthor } from "@/types/database";
import { updateGuestbookEntry, deleteGuestbookEntry, getGuestbookEntries } from "@/actions/guestbook";
import EntryItem from "./guestbook/EntryItem";
import WriteForm from "./guestbook/WriteForm";
import type { GuestbookContentProps } from "./guestbook/types";

const PAGE_SIZE = 10;

export default function GuestbookContent({
  profileId,
  currentUser,
  isOwner,
  initialEntries,
  initialTotal,
}: GuestbookContentProps) {
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
    if (!confirm("정말 삭제하시겠습니까?")) return;

    try {
      await deleteGuestbookEntry(id);
      setEntries((prev) => prev.filter((e) => e.id !== id));
      setTotal((prev) => prev - 1);
    } catch (error) {
      console.error("Delete guestbook entry error:", error);
      alert("삭제에 실패했습니다");
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
        alert("수정에 실패했습니다");
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
        <div className={`space-y-4${isLoading ? " opacity-50 pointer-events-none" : ""}`}>
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

          {/* 페이지네이션 */}
          <div className="pt-4">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={fetchPage}
            />
          </div>
        </div>
      ) : (
        <InnerBox className="text-center py-16">
          <MessageSquare size={48} strokeWidth={1} className="mx-auto mb-4 text-accent-dim opacity-50" />
          <p className="text-lg text-text-secondary mb-2 font-serif">The Guestbook is Empty</p>
          {currentUser && <p className="text-sm text-text-tertiary">Be the first to sign this guestbook.</p>}
        </InnerBox>
      )}
    </>
  );
}
