/*
  파일명: /components/features/profile/guestbook/WriteForm.tsx
  기능: 방명록 작성 폼
  책임: 방명록 메시지 입력 및 제출 처리
*/ // ------------------------------
"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui";
import { Lock, Send } from "lucide-react";
import type { GuestbookEntryWithAuthor } from "@/types/database";
import { createGuestbookEntry } from "@/actions/guestbook";
import type { WriteFormProps } from "./types";

export default function WriteForm({ profileId, onSubmit }: WriteFormProps) {
  const t = useTranslations("profileSection.guestbook");
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
        alert(result.message);
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

  return (
    <div className="mb-8 bg-white/[0.02] rounded-lg overflow-hidden">
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder={t("placeholder")}
        className="w-full bg-transparent border-none resize-none focus:ring-0 text-text-primary placeholder:text-text-tertiary/30 min-h-[72px] font-sans text-sm leading-relaxed px-4 pt-4 pb-2"
        rows={3}
        maxLength={500}
      />

      <div className="flex items-center justify-between px-4 pb-3">
        <button
          onClick={() => handleTogglePrivate(!isPrivate)}
          className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] transition-colors ${
            isPrivate
              ? "text-accent bg-accent/10"
              : "text-text-tertiary/50 hover:text-text-secondary"
          }`}
        >
          <Lock size={10} />
          {isPrivate ? t("private") : t("public")}
        </button>

        <div className="flex items-center gap-3">
          <span className={`text-[10px] font-mono tabular-nums ${content.length > 450 ? "text-red-400" : "text-text-tertiary/30"}`}>
            {content.length}/500
          </span>
          <Button
            unstyled
            onClick={handleSubmit}
            disabled={!content.trim() || isSubmitting}
            className="px-4 py-1.5 bg-accent/90 text-bg-main text-[11px] font-bold rounded transition-all hover:bg-accent disabled:opacity-20 disabled:hover:bg-accent/90"
          >
            <span className="flex items-center gap-1.5">
              <Send size={10} />
              {isSubmitting ? t("submitting") : t("submit")}
            </span>
          </Button>
        </div>
      </div>
    </div>
  );
}
