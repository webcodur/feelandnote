/*
  파일명: /components/features/content/ContentRecordButton.tsx
  기능: 작품 기록 버튼
  책임: 상단 공유 버튼 옆에서 기록 추가·삭제를 토글한다.
        짧은 감상 반응은 「내 리뷰」 섹션이 쥔다. 비로그인은 로그인 화면으로 보낸다.
*/ // ------------------------------
"use client";

import AuthLink from "@/components/shared/AuthLink";
import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Bookmark, BookmarkCheck, Loader2 } from "lucide-react";
import { addContent } from "@/actions/contents/addContent";
import { removeContent } from "@/actions/contents/removeContent";
import { updateStatus } from "@/actions/contents/updateStatus";
import { STATUS_OPTIONS } from "@feelandnote/shared/constants/statuses";
import type { ContentStatus } from "@/types/database";
import type { ContentDetailData } from "@/actions/contents/getContentDetail";
import { cn } from "@/lib/utils";
import Mascot from '@/components/shared/mascots/Mascot';
import mascotStyles from '@/components/shared/mascots/Mascot.module.css';

const RECORD_BUTTON_CLASS =
  "inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-md border px-3.5 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 disabled:cursor-wait";
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
  const tStatus = useTranslations("status");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [addedRecordId, setAddedRecordId] = useState<string | null>(null);

  // 로그인 여부를 알기 전에는 그리지 않는다 — 로그인 사용자에게 로그인 링크가 번쩍이지 않게
  if (!isAuthResolved && !isLoggedIn) return null;

  if (!isLoggedIn) {
    return (
      <AuthLink href="/login" aria-label={t("loginPrompt")} title={t("loginPrompt")} className={cn(RECORD_BUTTON_CLASS, IDLE_CLASS)}>
        <Bookmark size={14} aria-hidden />
        <span>{t("addRecord")}</span>
      </AuthLink>
    );
  }

  const handleAdd = () => {
    startTransition(async () => {
      try {
        const result = await addContent({
          id: content.id,
          type: content.type,
          title: content.title,
          creator: content.creator,
          thumbnailUrl: content.thumbnail,
          description: content.description,
          releaseDate: content.releaseDate,
          metadata: content.metadata ?? undefined,
          externalSource: content.externalSource,
        });
        if (!result.success) {
          setError(tError(result.error));
          return;
        }
        onRecordChange({
          id: result.data.userContentId,
          status: result.data.existingRecord?.status ?? "WANT",
          rating: null,
          review: null,
          isSpoiler: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
        setError(null);
        setAddedRecordId(result.data.userContentId);
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
        setAddedRecordId(null);
        setError(null);
      } catch (err) {
        console.error("[ContentRecordButton:delete]", err);
      }
    });
  };

  const label = userRecord ? t("recorded") : t("addRecord");
  const RecordIcon = userRecord ? BookmarkCheck : Bookmark;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {error && (
        <span role="alert" className="whitespace-nowrap text-xs text-red-400">
          {error}
        </span>
      )}
      {userRecord && (
        <div role="group" aria-label={t("consumptionStatus")} className="inline-flex gap-1">
          {STATUS_OPTIONS.map(option => (
            <button key={option.value} type="button" disabled={isPending}
              aria-pressed={userRecord.status === option.value}
              className={cn(RECORD_BUTTON_CLASS, userRecord.status === option.value ? RECORDED_CLASS : IDLE_CLASS)}
              onClick={() => {
                const record = userRecord;
                const status: ContentStatus = option.value;
                if (record.status === status) return;
                startTransition(async () => {
                  try {
                    const result = await updateStatus({ userContentId: record.id, status });
                    if (!result.success) { setError(tError(result.error)); return; }
                    onRecordChange({ ...record, status });
                    setError(null);
                  } catch { setError(t("statusUpdateFailed")); }
                });
              }}>
              {tStatus(option.value === "FINISHED" ? "finished" : "want")}
            </button>
          ))}
        </div>
      )}
      <button
        type="button"
        onClick={userRecord ? handleDelete : handleAdd}
        disabled={isPending}
        aria-pressed={Boolean(userRecord)}
        aria-label={label}
        title={label}
        className={cn(RECORD_BUTTON_CLASS, userRecord ? RECORDED_CLASS : IDLE_CLASS)}
      >
        <span className={mascotStyles.recordIcon}>
          {isPending ? <Loader2 size={14} className="animate-spin" aria-hidden />
            : addedRecordId && addedRecordId === userRecord?.id
              ? <Mascot kind="flame" size={24} className={mascotStyles.kindled} />
              : <RecordIcon size={14} aria-hidden />}
        </span>
        <span>{label}</span>
      </button>
    </div>
  );
}
