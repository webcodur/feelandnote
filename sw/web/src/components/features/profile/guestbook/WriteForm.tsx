/*
  파일명: /components/features/profile/guestbook/WriteForm.tsx
  기능: 방명록 작성 폼
  책임: 방명록 메시지 입력 및 제출 처리
*/ // ------------------------------
"use client";

import { useState } from "react";
import { Button, InnerBox } from "@/components/ui";
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
    <InnerBox className="mb-8 overflow-hidden group">
      {/* Decorative top header for Altar style */}
      <div className="h-1.5 w-full bg-gradient-to-r from-transparent via-accent/30 to-transparent mb-2" />
      
      <div className="px-1 py-1">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Leave your immortal words upon this stone..."
          className="w-full bg-black/20 p-4 border border-accent-dim/10 text-sm sm:text-base font-serif leading-relaxed resize-none focus:outline-none focus:border-accent/40 placeholder:text-text-tertiary placeholder:italic transition-colors"
          rows={4}
          maxLength={500}
        />
      </div>

      <div className="flex items-center justify-between mt-4 p-2 sm:px-4 sm:pb-4">
        <label className="flex items-center gap-2.5 text-[10px] sm:text-xs text-text-secondary cursor-pointer hover:text-accent transition-all group/label">
          <div className={`w-3.5 h-3.5 border border-accent/40 rounded-sm flex items-center justify-center transition-all ${isPrivate ? 'bg-accent border-accent' : 'bg-transparent'}`}>
            <input
              type="checkbox"
              checked={isPrivate}
              onChange={(e) => handleTogglePrivate(e.target.checked)}
              className="sr-only"
            />
            {isPrivate && <Lock size={10} className="text-bg-main" strokeWidth={3} />}
          </div>
          <span className="uppercase tracking-[0.15em] font-serif font-black opacity-60 group-hover/label:opacity-100 italic">Secret Vow</span>
        </label>

        <div className="flex items-center gap-4">
          <span className="text-[10px] font-cinzel text-accent/40 tracking-widest">{content.length} <span className="opacity-40">/</span> 500</span>
          
          <Button
            unstyled
            onClick={handleSubmit}
            disabled={!content.trim() || isSubmitting}
            className="group/btn relative px-6 py-2 bg-bg-card border border-accent text-accent text-[11px] font-serif font-black uppercase tracking-[0.2em] overflow-hidden transition-all duration-500 hover:bg-accent hover:text-bg-main disabled:opacity-30 disabled:grayscale"
          >
            {/* Corner Bracket Accents on Button */}
            <div className="absolute top-0 left-0 w-1.5 h-1.5 border-t border-s border-accent group-hover/btn:border-bg-main" />
            <div className="absolute bottom-0 right-0 w-1.5 h-1.5 border-b border-e border-accent group-hover/btn:border-bg-main" />
            
            <span className="relative z-10 flex items-center gap-2">
              <Send size={12} className={isSubmitting ? "animate-pulse" : "group-hover/btn:translate-x-1 transition-transform"} />
              {isSubmitting ? "Carving..." : "Inscribe"}
            </span>
          </Button>
        </div>
      </div>
    </InnerBox>
  );
}
