/*
  파일명: /components/features/content/ContentRecordButton.tsx
  기능: 작품 기록 아이콘
  책임: 상단 공유 버튼 옆에서 기록 추가·삭제를 한 아이콘으로 토글한다.
        별점·리뷰는 「내 리뷰」 섹션이 쥔다. 비로그인은 로그인 화면으로 보낸다.
*/ // ------------------------------
"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Bookmark, BookmarkCheck, Loader2 } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { addContent } from "@/actions/contents/addContent";
import { removeContent } from "@/actions/contents/removeContent";
import type { ContentDetailData } from "@/actions/contents/getContentDetail";
import { cn } from "@/lib/utils";

const ICON_BUTTON_CLASS =
  "inline-flex size-8 shrink-0 items-center justify-center rounded-md border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 disabled:cursor-wait";
const IDLE_CLASS =
  "border-white/12 text-text-secondary hover:border-accent/50 hover:bg-white/[0.04] hover:text-accent active:bg-white/[0.07]";
const RECORDED_CLASS =
  "border-accent/40 bg-accent/10 text-accent hover:border-accent hover:bg-accent/20 active:bg-accent/25";

interface ContentRecordButtonProps {
  content: ContentDetailData["content"];
  userRecord: ContentDetailData["userRecord"];
  isLoggedIn: boolean;
  isAuthResolved: boolean;
  onRecordChange: (record: ContentDetailData["userRecord"]) => void;
}

export default function ContentRecordButton({
  content,
  userRecord,
  isLoggedIn,
  isAuthResolved,
  onRecordChange,
}: ContentRecordButtonProps) {
  const t = useTranslations("contentDetail");
  const tError = useTranslations("actionErrors");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // 로그인 여부를 알기 전에는 그리지 않는다 — 로그인 사용자에게 로그인 링크가 번쩍이지 않게
  if (!isAuthResolved && !isLoggedIn) return null;

  if (!isLoggedIn) {
    return (
      <Link href="/login" aria-label={t("loginPrompt")} title={t("loginPrompt")} className={cn(ICON_BUTTON_CLASS, IDLE_CLASS)}>
        <Bookmark size={14} aria-hidden />
      </Link>
    );
  }

  const handleAdd = () => {
    startTransition(async () => {
      try {
        const result = await addContent({
          id: content.externalId,
          type: content.type,
          title: content.title,
          creator: content.creator,
          thumbnailUrl: content.thumbnail,
          description: content.description,
          releaseDate: content.releaseDate,
        });
        if (!result.success) {
          setError(tError(result.error));
          return;
        }
        onRecordChange({
          id: result.data.userContentId,
          status: "FINISHED",
          rating: null,
          review: null,
          isSpoiler: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
        setError(null);
      } catch (err) {
        console.error("[ContentRecordButton:add]", err);
        setError(t("addFailed"));
      }
    });
  };

  const handleDelete = () => {
    if (!userRecord || !confirm(t("deleteConfirm"))) return;
    startTransition(async () => {
      try {
        await removeContent(userRecord.id);
        onRecordChange(null);
        setError(null);
      } catch (err) {
        console.error("[ContentRecordButton:delete]", err);
      }
    });
  };

  const label = userRecord ? t("recorded") : t("addRecord");
  const RecordIcon = userRecord ? BookmarkCheck : Bookmark;

  return (
    <div className="flex items-center gap-2">
      {error && (
        <span role="alert" className="whitespace-nowrap text-xs text-red-400">
          {error}
        </span>
      )}
      <button
        type="button"
        onClick={userRecord ? handleDelete : handleAdd}
        disabled={isPending}
        aria-pressed={Boolean(userRecord)}
        aria-label={label}
        title={label}
        className={cn(ICON_BUTTON_CLASS, userRecord ? RECORDED_CLASS : IDLE_CLASS)}
      >
        {isPending ? <Loader2 size={14} className="animate-spin" aria-hidden /> : <RecordIcon size={14} aria-hidden />}
      </button>
    </div>
  );
}
