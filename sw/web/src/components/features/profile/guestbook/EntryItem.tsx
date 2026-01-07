/*
  파일명: /components/features/profile/guestbook/EntryItem.tsx
  기능: 방명록 항목 컴포넌트
  책임: 개별 방명록 항목 표시, 수정, 삭제 처리
*/ // ------------------------------
"use client";

import { useState } from "react";
import { Card } from "@/components/ui";
import { Lock, MoreVertical, Trash2, Edit3 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";
import type { EntryItemProps } from "./types";

export default function EntryItem({ entry, currentUser, isOwner, onDelete, onUpdate }: EntryItemProps) {
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
            {entry.is_private && <Lock size={12} className="text-text-tertiary" />}
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
