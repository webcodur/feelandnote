/*
  파일명: /components/features/profile/guestbook/WriteForm.tsx
  기능: 방명록 작성 폼
  책임: 방명록 메시지 입력 및 제출 처리
*/ // ------------------------------
"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui";
import { Feather, Lock, Send, Sparkles } from "lucide-react";
import type { GuestbookEntryWithAuthor } from "@/types/database";
import { createGuestbookEntry } from "@/actions/guestbook";
import type { WriteFormProps } from "./types";
import { UgcTermsNotice } from "@/components/features/moderation";

export default function WriteForm({
  profileId,
  onSubmit,
  entryCount = 0,
  isFiction = false,
  variant = "default",
}: WriteFormProps) {
  const t = useTranslations("profileSection.guestbook");
  const tFiction = useTranslations("profileSection.fictionGuestbook");
  const tError = useTranslations("actionErrors");
  const [content, setContent] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isCeleb = variant === "celeb";

  const handleSubmit = async () => {
    if (!content.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const result = await createGuestbookEntry({
        profileId,
        subjectKind: isCeleb ? "celeb" : "member",
        content,
        isPrivate: isCeleb ? false : isPrivate,
      });
      if (!result.success) {
        alert(tError(result.error));
        return;
      }
      onSubmit(result.data as GuestbookEntryWithAuthor);
      setContent("");
      setIsPrivate(false);
    } catch (error) {
      console.error("Create guestbook entry error:", error);
      alert(error instanceof Error ? error.message : t("writeFailed"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTogglePrivate = (checked: boolean) => {
    setIsPrivate(checked);
  };

  const tScope = isFiction ? tFiction : t;
  const invite = entryCount > 0
    ? tScope("inviteCount", { count: entryCount })
    : tScope("inviteFirst");

  const placeholder = isFiction ? tFiction("placeholder") : t("placeholder");

  return (
    <div className={isCeleb ? "mb-8" : "mb-8 space-y-2"}>
      {isCeleb ? (
        <div className="mb-4 flex items-center gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full border border-accent/25 bg-accent/[0.07] text-accent">
            <Feather size={15} strokeWidth={1.7} aria-hidden />
          </span>
          <p className="break-keep text-[13px] font-medium leading-snug text-text-primary/90">
            {invite}
          </p>
          <span
            aria-hidden
            className="h-px min-w-6 flex-1 bg-gradient-to-r from-accent/25 to-transparent"
          />
        </div>
      ) : (
        <p className="flex items-center gap-1.5 text-[11px] text-accent">
          <Sparkles size={11} strokeWidth={2} aria-hidden />
          {invite}
        </p>
      )}

      <form
        onSubmit={(event) => {
          event.preventDefault();
          void handleSubmit();
        }}
        className={`${
          isCeleb
            ? "rounded-md border border-white/[0.09] bg-black/[0.16] shadow-[0_18px_45px_rgba(0,0,0,0.16)] focus-within:border-accent/50 focus-within:bg-black/20"
            : "rounded-lg bg-white/[0.02]"
        } overflow-hidden`}
      >
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={placeholder}
          aria-label={placeholder}
          className={`${
            isCeleb
              ? "min-h-[132px] px-4 py-4 text-[14px] leading-7 placeholder:text-text-secondary/50 sm:min-h-[148px] sm:px-5 sm:py-5 sm:text-[15px]"
              : "min-h-[72px] px-4 pt-4 pb-2 text-sm leading-relaxed"
          } w-full resize-none border-none bg-transparent font-sans font-normal text-text-primary outline-none focus:ring-0`}
          rows={isCeleb ? 4 : 3}
          maxLength={500}
        />

        <div
          className={`${
            isCeleb
              ? "min-h-14 border-t border-white/[0.06] bg-white/[0.015] px-4 py-2.5 sm:px-5"
              : "px-4 pb-3"
          } flex items-center justify-between gap-4`}
        >
        {!isCeleb && (
          <button
            type="button"
            onClick={() => handleTogglePrivate(!isPrivate)}
            className={`flex h-7 items-center gap-1 rounded-sm px-2 text-[11px] ${
              isPrivate
                ? "text-accent bg-accent/10"
                : " hover:text-text-secondary"
            }`}
          >
            <Lock size={10} />
            {isPrivate ? t("private") : t("public")}
          </button>
        )}

        <div
          className={
            isCeleb
              ? "flex w-full items-center justify-between gap-4"
              : "flex items-center gap-3"
          }
        >
          <span
            className={`${isCeleb ? "text-[11px] text-text-secondary/55" : "text-[10px]"} font-mono tabular-nums ${content.length > 450 ? "text-red-400" : ""}`}
          >
            {content.length} / 500
          </span>
          <Button
            unstyled
            type="submit"
            disabled={!content.trim() || isSubmitting}
            className={`inline-flex items-center justify-center ${
              isCeleb
                ? "h-10 min-w-[104px] rounded-sm bg-accent/90 px-5 text-xs font-bold text-bg-main hover:bg-accent active:bg-accent-dim disabled:cursor-not-allowed disabled:bg-white/[0.04] disabled:text-text-secondary/30 disabled:opacity-100 disabled:hover:bg-white/[0.04]"
                : "h-8 rounded-sm bg-accent/90 px-4 text-[11px] font-bold text-bg-main hover:bg-accent disabled:opacity-20 disabled:hover:bg-accent/90"
            }`}
          >
            <span className="inline-flex items-center justify-center gap-1.5">
              <Send size={isCeleb ? 13 : 10} strokeWidth={2} aria-hidden />
              {isSubmitting ? t("submitting") : t("submit")}
            </span>
          </Button>
        </div>
        </div>
      </form>

      <UgcTermsNotice
        variant="compact"
        className={isCeleb ? "mt-3 px-0.5 text-[11px] sm:text-xs" : "px-1"}
      />
    </div>
  );
}
