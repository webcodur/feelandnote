/*
  파일명: components/features/game/shared/DialogueSubtitle.tsx
  기능: 대사 자막 스낵바
  책임: 대사 표시 시 텍스트를 3초간 표시한다. 새 대사가 오면 즉시 교체하고 타이머를 리셋한다.
        상단 핸들바를 드래그하면 자유 위치 이동 + localStorage 기억.
*/
"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, Volume2, VolumeOff, GripVertical, RotateCcw } from "lucide-react";
import { VoiceBadge } from "@/components/ui";
import { useLocale } from "next-intl";
import type { DialogueSubtitleData, DialogueLabel } from "./hooks/useDialogue";
import { DEFAULT_DIALOGUE_COORDS, type DialogueCoords } from "@/hooks/useDialoguePosition";

const BASE_DURATION = 3000;
const PER_CHAR_MS = 80;
const MAX_DURATION = 6000;

/** 텍스트 길이에 따라 표시 시간을 동적 산출한다 */
function calcDuration(text: string): number {
  const extra = Math.max(0, text.length - 15) * PER_CHAR_MS;
  return Math.min(BASE_DURATION + extra, MAX_DURATION);
}

interface Props {
  subtitle: DialogueSubtitleData | null;
  voiceMuted?: boolean;
  onToggleMute?: () => void;
  coords?: DialogueCoords;
  onSaveCoords?: (c: DialogueCoords) => void;
}

export default function DialogueSubtitle({ subtitle, voiceMuted, onToggleMute, coords = DEFAULT_DIALOGUE_COORDS, onSaveCoords }: Props) {
  const locale = useLocale();
  const [current, setCurrent] = useState<DialogueSubtitleData | null>(null);
  const [visible, setVisible] = useState(false);
  const [isRepeat, setIsRepeat] = useState(false);
  const [fading, setFading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fadeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevTextRef = useRef<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [audioPlaying, setAudioPlaying] = useState(false);
  const [audioProgress, setAudioProgress] = useState(0);
  const rafRef = useRef<number | null>(null);

  // 드래그 상태 — DOM 직접 조작으로 즉시 추적
  const [dragging, setDragging] = useState(false);
  const dragStartRef = useRef<{ px: number; py: number; top: number; left: number } | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const FADE_DURATION = 1000;

  const stopProgressLoop = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  const startProgressLoop = useCallback(() => {
    stopProgressLoop();
    let fadingStarted = false;
    const tick = () => {
      const a = audioRef.current;
      if (a && a.duration && !a.paused) {
        setAudioProgress(a.currentTime / a.duration);
        if (!fadingStarted && a.duration - a.currentTime <= 1) {
          fadingStarted = true;
          setFading(true);
        }
        rafRef.current = requestAnimationFrame(tick);
      }
    };
    rafRef.current = requestAnimationFrame(tick);
  }, [stopProgressLoop]);

  const stopAudio = useCallback(() => {
    stopProgressLoop();
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setAudioPlaying(false);
    setAudioProgress(0);
    setFading(false);
  }, [stopProgressLoop]);

  const clearFadeTimer = () => {
    if (fadeTimerRef.current) { clearTimeout(fadeTimerRef.current); fadeTimerRef.current = null; }
  };

  const startTimer = (duration: number) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    clearFadeTimer();
    setFading(false);
    if (duration > FADE_DURATION) {
      fadeTimerRef.current = setTimeout(() => setFading(true), duration - FADE_DURATION);
    }
    timerRef.current = setTimeout(() => {
      if (audioRef.current && !audioRef.current.paused) return;
      setVisible(false);
      setFading(false);
      timerRef.current = null;
    }, duration);
  };

  useEffect(() => {
    if (!subtitle) return;

    stopAudio();
    setIsRepeat(subtitle.text === prevTextRef.current);
    prevTextRef.current = subtitle.text;

    setCurrent(subtitle);
    setVisible(true);
    setFading(false);
    clearFadeTimer();

    if (subtitle.audioUrl && !voiceMuted) {
      const audio = new Audio(subtitle.audioUrl);
      audio.volume = 0.7;
      if (locale === "ko" && subtitle.voiceSpeed && subtitle.voiceSpeed !== 1.0) {
        audio.playbackRate = subtitle.voiceSpeed;
      }
      audio.addEventListener("ended", () => {
        stopProgressLoop();
        setAudioProgress(1);
        setAudioPlaying(false);
        audioRef.current = null;
        setVisible(false);
      }, { once: true });
      audio.addEventListener("error", () => {
        stopProgressLoop();
        setAudioPlaying(false);
        audioRef.current = null;
      }, { once: true });
      audio.play().catch(() => {});
      audioRef.current = audio;
      setAudioPlaying(true);
      startProgressLoop();
    } else {
      const duration = calcDuration(subtitle.text);
      startTimer(duration);
    }

    return () => {
      if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
      clearFadeTimer();
    };
  }, [subtitle]);

  useEffect(() => {
    if (voiceMuted && audioRef.current) {
      stopAudio();
      if (current) {
        const duration = calcDuration(current.text);
        startTimer(duration);
      }
    }
  }, [voiceMuted]);

  useEffect(() => {
    return () => { stopAudio(); };
  }, [stopAudio]);

  // ── 드래그 핸들 — DOM 직접 조작으로 지연 없이 추적 ──
  const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (!onSaveCoords) return;
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setDragging(true);
    dragStartRef.current = { px: e.clientX, py: e.clientY, top: coords.top, left: coords.left };
  }, [coords, onSaveCoords]);

  useEffect(() => {
    if (!dragging || !onSaveCoords) return;

    const onMove = (e: PointerEvent) => {
      const start = dragStartRef.current;
      const el = containerRef.current;
      if (!start || !el) return;
      const newTop = clamp(start.top + (e.clientY - start.py) / window.innerHeight * 100, 5, 95);
      const newLeft = clamp(start.left + (e.clientX - start.px) / window.innerWidth * 100, 10, 90);
      // DOM 직접 갱신 — setState 없이 즉시 반영
      el.style.top = `${newTop}%`;
      el.style.left = `${newLeft}%`;
    };

    const onUp = (e: PointerEvent) => {
      const start = dragStartRef.current;
      if (start) {
        const finalTop = clamp(start.top + (e.clientY - start.py) / window.innerHeight * 100, 5, 95);
        const finalLeft = clamp(start.left + (e.clientX - start.px) / window.innerWidth * 100, 10, 90);
        // 놓을 때만 state + localStorage 반영
        onSaveCoords({ top: finalTop, left: finalLeft });
      }
      setDragging(false);
      dragStartRef.current = null;
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [dragging, onSaveCoords]);

  const handleClose = () => {
    stopAudio();
    clearFadeTimer();
    setVisible(false);
    setFading(false);
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const duration = current ? calcDuration(current.text) : BASE_DURATION;
  const hasAudio = !!(current?.audioUrl);

  const LABEL_MAP: Record<DialogueLabel, { ko: string; en: string; color: string }> = {
    greeting: { ko: "인사", en: "Greeting", color: "text-amber-400/80" },
    roll_call: { ko: "호명", en: "Roll Call", color: "text-sky-400/80" },
    deploy: { ko: "출전", en: "Deploy", color: "text-emerald-400/80" },
    quotes: { ko: "명언", en: "Quotes", color: "text-purple-400/80" },
  };

  const content = (
    <div
      ref={containerRef}
      className="fixed z-[10100] w-[90%] md:w-[600px] max-w-2xl pointer-events-none"
      style={{ top: `${coords.top}%`, left: `${coords.left}%`, transform: "translate(-50%, -50%)" }}
    >
      <AnimatePresence>
        {visible && current && (
          <motion.div
            layout
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: fading ? 0 : 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
            transition={{
              layout: { type: "spring", stiffness: 400, damping: 30 },
              opacity: { duration: fading ? FADE_DURATION / 1000 : 0.3 },
            }}
            className={`pointer-events-auto relative bg-stone-900/90 border rounded-lg md:rounded-xl shadow-lg md:shadow-2xl backdrop-blur-md overflow-hidden ${isRepeat ? "border-amber-400/50 animate-dialogue-glow" : "border-amber-500/20"}`}
          >
            <div className="flex">
              {/* 드래그 핸들 — 좌측 변 */}
              {onSaveCoords && (
                <div
                  onPointerDown={handlePointerDown}
                  style={{ touchAction: "none" }}
                  className={`flex items-center justify-center px-1.5 cursor-grab active:cursor-grabbing select-none border-r transition-colors shrink-0 ${dragging ? "bg-amber-500/10 border-amber-500/30" : "bg-stone-800/40 border-transparent hover:bg-stone-700/40"}`}
                >
                  <GripVertical size={14} className="text-text-secondary" />
                </div>
              )}

            <div className="flex-1 p-3 md:p-5">
              <div className="flex items-start md:items-center gap-3 md:gap-5 pr-6">
                {/* 아바타 */}
                <div className="relative shrink-0">
                  <div className="w-9 h-9 md:w-16 md:h-16 rounded-full overflow-hidden bg-stone-700 border border-stone-600 shadow-inner">
                    {current.avatarUrl ? (
                      <img
                        src={current.avatarUrl}
                        alt={current.nickname ?? ""}
                        className="w-full h-full object-cover pointer-events-none"
                        draggable={false}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-text-secondary text-xs md:text-sm">
                        {current.nickname?.[0] ?? "?"}
                      </div>
                    )}
                  </div>
                  {hasAudio && audioPlaying && (
                    <div className="absolute -bottom-1 -right-1">
                      <VoiceBadge size="sm" pulse={current.key} />
                    </div>
                  )}
                </div>

                {/* 이름 + 대사 */}
                <div className="flex-1 min-w-0 flex flex-col justify-center">
                  {current.nickname && (
                    <span className="flex items-center gap-1.5 mb-0.5 md:mb-1">
                      <span className="text-[11px] md:text-sm font-bold text-amber-300 truncate opacity-90">
                        {current.nickname}
                      </span>
                      {current.label && LABEL_MAP[current.label] && (
                        <span className={`text-[9px] md:text-[11px] font-medium ${LABEL_MAP[current.label].color} shrink-0`}>
                          {locale === "en" ? LABEL_MAP[current.label].en : LABEL_MAP[current.label].ko}
                        </span>
                      )}
                    </span>
                  )}
                  <p className="text-sm md:text-lg text-stone-100 leading-relaxed font-medium">
                    {current.text}
                  </p>
                </div>
              </div>
            </div>
            </div>{/* /flex */}

            {/* 위치 복귀 + 뮤트 + 닫기 버튼 */}
            <div className="absolute top-2 md:top-3 right-2 md:right-3 flex items-center gap-0.5 z-10">
              {onSaveCoords && (coords.top !== DEFAULT_DIALOGUE_COORDS.top || coords.left !== DEFAULT_DIALOGUE_COORDS.left) && (
                <button
                  onClick={() => {
                    onSaveCoords(DEFAULT_DIALOGUE_COORDS);
                    if (containerRef.current) {
                      containerRef.current.style.top = `${DEFAULT_DIALOGUE_COORDS.top}%`;
                      containerRef.current.style.left = `${DEFAULT_DIALOGUE_COORDS.left}%`;
                    }
                  }}
                  className="p-1 rounded-full text-text-secondary hover:text-white hover:bg-white/10 transition-colors"
                  aria-label="기본 위치로 복귀"
                >
                  <RotateCcw size={14} className="md:w-3.5 md:h-3.5 w-3 h-3" />
                </button>
              )}
              {onToggleMute && (
                <button
                  onClick={onToggleMute}
                  className="p-1 rounded-full text-text-secondary hover:text-white hover:bg-white/10 transition-colors"
                  aria-label={voiceMuted ? "음성 켜기" : "음성 끄기"}
                >
                  {voiceMuted
                    ? <VolumeOff size={16} className="md:w-4 md:h-4 w-3.5 h-3.5" />
                    : <Volume2 size={16} className="md:w-4 md:h-4 w-3.5 h-3.5" />
                  }
                </button>
              )}
              <button
                onClick={handleClose}
                className="p-1 rounded-full text-text-secondary hover:text-white hover:bg-white/10 transition-colors"
                aria-label="닫기"
              >
                <X size={16} className="md:w-4 md:h-4 w-3.5 h-3.5" />
              </button>
            </div>

            {/* 우측 모서리 세로 타이머 */}
            <div className="absolute top-0 right-0 w-1 md:w-1.5 h-full bg-stone-700/50">
              {hasAudio ? (
                <div
                  className="w-full bg-emerald-400/70 rounded-full origin-top transition-[height] duration-100 ease-linear"
                  style={{ height: `${audioProgress * 100}%` }}
                />
              ) : (
                <div
                  key={current.key + (visible ? '-visible' : '')}
                  className="w-full bg-amber-500/50 rounded-full origin-top"
                  style={{
                    animation: timerRef.current ? `dialogTimerVertical ${duration}ms linear forwards` : 'none',
                    height: timerRef.current ? "100%" : "0%"
                  }}
                />
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  if (typeof document !== "undefined") {
    return createPortal(content, document.body);
  }
  return content;
}
