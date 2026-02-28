/*
  파일명: components/features/game/shared/DialogueSubtitle.tsx
  기능: 대사 자막 스낵바
  책임: 대사 표시 시 텍스트를 하단에 3초간 표시한다. 새 대사가 오면 즉시 교체하고 타이머를 리셋한다.
*/
"use client";

import { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
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

  useEffect(() => {
    if (!subtitle) return;

    // 이전 타이머 정리
    if (timerRef.current) clearTimeout(timerRef.current);

    // 동일 텍스트 반복 감지
    setIsRepeat(subtitle.text === prevTextRef.current);
    prevTextRef.current = subtitle.text;

    // 즉시 교체
    setCurrent(subtitle);
    setVisible(true);

    // 텍스트 길이 기반 동적 타이머
    const duration = calcDuration(subtitle.text);
    timerRef.current = setTimeout(() => {
      setVisible(false);
      timerRef.current = null;
    }, duration);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [subtitle]);

  const duration = current ? calcDuration(current.text) : BASE_DURATION;

  if (!visible || !current) return null;

  const content = (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[10100] w-[90%] max-w-md animate-slide-up pointer-events-none">
      <div className={`relative bg-stone-900/90 border rounded-lg shadow-lg backdrop-blur-sm p-3 overflow-hidden ${isRepeat ? "border-amber-400/50 animate-dialogue-glow" : "border-amber-500/20"}`}>
        <div className="flex items-start gap-3">
          {/* 아바타 */}
          <div className="w-9 h-9 rounded-full overflow-hidden bg-stone-700 shrink-0 border border-stone-600">
            {current.avatarUrl ? (
              <img
                src={current.avatarUrl}
                alt={current.nickname ?? ""}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-stone-400 text-xs">
                {current.nickname?.[0] ?? "?"}
              </div>
            )}
          </div>

          {/* 이름 + 대사 */}
          <div className="flex-1 min-w-0">
            {current.nickname && (
              <span className="text-[11px] font-bold text-amber-300/80 block mb-0.5 truncate">
                {current.nickname}
              </span>
            )}
            <p className="text-sm text-stone-200 leading-relaxed">
              &ldquo;{current.text}&rdquo;
            </p>
          </div>
        </div>

        {/* 우측 모서리 세로 타이머 */}
        <div className="absolute top-0 right-0 w-0.5 h-full bg-stone-700/50">
          <div
            key={current.key}
            className="w-full bg-amber-500/40 rounded-full origin-top"
            style={{ animation: `dialogTimerVertical ${duration}ms linear forwards`, height: "100%" }}
          />
        </div>
      </div>
    </div>
  );

  // body에 portal하여 GameFullScreen의 isolation stacking context 밖으로 탈출
  if (typeof document !== "undefined") {
    return createPortal(content, document.body);
  }
  return content;
}
