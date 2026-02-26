/*
  파일명: components/features/game/shared/DialogueSubtitle.tsx
  기능: 대사 자막 스낵바
  책임: 대사 표시 시 텍스트를 하단에 3초간 표시한다.
*/
"use client";

import { useEffect, useState } from "react";
import type { DialogueSubtitleData } from "./hooks/useDialogue";

interface Props {
  subtitle: DialogueSubtitleData | null;
}

export default function DialogueSubtitle({ subtitle }: Props) {
  const [visible, setVisible] = useState(false);
  const [current, setCurrent] = useState<DialogueSubtitleData | null>(null);

  useEffect(() => {
    if (!subtitle) return;
    setCurrent(subtitle);
    setVisible(true);
    const timer = setTimeout(() => setVisible(false), 3000);
    return () => clearTimeout(timer);
  }, [subtitle]);

  if (!visible || !current) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[60] w-[90%] max-w-md animate-slide-up pointer-events-none">
      <div className="bg-stone-900/90 border border-amber-500/20 rounded-lg shadow-lg backdrop-blur-sm p-3">
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

        <div className="mt-2 h-0.5 w-full bg-stone-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-amber-500/50 rounded-full"
            style={{ animation: "dialogTimer 3s linear forwards" }}
          />
        </div>
      </div>
    </div>
  );
}
