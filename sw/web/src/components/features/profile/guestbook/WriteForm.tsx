/*
  파일명: /components/features/profile/guestbook/WriteForm.tsx
  기능: 방명록 작성 폼
  책임: 방명록 메시지 입력 및 제출 처리
*/ // ------------------------------
"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui";
import { Lock, Send, Sparkles } from "lucide-react";
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

  const handleSubmit = async () => {
    if (!content.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const result = await createGuestbookEntry({
        profileId,
        content,
        isPrivate,
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
  const isCeleb = variant === "celeb";
  const invite = entryCount > 0
    ? tScope("inviteCount", { count: entryCount })
    : tScope("inviteFirst");

  return (
    <div className={`${isCeleb ? "mb-5" : "mb-8"} space-y-2`}>
      <p className="flex items-center gap-1.5 text-[11px] text-accent">
        <Sparkles size={11} strokeWidth={2} aria-hidden />
        {invite}
      </p>

      <div className={`${isCeleb ? "rounded-md border border-white/[0.07] bg-black/10 focus-within:border-accent/45" : "rounded-lg bg-white/[0.02]"} overflow-hidden`}>
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder={isFiction ? tFiction("placeholder") : t("placeholder")}
        className={`${isCeleb ? "min-h-[88px] px-3 pt-3 pb-2 sm:px-4 sm:pt-4" : "min-h-[72px] px-4 pt-4 pb-2"} w-full resize-none border-none bg-transparent font-sans text-sm leading-relaxed text-text-primary focus:ring-0`}
        rows={3}
        maxLength={500}
      />

      <div className={`${isCeleb ? "border-t border-white/[0.05] px-3 py-2 sm:px-4" : "px-4 pb-3"} flex items-center justify-between`}>
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

        <div className="flex items-center gap-3">
          <span className={`text-[10px] font-mono tabular-nums ${content.length > 450 ? "text-red-400" : ""}`}>
            {content.length}/500
          </span>
          <Button
            unstyled
            type="button"
            onClick={handleSubmit}
            disabled={!content.trim() || isSubmitting}
            className="h-8 rounded-sm bg-accent/90 px-4 text-[11px] font-bold text-bg-main hover:bg-accent disabled:opacity-20 disabled:hover:bg-accent/90"
          >
            <span className="flex items-center gap-1.5">
              <Send size={10} />
              {isSubmitting ? t("submitting") : t("submit")}
            </span>
          </Button>
        </div>
      </div>
      </div>

      <UgcTermsNotice variant="compact" className="px-1" />
    </div>
  );
}
