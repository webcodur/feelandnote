/*
  파일명: components/features/game/duel/DuelDevStudio.tsx
  기능: 일기토 이펙트 Dev 테스트 환경
  책임: 포즈/모멘텀을 실시간 조작하여 DuelFighter 이펙트를 검증한다.
*/
"use client";

import { useState, useCallback } from "react";
import { ArrowLeft } from "lucide-react";
import DuelFighter, { type FighterPose } from "./DuelFighter";

const POSES: FighterPose[] = ["idle", "charge", "slash", "guard", "hit", "fallen"];

interface Props {
  onBack?: () => void;
}

export default function DuelDevStudio({ onBack }: Props) {
  const [pose, setPose] = useState<FighterPose>("idle");
  const [momentum, setMomentum] = useState(0);
  const [sync, setSync] = useState(true);
  const [counter, setCounter] = useState(0);

  // 같은 포즈를 다시 트리거할 때 강제 리마운트
  const selectPose = useCallback((p: FighterPose) => {
    setPose(p);
    setCounter(c => c + 1);
  }, []);

  return (
    <div className="flex flex-col flex-1 bg-black/90 text-white">
      {/* 헤더 */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-white/[0.06]">
        {onBack && (
          <button onClick={onBack} className="text-white/40 hover:text-white/70">
            <ArrowLeft size={18} />
          </button>
        )}
        <span className="text-sm font-bold tracking-wider">DEV STUDIO</span>
        <span className="text-[10px] text-white/20 ml-auto">DuelFighter 이펙트 테스트</span>
      </div>

      {/* 프리뷰 영역 */}
      <div className="flex-1 flex items-center justify-center gap-16 py-8">
        <div className="flex flex-col items-center gap-2">
          <span className="text-[10px] text-white/30 uppercase tracking-wider">Player</span>
          <DuelFighter
            key={`p-${counter}`}
            avatarUrl={null}
            nickname="P"
            pose={pose}
            momentum={momentum}
          />
          <span className="text-[10px] text-accent font-mono">{pose}</span>
        </div>
        <div className="flex flex-col items-center gap-2">
          <span className="text-[10px] text-white/30 uppercase tracking-wider">AI</span>
          <DuelFighter
            key={`a-${counter}`}
            avatarUrl={null}
            nickname="A"
            pose={sync ? pose : "idle"}
            flipped
            momentum={sync ? momentum : 0}
          />
          <span className="text-[10px] text-red-400/60 font-mono">{sync ? pose : "idle"}</span>
        </div>
      </div>

      {/* 컨트롤 패널 */}
      <div className="px-4 pb-4 space-y-3">
        {/* 포즈 라디오 */}
        <div className="flex flex-wrap gap-1.5">
          {POSES.map(p => (
            <button
              key={p}
              onClick={() => selectPose(p)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all ${
                pose === p
                  ? "bg-accent/20 text-accent border border-accent/40"
                  : "bg-white/[0.04] text-white/50 border border-white/[0.08] hover:bg-white/[0.08]"
              }`}
            >
              {p}
            </button>
          ))}
        </div>

        {/* 모멘텀 슬라이더 */}
        <div className="flex items-center gap-3">
          <span className="text-[10px] text-white/40 w-16 shrink-0">Momentum</span>
          <input
            type="range"
            min={0} max={5} step={1}
            value={momentum}
            onChange={e => setMomentum(Number(e.target.value))}
            className="flex-1 accent-amber-400"
          />
          <span className="text-xs text-amber-400 font-mono w-4 text-right">{momentum}</span>
        </div>

        {/* 동기화 토글 */}
        <label className="flex items-center gap-2 text-[11px] text-white/40 cursor-pointer">
          <input
            type="checkbox"
            checked={sync}
            onChange={e => setSync(e.target.checked)}
            className="accent-accent"
          />
          양쪽 동기화
        </label>
      </div>
    </div>
  );
}
