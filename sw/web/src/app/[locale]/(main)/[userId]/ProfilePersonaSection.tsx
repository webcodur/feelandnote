"use client";

import { useState, useTransition } from "react";
import ClassicalBox from "@/components/ui/ClassicalBox";
import { DecorativeLabel } from "@/components/ui";
import {
  STAT_KEYS,
  STAT_LABELS,
  INNER_VIRTUE_KEYS,
  OUTER_VIRTUE_KEYS,
  ABILITY_KEYS,
  TENDENCY_KEYS,
  TENDENCY_LABELS,
  PROFESSION_LABELS,
  type StatKey,
  type TendencyKey,
} from "@/lib/persona/constants";
import { distanceToMatchPercent, type PersonaVector, type SimilarCeleb } from "@/lib/persona/utils";
import { getCelebForModal } from "@/actions/celebs/getCelebForModal";
import CelebDetailModal from "@/components/features/home/celeb-card-drafts/CelebDetailModal";
import type { CelebProfile } from "@/types/home";

interface Props {
  nickname: string;
  targetPersona: PersonaVector;
  similarCelebs: SimilarCeleb[];
}

/** 성향 값(-50~+50) → 라벨 */
function getTendencyLabel(value: number, neg: string, pos: string): string {
  const abs = Math.abs(value);
  if (abs <= 10) return "중립";
  const direction = value < 0 ? neg : pos;
  if (abs <= 30) return direction;
  return `강한 ${direction}`;
}

/** 스탯 바 (0~100) */
function StatBar({ label, value }: { label: string; value: number }) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center text-[11px]">
        <span className="text-text-secondary font-medium">{label}</span>
        <span className="text-text-secondary font-mono text-[10px]">{value}</span>
      </div>
      <div className="relative h-2 rounded-full bg-white/5 overflow-hidden">
        <div
          className="absolute top-0 left-0 bottom-0 rounded-full bg-gradient-to-r from-accent/60 to-accent/90"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export default function ProfilePersonaSection({ nickname, targetPersona, similarCelebs }: Props) {
  const [modalCeleb, setModalCeleb] = useState<CelebProfile | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleCelebClick = (celebId: string) => {
    startTransition(async () => {
      const celeb = await getCelebForModal(celebId);
      if (celeb) setModalCeleb(celeb);
    });
  };

  return (
    <>
      <ClassicalBox className="p-4 sm:p-6 md:p-8 bg-bg-card/40 shadow-2xl border-accent-dim/20">
        <div className="flex justify-center mb-4 sm:mb-5">
          <DecorativeLabel label="인물 분석" />
        </div>

        <p className="text-xs text-text-secondary text-center mb-6">
          {nickname}의 덕목, 능력, 성향을 분석한 결과입니다.
        </p>

        <div className="max-w-lg mx-auto space-y-6 mb-8">
          {/* 내적 덕목 */}
          <div>
            <p className="text-[10px] text-accent/60 font-medium uppercase tracking-wider mb-2">내적 덕목</p>
            <div className="space-y-2">
              {INNER_VIRTUE_KEYS.map((key) => (
                <StatBar key={key} label={STAT_LABELS[key]} value={targetPersona[key]} />
              ))}
            </div>
          </div>

          {/* 외적 덕목 */}
          <div>
            <p className="text-[10px] text-accent/60 font-medium uppercase tracking-wider mb-2">외적 덕목</p>
            <div className="space-y-2">
              {OUTER_VIRTUE_KEYS.map((key) => (
                <StatBar key={key} label={STAT_LABELS[key]} value={targetPersona[key]} />
              ))}
            </div>
          </div>

          {/* 능력 */}
          <div>
            <p className="text-[10px] text-accent/60 font-medium uppercase tracking-wider mb-2">능력</p>
            <div className="space-y-2">
              {ABILITY_KEYS.map((key) => (
                <StatBar key={key} label={STAT_LABELS[key]} value={targetPersona[key]} />
              ))}
            </div>
          </div>

          {/* 성향 (-50~+50) 바 */}
          <div>
            <p className="text-[10px] text-accent/60 font-medium uppercase tracking-wider mb-2">성향</p>
            <div className="space-y-3">
              {TENDENCY_KEYS.map((key) => {
                const [neg, pos] = TENDENCY_LABELS[key];
                const value = targetPersona[key];
                const position = ((value + 50) / 100) * 100;

                return (
                  <div key={key} className="space-y-1">
                    <div className="flex justify-between items-center text-[11px]">
                      <span className={`font-medium ${value < -10 ? "text-blue-400" : "text-text-secondary"}`}>
                        {neg}
                      </span>
                      <span className="text-text-secondary font-mono text-[10px]">
                        {getTendencyLabel(value, neg, pos)}
                      </span>
                      <span className={`font-medium ${value > 10 ? "text-orange-400" : "text-text-secondary"}`}>
                        {pos}
                      </span>
                    </div>
                    <div className="relative h-2 rounded-full bg-white/5 overflow-hidden">
                      <div className="absolute left-1/2 top-0 bottom-0 w-px bg-white/20 z-10" />
                      {value !== 0 && (
                        <div
                          className={`absolute top-0 bottom-0 rounded-full ${
                            value < 0
                              ? "bg-gradient-to-l from-blue-500/40 to-blue-400/80"
                              : "bg-gradient-to-r from-orange-500/40 to-orange-400/80"
                          }`}
                          style={
                            value < 0
                              ? { left: `${position}%`, right: "50%" }
                              : { left: "50%", width: `${position - 50}%` }
                          }
                        />
                      )}
                      <div
                        className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-white border border-white/60 shadow-sm z-20"
                        style={{ left: `${position}%`, transform: "translate(-50%, -50%)" }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* 유사 인물 */}
        {similarCelebs.length > 0 && (
          <>
            <div className="flex justify-center mb-4">
              <DecorativeLabel label="유사 인물" />
            </div>
            <p className="text-xs text-text-secondary text-center mb-5">
              위 분석과 가장 유사한 인물입니다.
            </p>
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
              {similarCelebs.map((celeb) => (
                <button
                  key={celeb.celeb_id}
                  onClick={() => handleCelebClick(celeb.celeb_id)}
                  disabled={isPending}
                  className="flex-shrink-0 w-28 sm:w-32 text-left disabled:opacity-50"
                >
                  <div className="flex flex-col items-center gap-2 p-3 rounded-xl border border-transparent hover:border-accent/20 hover:bg-accent/5 transition-colors">
                    <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full overflow-hidden border-2 border-accent/30 bg-neutral-800">
                      {celeb.avatar_url ? (
                        <img
                          src={celeb.avatar_url}
                          alt={celeb.nickname}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-lg font-serif text-accent/60">
                          {celeb.nickname.charAt(0)}
                        </div>
                      )}
                    </div>
                    <p className="text-xs sm:text-sm font-medium text-text-primary text-center leading-tight line-clamp-2">
                      {celeb.nickname}
                    </p>
                    <p className="text-[10px] sm:text-xs text-text-secondary">
                      {PROFESSION_LABELS[celeb.profession ?? ""] ?? ""}
                    </p>
                    <span className="text-[10px] font-mono text-accent/70">
                      {distanceToMatchPercent(celeb.distance)}% 일치
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </>
        )}
      </ClassicalBox>

      {modalCeleb && (
        <CelebDetailModal
          celeb={modalCeleb}
          isOpen={true}
          onClose={() => setModalCeleb(null)}
        />
      )}
    </>
  );
}
