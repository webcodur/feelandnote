"use client";

import { Loader2, Volume2, Pause, Square } from "lucide-react";
import { useTextToSpeech, type TtsState } from "@/hooks/useTextToSpeech";
import { renderMarkdown } from "./MarkdownRenderer";
import { useTranslations } from "next-intl";

function TtsButton({ state, onPlay, onPause, onStop }: {
  state: TtsState;
  onPlay: () => void;
  onPause: () => void;
  onStop: () => void;
}) {
  const t = useTranslations("shared.accessibility");
  if (state === "loading") {
    return (
      <button
        type="button"
        disabled
        className="flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-[12px] text-white/40"
      >
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      </button>
    );
  }

  if (state === "playing" || state === "paused") {
    return (
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={state === "playing" ? onPause : onPlay}
          className="flex items-center justify-center rounded-full border border-[#d4af37]/25 bg-[#d4af37]/10 p-1.5 text-[#d4af37]/80 transition-colors hover:bg-[#d4af37]/20 hover:text-[#d4af37]"
          aria-label={state === "playing" ? t("pause") : t("play")}
        >
          {state === "playing" ? <Pause className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
        </button>
        <button
          type="button"
          onClick={onStop}
          className="flex items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.04] p-1.5 text-white/50 transition-colors hover:bg-white/[0.08] hover:text-white/70"
          aria-label={t("stop")}
        >
          <Square className="h-3 w-3" />
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onPlay}
      className="flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-[12px] text-white/50 transition-colors hover:border-[#d4af37]/25 hover:bg-[#d4af37]/10 hover:text-[#d4af37]/80"
      aria-label={t("readAloud")}
    >
      <Volume2 className="h-3.5 w-3.5" />
    </button>
  );
}

export default function StepContent({ contentMarkdown }: { contentMarkdown: string }) {
  const { state, activeSentenceIndex, sentences, play, pause, stop } = useTextToSpeech(contentMarkdown);

  const activeSentence = activeSentenceIndex >= 0 ? sentences[activeSentenceIndex] : null;

  return (
    <div>
      <div className="mb-3 flex items-center justify-end">
        <TtsButton state={state} onPlay={play} onPause={pause} onStop={stop} />
      </div>
      {renderMarkdown(contentMarkdown, activeSentence)}
    </div>
  );
}
