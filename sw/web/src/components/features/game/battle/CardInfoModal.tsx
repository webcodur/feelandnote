/*
  파일명: components/features/game/battle/CardInfoModal.tsx
  기능: 게임 내 카드 상세 정보 모달
  책임: 셀럽 카드의 영향력, 능력치, 명령별 적성과 예상 효과를 상세히 표시한다.
*/
"use client";

import Image from "next/image";
import { X, Swords, ScrollText, Landmark } from "lucide-react";
import type { BattleCard, Command, Domain } from "@/lib/game/types";
import { COMMANDS, COMMAND_LABELS, DOMAINS, DOMAIN_LABELS } from "@/lib/game/types";
import { calcAptitude, aptitudeToStars } from "@/lib/game/gameEngine";
import { ABILITY_KEYS, ABILITY_LABELS as ABILITY_LABEL_MAP } from "@/lib/persona/constants";

const CMD_ICON: Record<Command, React.ReactNode> = {
  assault: <Swords size={12} />,
  stratagem: <ScrollText size={12} />,
  govern: <Landmark size={12} />,
};

const CMD_COLOR: Record<Command, string> = {
  assault: "text-red-400",
  stratagem: "text-purple-400",
  govern: "text-amber-400",
};

const ABILITY_ENTRIES = ABILITY_KEYS.map((key) => ({ key, label: ABILITY_LABEL_MAP[key] }));

function cmdEffect(cmd: Command, apt: number): string {
  const baseDmg = Math.round(apt / 2);
  switch (cmd) {
    case "assault":
      return `국력 -${baseDmg}. 민심 -3 (항상)`;
    case "stratagem":
      return `민심 -${baseDmg}`;
    case "govern": {
      const pRec = Math.round(apt / 3);
      return `국력 +${pRec}, 민심 +${baseDmg}. 카드 유지 + 1장 회수`;
    }
  }
}

interface Props {
  card: BattleCard;
  onClose: () => void;
  zIndex?: number;
}

export default function CardInfoModal({ card, onClose, zIndex = 9999 }: Props) {
  return (
    <div
      className="fixed inset-0 flex items-center justify-center p-4"
      style={{ zIndex }}
      onClick={onClose}
    >
      {/* backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      {/* modal */}
      <div
        className="relative w-full max-w-md rounded-xl border border-white/[0.08] bg-[#111115] shadow-2xl overflow-hidden animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* header: 초상화 + 기본 정보 */}
        <div className="relative h-36 bg-[#0a0a0c] overflow-hidden">
          {card.avatarUrl ? (
            <Image
              src={card.avatarUrl}
              alt={card.nickname}
              fill
              className="object-cover opacity-40 blur-sm scale-110"
              sizes="400px"
            />
          ) : null}
          <div className="absolute inset-0 bg-gradient-to-t from-[#111115] via-transparent to-transparent" />

          {/* 닫기 */}
          <button
            onClick={onClose}
            className="absolute top-2 right-2 p-1.5 rounded-full bg-black/40 text-white/40 hover:text-white/70 transition-colors"
          >
            <X size={16} />
          </button>

          {/* 프로필 */}
          <div className="absolute bottom-3 left-4 flex items-end gap-3">
            <div className="w-16 h-16 rounded-lg overflow-hidden border border-white/10 bg-[#0a0a0c] shrink-0">
              {card.avatarUrl ? (
                <Image src={card.avatarUrl} alt={card.nickname} width={64} height={64} className="object-cover w-full h-full" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <span className="text-white/10 text-xl font-cinzel">{card.nickname[0]}</span>
                </div>
              )}
            </div>
            <div className="pb-0.5">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white leading-tight">{card.nickname}</h2>
              </div>
              <p className="text-[11px] text-white/40 mt-0.5">{card.title} · {card.profession}</p>
            </div>
          </div>
        </div>

        {/* body */}
        <div className="p-4 space-y-4">

          {/* 명언 */}
          {card.quotes && (
            <p className="text-[11px] text-white/30 italic leading-relaxed border-l-2 border-white/[0.06] pl-3">
              "{card.quotes}"
            </p>
          )}

          {/* ── 명령별 적성 + 예상 효과 ── */}
          <div>
            <h3 className="text-[10px] font-bold text-white/50 uppercase tracking-wider mb-2">명령 적성</h3>
            <div className="space-y-1.5">
              {COMMANDS.map((cmd) => {
                const apt = calcAptitude(card, cmd);
                const stars = aptitudeToStars(apt);
                const effect = cmdEffect(cmd, apt);

                return (
                  <div key={cmd} className="rounded-md border border-white/[0.04] bg-white/[0.01] px-3 py-2">
                    <div className="flex items-center gap-2">
                      <span className={CMD_COLOR[cmd]}>{CMD_ICON[cmd]}</span>
                      <span className={`text-xs font-bold ${CMD_COLOR[cmd]}`}>{COMMAND_LABELS[cmd]}</span>
                      <span className="text-xs tracking-tight ml-auto">
                        <span className="text-accent">{"★".repeat(stars)}</span>
                        <span className="text-white/[0.08]">{"★".repeat(5 - stars)}</span>
                      </span>
                      <span className="text-[9px] text-white/20 tabular-nums w-8 text-right">{apt.toFixed(1)}</span>
                    </div>
                    <p className="text-[9px] text-white/30 mt-1">{effect}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── 영향력 + 능력치 (2열) ── */}
          <div className="grid grid-cols-2 gap-3">
            {/* 영향력 */}
            <div>
              <h3 className="text-[10px] font-bold text-white/50 uppercase tracking-wider mb-2">영향력</h3>
              <div className="space-y-1">
                {DOMAINS.map((d: Domain) => (
                  <div key={d} className="flex items-center gap-1.5">
                    <span className="text-[10px] text-white/30 w-8">{DOMAIN_LABELS[d]}</span>
                    <div className="flex-1 h-1 rounded-full bg-white/5 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-accent/50 transition-all"
                        style={{ width: `${(card.influence[d] / 10) * 100}%` }}
                      />
                    </div>
                    <span className="text-[9px] text-white/25 tabular-nums w-4 text-right">{card.influence[d]}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 능력치 */}
            <div>
              <h3 className="text-[10px] font-bold text-white/50 uppercase tracking-wider mb-2">능력</h3>
              <div className="space-y-1">
                {ABILITY_ENTRIES.map(({ key, label }) => (
                  <div key={key} className="flex items-center gap-1.5">
                    <span className="text-[10px] text-white/30 w-8">{label}</span>
                    <div className="flex-1 h-1 rounded-full bg-white/5 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-blue-400/40 transition-all"
                        style={{ width: `${card.ability[key]}%` }}
                      />
                    </div>
                    <span className="text-[9px] text-white/25 tabular-nums w-6 text-right">{card.ability[key]}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
