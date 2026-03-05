/*
  파일명: components/features/game/shared/DialogueSubtitle.tsx
  기능: 대사 자막 스낵바
  책임: 대사 표시 시 텍스트를 하단에 3초간 표시한다. 새 대사가 오면 즉시 교체하고 타이머를 리셋한다.
*/
"use client";

import { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import type { DialogueSubtitleData } from "./hooks/useDialogue";

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
}

export default function DialogueSubtitle({ subtitle }: Props) {
  const [current, setCurrent] = useState<DialogueSubtitleData | null>(null);
  const [visible, setVisible] = useState(false);
  const [isRepeat, setIsRepeat] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevTextRef = useRef<string | null>(null);

  const startTimer = (duration: number) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setVisible(false);
      timerRef.current = null;
    }, duration);
  };

  useEffect(() => {
    if (!subtitle) return;

    setIsRepeat(subtitle.text === prevTextRef.current);
    prevTextRef.current = subtitle.text;

    setCurrent(subtitle);
    setVisible(true);

    const duration = calcDuration(subtitle.text);
    startTimer(duration);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [subtitle]);

  const handleClose = () => {
    setVisible(false);
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const handleMouseEnter = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const handleMouseLeave = () => {
    if (visible && current) {
      startTimer(calcDuration(current.text));
    }
  };

  const duration = current ? calcDuration(current.text) : BASE_DURATION;

  const content = (
    <div className="fixed bottom-4 md:bottom-8 left-1/2 -translate-x-1/2 z-[10100] w-[90%] md:w-[600px] max-w-2xl pointer-events-none">
      <AnimatePresence>
        {visible && current && (
          <motion.div
            layout
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20, transition: { duration: 0.2 } }}
            transition={{ layout: { type: "spring", stiffness: 400, damping: 30 } }}
            drag="x"
            dragConstraints={{ left: -100, right: 100 }}
            dragElastic={0.7}
            onDragEnd={(e, info) => {
              // swipe left threshold
              if (info.offset.x < -40 || info.offset.x > 40) {
                handleClose();
                // To animate out immediately
                setCurrent(null);
              }
            }}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            className={`pointer-events-auto relative bg-stone-900/90 border rounded-lg md:rounded-xl shadow-lg md:shadow-2xl backdrop-blur-md p-3 md:p-5 overflow-hidden active:cursor-grabbing cursor-grab ${isRepeat ? "border-amber-400/50 animate-dialogue-glow" : "border-amber-500/20"}`}
          >
            <div className="flex items-start md:items-center gap-3 md:gap-5 pr-6">
              {/* 아바타 */}
              <div className="w-9 h-9 md:w-16 md:h-16 rounded-full overflow-hidden bg-stone-700 shrink-0 border border-stone-600 shadow-inner">
                {current.avatarUrl ? (
                  <img
                    src={current.avatarUrl}
                    alt={current.nickname ?? ""}
                    className="w-full h-full object-cover pointer-events-none"
                    draggable={false}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-stone-400 text-xs md:text-sm">
                    {current.nickname?.[0] ?? "?"}
                  </div>
                )}
              </div>

              {/* 이름 + 대사 */}
              <div className="flex-1 min-w-0 flex flex-col justify-center">
                {current.nickname && (
                  <span className="text-[11px] md:text-sm font-bold text-amber-300 block mb-0.5 md:mb-1 truncate opacity-90">
                    {current.nickname}
                  </span>
                )}
                <p className="text-sm md:text-lg text-stone-100 leading-relaxed font-medium">
                  {current.text}
                </p>
              </div>
            </div>

            {/* X 닫기 버튼 */}
            <button
              onClick={handleClose}
              className="absolute top-2 md:top-3 right-2 md:right-3 p-1 rounded-full text-stone-400 hover:text-white hover:bg-white/10 transition-colors z-10"
              aria-label="닫기"
            >
              <X size={16} className="md:w-4 md:h-4 w-3.5 h-3.5" />
            </button>

            {/* 우측 모서리 세로 타이머 */}
            <div className="absolute top-0 right-0 w-1 md:w-1.5 h-full bg-stone-700/50">
              <div
                key={current.key + (visible ? '-visible' : '')} // 재시작을 위해 키 갱신
                className="w-full bg-amber-500/50 rounded-full origin-top"
                style={{
                  animation: timerRef.current ? `dialogTimerVertical ${duration}ms linear forwards` : 'none',
                  height: timerRef.current ? "100%" : "0%"
                }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  // body에 portal하여 GameFullScreen의 isolation stacking context 밖으로 탈출
  if (typeof document !== "undefined") {
    return createPortal(content, document.body);
  }
  return content;
}
