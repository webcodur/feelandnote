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

export default function WriteForm({ profileId, onSubmit }: WriteFormProps) {
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
      alert(error instanceof Error ? error.message : "작성에 실패했습니다");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTogglePrivate = (checked: boolean) => {
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
          className="w-full bg-transparent border-none resize-none focus:ring-0 text-text-primary placeholder:text-text-tertiary/50 min-h-[100px] font-serif leading-relaxed p-4"
          rows={4}
          maxLength={500}
        />
      </div>

      <div className="flex items-center justify-between mt-3 px-2 pb-2">
        <button
          onClick={() => handleTogglePrivate(!isPrivate)}
          className={`
            flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all duration-300 group/toggle
            ${isPrivate 
              ? "bg-accent/10 border-accent/40 text-accent shadow-[0_0_15px_rgba(212,175,55,0.15)]" 
              : "bg-white/5 border-white/5 text-text-tertiary hover:bg-white/10 hover:text-text-secondary"}
          `}
        >
          <div className={`
            relative flex items-center justify-center transition-transform duration-300
            ${isPrivate ? "scale-110" : "scale-100 opacity-70"}
          `}>
             <Lock size={14} className={isPrivate ? "fill-accent stroke-accent" : "stroke-current"} />
          </div>
          <span className="text-[11px] font-bold uppercase tracking-wider font-sans pt-0.5">
            {isPrivate ? "Secret Vow" : "Public"}
          </span>
        </button>

        <div className="flex items-center gap-4">
          <span className={`text-[11px] font-mono tracking-wider transition-colors ${content.length > 450 ? "text-red-400 font-bold" : "text-text-tertiary"}`}>
            {content.length} <span className="opacity-30">/</span> 500
          </span>
          
          <Button
            unstyled
            onClick={handleSubmit}
            disabled={!content.trim() || isSubmitting}
            className="group/btn relative px-6 py-2 bg-stone-900 border border-stone-700 text-stone-300 text-[11px] font-bold uppercase tracking-[0.2em] overflow-hidden transition-all duration-300 hover:border-accent hover:text-accent disabled:opacity-30 disabled:grayscale"
          >
            <span className="relative z-10 flex items-center gap-2">
              <Send size={12} className={isSubmitting ? "animate-pulse" : "group-hover/btn:translate-x-0.5 transition-transform"} />
              {isSubmitting ? "Signing..." : "Sign"}
            </span>
          </Button>
        </div>
      </div>
    </InnerBox>
  );
}
