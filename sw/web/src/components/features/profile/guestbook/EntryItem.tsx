/*
  파일명: /components/features/profile/guestbook/EntryItem.tsx
  기능: 방명록 항목 컴포넌트
  책임: 개별 방명록 항목 표시, 수정, 삭제 처리
*/ // ------------------------------
"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { useTranslations, useLocale } from "next-intl";
import { Button } from "@/components/ui";
import Portal from "@/components/ui/Portal";
import { Lock, MoreVertical, Trash2, Edit3 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";
import { enUS } from "date-fns/locale";
import type { EntryItemProps } from "./types";
import { Z_INDEX } from "@/constants/zIndex";
import { ModerationMenu } from "@/components/features/moderation";
import { ENUM_REPORT_TARGET_TYPE } from "@/constants/moderation";

function cn(...classes: (string | undefined | null | false)[]) {
  return classes.filter(Boolean).join(" ");
}

const DATE_LOCALES = { ko, en: enUS } as const;

export default function EntryItem({ entry, currentUserId, isOwner, onDelete, onUpdate, variant = "default" }: EntryItemProps) {
  const t = useTranslations("profileSection.guestbook");
  const locale = useLocale();
  const [showMenu, setShowMenu] = useState(false);
  const [menuPos, setMenuPos] = useState<{ top: number; right: number } | null>(null);
  const moreButtonRef = useRef<HTMLDivElement>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(entry.content);
  const [editIsPrivate, setEditIsPrivate] = useState(entry.is_private);

  const isAuthor = !!currentUserId && currentUserId === entry.author_id;
  const canDelete = isOwner || isAuthor;
  const canEdit = isAuthor;
  const isCeleb = variant === "celeb";

  // 비밀글이고 주인/작성자가 아니면 내용 숨김
  const isHiddenPrivate = entry.is_private && !isOwner && !isAuthor;

  const handleSaveEdit = async () => {
    if (editContent.trim() === entry.content && editIsPrivate === entry.is_private) {
      setIsEditing(false);
      return;
    }
    await onUpdate(entry.id, editContent, isCeleb ? false : editIsPrivate);
    setIsEditing(false);
  };

  return (
    <div className={cn(
      "group relative",
      isCeleb
        ? "rounded-md border border-white/[0.07] bg-black/[0.12] p-4 sm:p-5"
        : "py-3 first:pt-0 last:pb-0",
    )}>
      <div className="relative z-10 flex items-start gap-3.5 sm:gap-4">
        {/* 아바타 */}
        <div className={cn("relative mt-0.5 flex-shrink-0", isCeleb ? "h-9 w-9" : "h-7 w-7")}>
          <div className="relative w-full h-full rounded-full border border-white/10 bg-bg-secondary overflow-hidden">
            {entry.author.avatar_url ? (
              <Image
                src={entry.author.avatar_url}
                alt={entry.author.nickname ?? "Unknown"}
                fill
                unoptimized
                className="object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-[10px] font-sans">
                {(entry.author.nickname ?? "?")[0]}
              </div>
            )}
          </div>
        </div>

        {/* 내용 영역 */}
        <div className="flex-1 min-w-0">
          <div className={cn("flex items-center gap-2", isCeleb ? "mb-1" : "mb-0.5")}>
            <span className={cn("font-sans font-medium text-text-primary", isCeleb ? "text-[13px]" : "text-xs")}>
              {entry.author.nickname ?? "Anonymous"}
            </span>
            <span className={cn("font-mono text-text-secondary/60", isCeleb ? "text-[11px]" : "text-[10px]")}>
              {formatDistanceToNow(new Date(entry.created_at), { addSuffix: true, locale: DATE_LOCALES[locale as keyof typeof DATE_LOCALES] ?? ko })}
            </span>
            {entry.is_private && (
              <Lock size={9} className="text-accent/40" />
            )}
          </div>

          {isEditing ? (
            <div className="space-y-2 mt-1 p-3 bg-white/[0.02] rounded-lg">
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="w-full bg-transparent border border-white/10 rounded p-2 text-text-primary text-sm font-sans focus:border-accent/30 focus:ring-0 resize-none leading-relaxed"
                rows={3}
                maxLength={500}
              />
              <div className="flex items-center justify-between">
                {!isCeleb ? (
                  <label className="flex items-center gap-1.5 text-[11px] cursor-pointer hover:text-accent">
                    <input
                      type="checkbox"
                      checked={editIsPrivate}
                      onChange={(e) => setEditIsPrivate(e.target.checked)}
                      className="accent-accent"
                    />
                    {t("private")}
                  </label>
                ) : <span />}
                <div className="flex gap-3">
                  <button
                    onClick={() => setIsEditing(false)}
                    className="text-[11px] hover:text-text-primary"
                  >
                    {t("cancel")}
                  </button>
                  <button
                    onClick={handleSaveEdit}
                    className="text-[11px] text-accent hover:text-accent-hover font-medium"
                  >
                    {t("save")}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <p className={`whitespace-pre-wrap font-sans ${isCeleb ? "text-sm leading-7" : "text-[13px] leading-relaxed"} ${isHiddenPrivate ? "" : "text-text-secondary/85"}`}>
              {isHiddenPrivate ? t("privateMessage") : entry.content}
            </p>
          )}
        </div>

        {/* 신고·차단 - 남이 남긴 글에만 뜬다 */}
        {!isEditing && !isHiddenPrivate && (
          <ModerationMenu
            className="ml-1"
            targetType={ENUM_REPORT_TARGET_TYPE.GUESTBOOK}
            targetId={entry.id}
            authorId={entry.author_id}
            authorNickname={entry.author.nickname ?? ""}
            viewerId={currentUserId ?? null}
            targetLabel={entry.content}
          />
        )}

        {/* 메뉴 - 우측 상단 배치 */}
        {(canDelete || canEdit) && !isEditing && (
          <div className={cn("relative ml-1", isCeleb ? "opacity-60 hover:opacity-100" : "opacity-0 group-hover:opacity-100")} ref={moreButtonRef}>
            <Button
              unstyled
              onClick={() => {
                if (!showMenu && moreButtonRef.current) {
                  const rect = moreButtonRef.current.getBoundingClientRect();
                  setMenuPos({ top: rect.bottom, right: window.innerWidth - rect.right });
                }
                setShowMenu(!showMenu);
              }}
              className="rounded p-1 hover:bg-white/5 hover:text-accent"
            >
              <MoreVertical size={14} />
            </Button>
            {showMenu && menuPos && (
              <Portal>
                <div className="fixed inset-0" style={{ zIndex: Z_INDEX.dropdown - 1 }} onClick={() => setShowMenu(false)} />
                <div className="fixed bg-bg-card border border-white/10 rounded-xl shadow-2xl py-2 min-w-[100px] animate-in fade-in zoom-in-95 duration-200"
                  style={{
                    zIndex: Z_INDEX.dropdown,
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
                      className="flex w-full items-center gap-3 px-4 py-2 text-start text-xs font-bold text-text-secondary hover:bg-white/5 hover:text-accent"
                    >
                      <Edit3 size={12} className="opacity-60" />
                      {t("edit")}
                    </Button>
                  )}
                  {canDelete && (
                    <Button
                      unstyled
                      onClick={() => {
                        onDelete(entry.id);
                        setShowMenu(false);
                      }}
                      className="flex w-full items-center gap-3 px-4 py-2 text-start text-xs font-bold text-red-500/70 hover:bg-red-500/5 hover:text-red-500"
                    >
                      <Trash2 size={12} className="opacity-60" />
                      {t("delete")}
                    </Button>
                  )}
                </div>
              </Portal>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
