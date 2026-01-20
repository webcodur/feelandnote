/*
  파일명: /components/features/profile/GuestbookContent.tsx
  기능: 방명록 콘텐츠 컴포넌트
  책임: 방명록 목록 표시 및 CRUD 처리
*/ // ------------------------------
"use client";

import { useState, useCallback } from "react";
import { Button, InnerBox } from "@/components/ui";
import { MessageSquare } from "lucide-react";
import type { GuestbookEntryWithAuthor } from "@/types/database";
import { updateGuestbookEntry, deleteGuestbookEntry, getGuestbookEntries } from "@/actions/guestbook";
import EntryItem from "./guestbook/EntryItem";
import WriteForm from "./guestbook/WriteForm";
import type { GuestbookContentProps } from "./guestbook/types";

export default function GuestbookContent({
  profileId,
  currentUser,
  isOwner,
  initialEntries,
  initialTotal,
}: GuestbookContentProps) {
  const [entries, setEntries] = useState(initialEntries);
  const [total, setTotal] = useState(initialTotal);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const hasMore = entries.length < total;

  const handleAddEntry = useCallback((entry: GuestbookEntryWithAuthor) => {
    setEntries((prev) => [entry, ...prev]);
    setTotal((prev) => prev + 1);
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

  const handleLoadMore = async () => {
    if (isLoadingMore || !hasMore) return;

    setIsLoadingMore(true);
    try {
      const result = await getGuestbookEntries({ profileId, offset: entries.length });
      setEntries((prev) => [...prev, ...result.entries]);
    } catch (error) {
      console.error("Load more error:", error);
    } finally {
      setIsLoadingMore(false);
    }
  };

  return (
    <>
      {/* 작성 폼 (로그인 사용자만) */}
      {currentUser && <WriteForm profileId={profileId} onSubmit={handleAddEntry} />}

      {/* 방명록 목록 */}
      {entries.length > 0 ? (
        <div className="space-y-4">
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

          {/* 더보기 */}
          {hasMore && (
            <Button
              unstyled
              onClick={handleLoadMore}
              disabled={isLoadingMore}
              className="w-full py-4 text-sm text-text-secondary hover:text-accent disabled:opacity-50 border-t border-accent-dim/20 transition-colors uppercase tracking-widest"
            >
              {isLoadingMore ? "Loading..." : "Load More"}
            </Button>
          )}
        </div>
      ) : (
        <InnerBox className="text-center py-16">
          <MessageSquare size={48} strokeWidth={1} className="mx-auto mb-4 text-accent-dim opacity-50" />
          <p className="text-lg text-text-secondary mb-2">The Guestbook is Empty</p>
          {currentUser && <p className="text-sm text-text-tertiary">Be the first to sign this guestbook.</p>}
        </InnerBox>
      )}
    </>
  );
}
