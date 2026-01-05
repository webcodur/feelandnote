"use client";

import { useState, useCallback } from "react";
import { Card } from "@/components/ui";
import { Lock, MoreVertical, Trash2, Edit3, Send, MessageSquare } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";
import type { GuestbookEntryWithAuthor, Profile } from "@/types/database";
import {
  createGuestbookEntry,
  updateGuestbookEntry,
  deleteGuestbookEntry,
  getGuestbookEntries,
} from "@/actions/guestbook";

// #region Types
interface GuestbookContentProps {
  profileId: string;
  currentUser: Profile | null;
  isOwner: boolean;
  initialEntries: GuestbookEntryWithAuthor[];
  initialTotal: number;
}
// #endregion

// #region EntryItem
function EntryItem({
  entry,
  currentUser,
  isOwner,
  onDelete,
  onUpdate,
}: {
  entry: GuestbookEntryWithAuthor;
  currentUser: Profile | null;
  isOwner: boolean;
  onDelete: (id: string) => void;
  onUpdate: (id: string, content: string, isPrivate: boolean) => void;
}) {
  const [showMenu, setShowMenu] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(entry.content);
  const [editIsPrivate, setEditIsPrivate] = useState(entry.is_private);

  const isAuthor = currentUser?.id === entry.author_id;
  const canDelete = isOwner || isAuthor;
  const canEdit = isAuthor;

  // 비밀글이고 주인/작성자가 아니면 내용 숨김
  const isHiddenPrivate = entry.is_private && !isOwner && !isAuthor;

  const handleSaveEdit = async () => {
    if (editContent.trim() === entry.content && editIsPrivate === entry.is_private) {
      setIsEditing(false);
      return;
    }
    await onUpdate(entry.id, editContent, editIsPrivate);
    setIsEditing(false);
  };

  return (
    <Card className="relative">
      <div className="flex items-start gap-3">
        {/* 아바타 */}
        <div className="w-9 h-9 rounded-full bg-bg-secondary overflow-hidden flex-shrink-0">
          {entry.author.avatar_url ? (
            <img
              src={entry.author.avatar_url}
              alt={entry.author.nickname ?? "사용자"}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-text-secondary text-sm">
              {(entry.author.nickname ?? "?")[0]}
            </div>
          )}
        </div>

        {/* 내용 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium text-sm">{entry.author.nickname ?? "익명"}</span>
            {entry.is_private && (
              <Lock size={12} className="text-text-tertiary" />
            )}
            <span className="text-xs text-text-tertiary">
              {formatDistanceToNow(new Date(entry.created_at), { addSuffix: true, locale: ko })}
            </span>
          </div>

          {isEditing ? (
            <div className="space-y-2">
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="w-full bg-bg-secondary border border-border rounded-lg p-2 text-sm resize-none focus:outline-none focus:border-accent"
                rows={3}
                maxLength={500}
              />
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-1.5 text-xs text-text-secondary cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editIsPrivate}
                    onChange={(e) => setEditIsPrivate(e.target.checked)}
                    className="accent-accent"
                  />
                  비밀글
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setIsEditing(false)}
                    className="px-3 py-1 text-xs text-text-secondary hover:text-text-primary"
                  >
                    취소
                  </button>
                  <button
                    onClick={handleSaveEdit}
                    className="px-3 py-1 text-xs bg-accent text-white rounded-lg hover:bg-accent-hover"
                  >
                    저장
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-text-secondary whitespace-pre-wrap break-words">
              {isHiddenPrivate ? "비밀글입니다" : entry.content}
            </p>
          )}
        </div>

        {/* 메뉴 */}
        {(canDelete || canEdit) && !isEditing && (
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-1 text-text-tertiary hover:text-text-primary rounded"
            >
              <MoreVertical size={16} />
            </button>
            {showMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
                <div className="absolute end-0 top-6 z-20 bg-bg-card border border-border rounded-lg shadow-xl py-1 min-w-[100px]">
                  {canEdit && (
                    <button
                      onClick={() => {
                        setIsEditing(true);
                        setShowMenu(false);
                      }}
                      className="w-full px-3 py-1.5 text-start text-sm hover:bg-white/5 flex items-center gap-2"
                    >
                      <Edit3 size={14} />
                      수정
                    </button>
                  )}
                  {canDelete && (
                    <button
                      onClick={() => {
                        onDelete(entry.id);
                        setShowMenu(false);
                      }}
                      className="w-full px-3 py-1.5 text-start text-sm text-red-400 hover:bg-white/5 flex items-center gap-2"
                    >
                      <Trash2 size={14} />
                      삭제
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
// #endregion

// #region WriteForm
function WriteForm({
  profileId,
  onSubmit,
}: {
  profileId: string;
  onSubmit: (entry: GuestbookEntryWithAuthor) => void;
}) {
  const [content, setContent] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!content.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const newEntry = await createGuestbookEntry({
        profileId,
        content,
        isPrivate,
      });
      onSubmit(newEntry as GuestbookEntryWithAuthor);
      setContent("");
      setIsPrivate(false);
    } catch (error) {
      console.error("Create guestbook entry error:", error);
      alert(error instanceof Error ? error.message : "작성에 실패했습니다");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="mb-4">
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="메시지를 남겨보세요..."
        className="w-full bg-transparent border-none text-sm resize-none focus:outline-none placeholder:text-text-tertiary"
        rows={3}
        maxLength={500}
      />
      <div className="flex items-center justify-between mt-2 pt-2 border-t border-border">
        <label className="flex items-center gap-1.5 text-xs text-text-secondary cursor-pointer">
          <input
            type="checkbox"
            checked={isPrivate}
            onChange={(e) => setIsPrivate(e.target.checked)}
            className="accent-accent"
          />
          <Lock size={12} />
          비밀글
        </label>
        <div className="flex items-center gap-2">
          <span className="text-xs text-text-tertiary">{content.length}/500</span>
          <button
            onClick={handleSubmit}
            disabled={!content.trim() || isSubmitting}
            className="px-3 py-1.5 bg-accent text-white text-sm rounded-lg hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
          >
            <Send size={14} />
            등록
          </button>
        </div>
      </div>
    </Card>
  );
}
// #endregion

// #region Main
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
          prev.map((e) =>
            e.id === id ? { ...e, content, is_private: isPrivate } : e
          )
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
      const result = await getGuestbookEntries({
        profileId,
        offset: entries.length,
      });
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
      {currentUser && (
        <WriteForm profileId={profileId} onSubmit={handleAddEntry} />
      )}

      {/* 방명록 목록 */}
      {entries.length > 0 ? (
        <div className="space-y-3">
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
            <button
              onClick={handleLoadMore}
              disabled={isLoadingMore}
              className="w-full py-2 text-sm text-text-secondary hover:text-text-primary disabled:opacity-50"
            >
              {isLoadingMore ? "불러오는 중..." : "더보기"}
            </button>
          )}
        </div>
      ) : (
        <Card className="text-center py-8">
          <MessageSquare size={32} className="mx-auto mb-2 text-text-tertiary" />
          <p className="text-sm text-text-secondary">아직 방명록이 없습니다</p>
          {currentUser && (
            <p className="text-xs text-text-tertiary mt-1">첫 번째 메시지를 남겨보세요!</p>
          )}
        </Card>
      )}
    </>
  );
}
// #endregion
