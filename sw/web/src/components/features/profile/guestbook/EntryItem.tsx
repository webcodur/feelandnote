/*
  파일명: /components/features/profile/guestbook/EntryItem.tsx
  기능: 방명록 항목 컴포넌트
  책임: 개별 방명록 항목 표시, 수정, 삭제 처리
*/ // ------------------------------
"use client";

import { useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui";
import ClassicalBox from "@/components/ui/ClassicalBox";
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
    <ClassicalBox className="relative border-accent-dim/20 hover:border-accent/40 bg-bg-card/30 transition-all duration-300">
      <div className="flex items-start gap-4">
        {/* 아바타 */}
        <div className="relative w-10 h-10 rounded-full bg-bg-secondary border-2 border-accent-dim/30 overflow-hidden flex-shrink-0">
          {entry.author.avatar_url ? (
            <Image
              src={entry.author.avatar_url}
              alt={entry.author.nickname ?? "Unknown"}
              fill
              unoptimized
              className="object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-accent-dim text-lg font-cinzel font-bold bg-gradient-to-br from-bg-secondary to-bg-main">
              {(entry.author.nickname ?? "?")[0]}
            </div>
          )}
        </div>

        {/* 내용 */}
        <div className="flex-1 min-w-0 pt-0.5">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-text-primary text-sm font-bold">{entry.author.nickname ?? "Anonymous"}</span>
            {entry.is_private && <Lock size={12} className="text-accent-dim" />}
            <span className="text-xs text-text-tertiary">
              {formatDistanceToNow(new Date(entry.created_at), { addSuffix: true, locale: ko })}
            </span>
          </div>

          {isEditing ? (
            <div className="space-y-3 p-3 bg-bg-main/50 border border-accent-dim/20 rounded-sm">
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="w-full bg-transparent border border-accent-dim/30 rounded-sm p-2 text-sm resize-none focus:outline-none focus:border-accent transition-colors"
                rows={3}
                maxLength={500}
              />
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-1.5 text-xs text-text-secondary cursor-pointer hover:text-accent font-serif">
                  <input
                    type="checkbox"
                    checked={editIsPrivate}
                    onChange={(e) => setEditIsPrivate(e.target.checked)}
                    className="accent-accent"
                  />
                  Secret Message
                </label>
                <div className="flex gap-2">
                  <Button
                    unstyled
                    onClick={() => setIsEditing(false)}
                    className="px-3 py-1 text-xs text-text-secondary hover:text-text-primary"
                  >
                    Cancel
                  </Button>
                  <Button
                    unstyled
                    onClick={handleSaveEdit}
                    className="px-3 py-1 text-xs bg-accent text-bg-main rounded-sm hover:bg-accent-hover"
                  >
                    Save
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-text-secondary whitespace-pre-wrap break-words leading-relaxed font-serif">
              {isHiddenPrivate ? "This is a secret message." : entry.content}
            </p>
          )}
        </div>

        {/* 메뉴 */}
        {(canDelete || canEdit) && !isEditing && (
          <div className="relative">
            <Button
              unstyled
              onClick={() => setShowMenu(!showMenu)}
              className="p-1 text-text-tertiary hover:text-accent rounded transition-colors"
            >
              <MoreVertical size={16} />
            </Button>
            {showMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
                <div className="absolute end-0 top-6 z-20 bg-bg-card border-2 border-accent-dim/30 rounded-sm shadow-xl py-1 min-w-[100px] animate-in fade-in zoom-in-95 duration-200">
                  {canEdit && (
                    <Button
                      unstyled
                      onClick={() => {
                        setIsEditing(true);
                        setShowMenu(false);
                      }}
                      className="w-full px-3 py-2 text-start text-xs text-text-secondary hover:bg-accent/10 hover:text-accent flex items-center gap-2 transition-colors"
                    >
                      <Edit3 size={12} />
                      Edit
                    </Button>
                  )}
                  {canDelete && (
                    <Button
                      unstyled
                      onClick={() => {
                        onDelete(entry.id);
                        setShowMenu(false);
                      }}
                      className="w-full px-3 py-2 text-start text-xs text-red-400 hover:bg-red-500/10 flex items-center gap-2 transition-colors"
                    >
                      <Trash2 size={12} />
                      Delete
                    </Button>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </ClassicalBox>
  );
}
