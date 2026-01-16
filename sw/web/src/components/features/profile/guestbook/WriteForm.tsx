/*
  파일명: /components/features/profile/guestbook/WriteForm.tsx
  기능: 방명록 작성 폼
  책임: 방명록 메시지 입력 및 제출 처리
*/ // ------------------------------
"use client";

import { useState } from "react";
import { Card, Button } from "@/components/ui";
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
    <Card className="mb-6 card-classical bg-bg-card/50 backdrop-blur-sm border-accent-dim/30">
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Please leave your message..."
        className="w-full bg-transparent border-none text-sm resize-none focus:outline-none placeholder:text-text-tertiary placeholder:italic"
        rows={3}
        maxLength={500}
      />
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-accent-dim/20">
        <label className="flex items-center gap-2 text-xs text-text-secondary cursor-pointer hover:text-accent transition-colors">
          <input
            type="checkbox"
            checked={isPrivate}
            onChange={(e) => handleTogglePrivate(e.target.checked)}
            className="accent-accent"
          />
          <Lock size={12} />
          <span className="uppercase tracking-wider font-serif">Secret Message</span>
        </label>
        <div className="flex items-center gap-3">
          <span className="text-xs font-cinzel text-text-tertiary">{content.length}/500</span>
          <Button
            unstyled
            onClick={handleSubmit}
            disabled={!content.trim() || isSubmitting}
            className="px-4 py-1.5 bg-accent text-bg-main text-xs uppercase tracking-wider rounded-sm hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 shadow-sm transition-all duration-300"
          >
            <Send size={12} />
            Sign
          </Button>
        </div>
      </div>
    </Card>
  );
}
