/*
  파일명: components/features/game/battle/GameResult.tsx
  기능: 최종 결과 화면
  책임: 6라운드 종료 후 총점과 라운드별 기록을 보여준다.
*/
"use client";

import { useState, useCallback } from "react";
import Image from "next/image";
import type { RoundResult, BattleCard } from "@/lib/game/types";
import type { CelebProfile } from "@/types/home";
import { DOMAIN_LABELS } from "@/lib/game/types";
import { Swords, RotateCcw, Home, Crown } from "lucide-react";
import Link from "next/link";
import { getCelebForModal } from "@/actions/celebs/getCelebForModal";
import CelebDetailModal from "@/components/features/home/celeb-card-drafts/CelebDetailModal";

interface Props {
  playerScore: number;
  aiScore: number;
  rounds: RoundResult[];
  onRestart: () => void;
}

/** 카드의 작은 아바타+이름 칩 */
function CardChip({
  card,
  isWinner,
  side,
  onClick,
}: {
  card: BattleCard;
  isWinner: boolean;
  side: "player" | "ai";
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`
        flex items-center gap-1.5 px-2 py-1 rounded-lg border transition-all
        hover:bg-white/5 active:scale-95 cursor-pointer
        ${isWinner
          ? side === "player"
            ? "border-accent/30 bg-accent/5"
            : "border-red-500/30 bg-red-500/5"
          : "border-white/5 bg-white/[0.02]"
        }
      `}
    >
      <div className="relative w-6 h-6 rounded-full overflow-hidden bg-white/10 shrink-0">
        {card.avatarUrl ? (
          <Image src={card.avatarUrl} alt={card.nickname} fill className="object-cover" sizes="24px" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[8px] text-white/30">?</div>
        )}
      </div>
      <span className={`text-[11px] font-medium truncate max-w-[64px] ${
        isWinner
          ? side === "player" ? "text-accent" : "text-red-400"
          : "text-text-secondary"
      }`}>
        {card.nickname}
      </span>
      {isWinner && (
        <Crown size={10} className={`${side === "player" ? "text-accent" : "text-red-400"} shrink-0`} />
      )}
    </button>
  );
}

export default function GameResult({ playerScore, aiScore, rounds, onRestart }: Props) {
  const playerWins = playerScore > aiScore;
  const aiWins = aiScore > playerScore;

  const [modalCeleb, setModalCeleb] = useState<CelebProfile | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const handleCelebClick = useCallback(async (celebId: string) => {
    if (loadingId) return;
    setLoadingId(celebId);
    const celeb = await getCelebForModal(celebId);
    setLoadingId(null);
    if (celeb) setModalCeleb(celeb);
  }, [loadingId]);

  return (
    <div className="max-w-4xl mx-auto flex flex-col items-center gap-6 py-4 relative">
      {/* 배경 분위기 */}
      <div className={`
        absolute inset-0 -z-10 rounded-3xl opacity-30 blur-3xl
        ${playerWins
          ? "bg-gradient-to-b from-accent/20 via-transparent to-transparent"
          : aiWins
          ? "bg-gradient-to-b from-red-500/20 via-transparent to-transparent"
          : "bg-gradient-to-b from-white/10 via-transparent to-transparent"
        }
      `} />

      {/* 승패 */}
      <div className="text-center space-y-3 animate-slide-up">
        <Swords size={36} className={`mx-auto ${playerWins ? "text-accent" : aiWins ? "text-red-400" : "text-text-secondary"}`} />
        <h2 className={`text-4xl font-serif font-black ${
          playerWins ? "text-accent text-glow" : aiWins ? "text-red-400" : "text-text-secondary"
        }`}>
          {playerWins ? "승리!" : aiWins ? "패배" : "무승부"}
        </h2>
      </div>

      {/* 총점 */}
      <div className="flex items-center gap-6 px-8 py-5 rounded-xl border border-white/10 bg-black/40 animate-fade-in">
        <div className="text-center">
          <span className="text-xs text-text-tertiary font-cinzel uppercase">나</span>
          <div className="text-4xl font-black text-accent animate-score-pop">{playerScore}</div>
        </div>
        <div className="text-2xl text-text-tertiary font-cinzel">:</div>
        <div className="text-center">
          <span className="text-xs text-text-tertiary font-cinzel uppercase">AI</span>
          <div className="text-4xl font-black text-red-400 animate-score-pop">{aiScore}</div>
        </div>
      </div>

      {/* 라운드 히스토리 */}
      <div className="w-full">
        <h3 className="text-xs text-text-tertiary font-cinzel uppercase tracking-wider text-center mb-4">
          ROUND HISTORY
        </h3>

        <div className="flex flex-col gap-1.5">
          {rounds.map((r, i) => {
            const pWin = r.pointsAwarded.player > r.pointsAwarded.ai;
            const aWin = r.pointsAwarded.ai > r.pointsAwarded.player;

            return (
              <div
                key={i}
                className="animate-slide-up flex items-center gap-2 px-3 py-2 rounded-lg border border-white/5 bg-white/[0.02]"
                style={{ animationDelay: `${i * 80}ms` }}
              >
                {/* 라운드 번호 */}
                <div className={`
                  w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0
                  ${pWin ? "bg-accent/20 text-accent" : aWin ? "bg-red-500/20 text-red-400" : "bg-white/5 text-text-tertiary"}
                `}>
                  {i + 1}
                </div>

                {/* 플레이어 카드 */}
                <CardChip
                  card={r.playerCard}
                  isWinner={pWin}
                  side="player"
                  onClick={() => handleCelebClick(r.playerCard.id)}
                />

                {/* 점수 */}
                <div className="flex items-center gap-1 shrink-0 mx-auto">
                  <span className={`text-sm font-bold tabular-nums ${pWin ? "text-accent" : "text-text-tertiary"}`}>
                    {r.playerDomainScore}
                  </span>
                  <div className="flex flex-col items-center">
                    <span className="text-[8px] text-text-tertiary leading-none">{DOMAIN_LABELS[r.domain]}</span>
                    {r.isTiebreak && <span className="text-[7px] text-text-tertiary leading-none">TB</span>}
                  </div>
                  <span className={`text-sm font-bold tabular-nums ${aWin ? "text-red-400" : "text-text-tertiary"}`}>
                    {r.aiDomainScore}
                  </span>
                </div>

                {/* AI 카드 */}
                <CardChip
                  card={r.aiCard}
                  isWinner={aWin}
                  side="ai"
                  onClick={() => handleCelebClick(r.aiCard.id)}
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* 버튼 */}
      <div className="flex items-center gap-3 animate-fade-in">
        <button
          onClick={onRestart}
          className="flex items-center gap-2 px-6 py-3 rounded-lg bg-accent/10 border border-accent/30 hover:bg-accent/20 active:scale-95 transition-all"
        >
          <RotateCcw size={16} className="text-accent" />
          <span className="font-serif font-bold text-accent">다시 대전</span>
        </button>
        <Link
          href="/rest"
          className="flex items-center gap-2 px-6 py-3 rounded-lg border border-white/10 hover:border-white/20 hover:bg-white/5 active:scale-95 transition-all"
        >
          <Home size={16} className="text-text-secondary" />
          <span className="font-serif font-bold text-text-secondary">쉼터로</span>
        </Link>
      </div>

      {/* 셀럽 상세 모달 */}
      {modalCeleb && (
        <CelebDetailModal
          celeb={modalCeleb}
          isOpen={!!modalCeleb}
          onClose={() => setModalCeleb(null)}
        />
      )}
    </div>
  );
}
