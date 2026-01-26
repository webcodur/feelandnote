/*
  파일명: /components/features/profile/guestbook/EntryItem.tsx
  기능: 방명록 항목 컴포넌트
  책임: 개별 방명록 항목 표시, 수정, 삭제 처리
*/ // ------------------------------
"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { Button, InnerBox } from "@/components/ui";
import Portal from "@/components/ui/Portal";
import { Lock, MoreVertical, Trash2, Edit3 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";
import type { EntryItemProps } from "./types";

function cn(...classes: (string | undefined | null | false)[]) {
  return classes.filter(Boolean).join(" ");
}

export default function EntryItem({ entry, currentUser, isOwner, onDelete, onUpdate }: EntryItemProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [menuPos, setMenuPos] = useState<{ top: number; right: number } | null>(null);
  const moreButtonRef = useRef<HTMLDivElement>(null);
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
    <InnerBox className="relative hover:border-stone-700/70 group overflow-hidden active:translate-y-0.5">
      {/* Texture overlay for stone fragment */}
      <div 
        className="absolute inset-0 opacity-5 pointer-events-none mix-blend-overlay"
        style={{ backgroundImage: `url("https://res.cloudinary.com/dchkzn79d/image/upload/v1737077656/noise_w9lq5j.png")` }}
      />
      
      <div className="flex items-start gap-4 p-4 sm:p-5 relative z-10">
        {/* 아바타 - 부조 스타일 프레임 */}
        <div className="relative w-12 h-12 flex-shrink-0 group/avatar">
          <div className="absolute inset-0 bg-accent rotate-45 scale-75 opacity-20 group-hover/avatar:scale-90 transition-transform duration-700" />
          <div className="relative w-full h-full rounded-sm border-2 border-accent/30 bg-bg-secondary overflow-hidden shadow-inner">
            {entry.author.avatar_url ? (
              <Image
                src={entry.author.avatar_url}
                alt={entry.author.nickname ?? "Unknown"}
                fill
                unoptimized
                className="object-cover opacity-80 group-hover/avatar:opacity-100 transition-opacity"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-accent/40 text-xl font-cinzel font-black uppercase">
                {(entry.author.nickname ?? "?")[0]}
              </div>
            )}
          </div>
          {/* Accent corners for avatar */}
          <div className="absolute -top-1 -left-1 w-2 h-2 border-t border-s border-accent/60" />
        </div>

        {/* 내용 영역 */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 mb-3">
            <span className="text-text-primary text-sm sm:text-base font-serif font-black tracking-tight group-hover:text-accent transition-colors">
              {entry.author.nickname ?? "Anonymous"}
            </span>
            <div className="flex items-center gap-2">
              <div className="h-3 w-px bg-white/10 hidden sm:block" />
              <span className="text-[10px] text-text-tertiary font-serif uppercase tracking-widest opacity-60">
                {formatDistanceToNow(new Date(entry.created_at), { addSuffix: true, locale: ko })}
              </span>
              {entry.is_private && (
                <div className="flex items-center gap-1 text-accent animate-pulse-slow">
                  <Lock size={10} strokeWidth={3} />
                  <span className="text-[9px] font-serif font-black uppercase tracking-tighter">Vow</span>
                </div>
              )}
            </div>
          </div>

          {isEditing ? (
            <div className="space-y-4 p-4 bg-black/40 border border-accent/20 rounded-sm">
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="w-full bg-transparent border-none text-sm font-serif leading-relaxed resize-none focus:outline-none placeholder:text-text-tertiary"
                rows={4}
                maxLength={500}
              />
              <div className="flex items-center justify-between pt-3 border-t border-white/5">
                <label className="flex items-center gap-2 text-[10px] text-text-secondary cursor-pointer hover:text-accent font-serif uppercase tracking-wider">
                  <input
                    type="checkbox"
                    checked={editIsPrivate}
                    onChange={(e) => setEditIsPrivate(e.target.checked)}
                    className="accent-accent"
                  />
                  Secure Inscription
                </label>
                <div className="flex gap-4">
                  <button
                    onClick={() => setIsEditing(false)}
                    className="text-[10px] font-serif font-black text-text-tertiary hover:text-text-primary uppercase tracking-widest"
                  >
                    Renounce
                  </button>
                  <button
                    onClick={handleSaveEdit}
                    className="text-[10px] font-serif font-black text-accent hover:text-accent-hover uppercase tracking-widest border-b border-accent"
                  >
                    Seal Word
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="relative">
              {/* Decorative quote marks */}
              <div className="absolute -top-1 -left-1 text-xl text-accent/10 font-serif leading-none transition-opacity group-hover:opacity-40 select-none">"</div>
              <p className={cn(
                "text-[13px] sm:text-[15px] leading-relaxed font-serif break-words",
                isHiddenPrivate ? "text-text-tertiary italic opacity-40" : "text-text-secondary"
              )}>
                {isHiddenPrivate ? "The words are sealed in stone..." : entry.content}
              </p>
            </div>
          )}
        </div>

        {/* 메뉴 - 우측 상단 배치 */}
        {(canDelete || canEdit) && !isEditing && (
          <div className="relative ml-2" ref={moreButtonRef}>
            <Button
              unstyled
              onClick={() => {
                if (!showMenu && moreButtonRef.current) {
                  const rect = moreButtonRef.current.getBoundingClientRect();
                  setMenuPos({ top: rect.bottom, right: window.innerWidth - rect.right });
                }
                setShowMenu(!showMenu);
              }}
              className="p-1.5 text-text-tertiary hover:text-accent hover:bg-white/5 rounded-sm transition-all"
            >
              <MoreVertical size={16} />
            </Button>
            {showMenu && menuPos && (
              <Portal>
                <div className="fixed inset-0 z-[9998]" onClick={() => setShowMenu(false)} />
                <div 
                  className="fixed z-[9999] bg-bg-card border-2 border-accent border-double rounded-sm shadow-2xl py-1 min-w-[120px] animate-in fade-in zoom-in-95 duration-200"
                  style={{ 
                    top: `${menuPos.top + 8}px`, 
                    right: `${menuPos.right}px` 
                  }}
                >
                  {canEdit && (
                    <Button
                      unstyled
                      onClick={() => {
                        setIsEditing(true);
                        setShowMenu(false);
                      }}
                      className="w-full px-4 py-2.5 text-start text-[10px] font-serif font-black uppercase tracking-widest text-text-secondary hover:bg-accent/10 hover:text-accent flex items-center gap-3 transition-colors"
                    >
                      <Edit3 size={12} className="opacity-60" />
                      Reforge
                    </Button>
                  )}
                  {canDelete && (
                    <Button
                      unstyled
                      onClick={() => {
                        onDelete(entry.id);
                        setShowMenu(false);
                      }}
                      className="w-full px-4 py-2.5 text-start text-[10px] font-serif font-black uppercase tracking-widest text-red-500/70 hover:bg-red-500/10 hover:text-red-500 flex items-center gap-3 transition-colors"
                    >
                      <Trash2 size={12} className="opacity-60" />
                      Shatter
                    </Button>
                  )}
                </div>
              </Portal>
            )}
          </div>
        )}
      </div>
    </InnerBox>
  );
}
