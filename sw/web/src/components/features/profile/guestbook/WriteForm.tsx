/*
  파일명: /components/features/profile/guestbook/WriteForm.tsx
  기능: 방명록 작성 폼
  책임: 방명록 메시지 입력 및 제출 처리
*/ // ------------------------------
"use client";

import { useState } from "react";
import { Card } from "@/components/ui";
import { Lock, Send } from "lucide-react";
import type { GuestbookEntryWithAuthor } from "@/types/database";
import { createGuestbookEntry } from "@/actions/guestbook";
import type { WriteFormProps } from "./types";
import { useSound } from "@/contexts/SoundContext";

export default function WriteForm({ profileId, onSubmit }: WriteFormProps) {
  const [content, setContent] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { playSound } = useSound();

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
        playSound("error");
        alert(result.message);
        return;
      }
      playSound("success");
      onSubmit(result.data as GuestbookEntryWithAuthor);
      setContent("");
      setIsPrivate(false);
    } catch (error) {
      playSound("error");
      console.error("Create guestbook entry error:", error);
      alert(error instanceof Error ? error.message : "작성에 실패했습니다");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTogglePrivate = (checked: boolean) => {
    playSound("toggle");
    setIsPrivate(checked);
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
            onChange={(e) => handleTogglePrivate(e.target.checked)}
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
