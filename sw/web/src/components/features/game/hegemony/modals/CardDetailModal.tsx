/*
  파일명: components/features/game/hegemony/modals/CardDetailModal.tsx
  기능: 인물 상세 창
  책임: 명령별 적성과 그 바탕(영향력 두 갈래 × 능력치 하나)을 풀어 보여 주고, 인물이 남긴 말을 곁들인다.
*/
"use client";

import { gameText } from "@/lib/game/text";

import { useLocale } from "next-intl";
import CelebAvatarImage from "@/components/ui/CelebAvatarImage";
import type { BattleCard, Command, Domain } from "@/lib/game/types";
import { COMMANDS, DOMAIN_LABELS, DOMAIN_LABELS_EN } from "@/lib/game/types";
import { ABILITY_LABELS, type AbilityKey } from "@/lib/spectrum/constants";
import { baseAptitude, bestCommandOf, displayAptitude } from "@/lib/game/hegemony/aptitude";
import { useHegemonyText } from "../text";
import CommandSeal from "../ui/CommandSeal";
import GameModal from "../ui/GameModal";
import { COMMAND_TONE } from "../ui/tokens";

/** 명령마다 적성을 만드는 영향력 두 갈래와 능력치 하나 */
const BASIS: Record<Command, { domains: [Domain, Domain]; ability: AbilityKey }> = {
  assault: { domains: ["strategic", "social"], ability: "martial" },
  stratagem: { domains: ["political", "tech"], ability: "intellect" },
  govern: { domains: ["economic", "cultural"], ability: "command" },
};

const ABILITY_LABELS_EN: Record<AbilityKey, string> = { command: "Command", martial: "Martial", intellect: "Intellect", charm: "Charm" };
const APTITUDE_SCALE = 20;

export default function CardDetailModal({ card, onClose }: { card: BattleCard | null; onClose: () => void }) {
  const text = useHegemonyText();
  const en = useLocale() === "en";
  const domainLabel = (d: Domain) => (en ? DOMAIN_LABELS_EN[d] : DOMAIN_LABELS[d]);
  const abilityLabel = (a: AbilityKey) => (en ? ABILITY_LABELS_EN[a] : ABILITY_LABELS[a]);

  return (
    <GameModal open={!!card} onClose={onClose} title={card?.nickname ?? ""}>
      {card && (
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <span className="relative size-20 shrink-0 overflow-hidden rounded-2xl border border-hg-line bg-hg-ink">
              {card.avatarUrl && <CelebAvatarImage src={card.avatarUrl} alt={card.nickname} className="object-cover object-top" />}
            </span>
            <div className="min-w-0">
              <p className="text-base font-semibold text-text-primary">{card.title}</p>
              <p className="mt-1 flex items-center gap-1.5 text-sm text-text-secondary">
                {text.card.best}
                <CommandSeal command={bestCommandOf(card)} size="xs" solid />
                {text.command.name[bestCommandOf(card)]}
              </p>
            </div>
          </div>

          <section>
            <h3 className="mb-2 text-sm font-black text-accent">{text.card.aptitude}</h3>
            {/* 도장·이름·막대·수치를 칸으로 맞춘다. 이름 칸은 가장 긴 이름(영어 Scheme·Govern)에 맞춰 막대를 덮지 않는다 */}
            <ul className="grid grid-cols-[auto_max-content_minmax(0,1fr)_1.75rem] items-center gap-x-2 gap-y-2.5">
              {COMMANDS.map((cmd) => {
                const value = baseAptitude(card, cmd);
                const basis = BASIS[cmd];
                return (
                  <li key={cmd} className="col-span-4 grid grid-cols-subgrid items-center gap-y-1">
                    <CommandSeal command={cmd} size="xs" />
                    <span className={`text-sm font-black ${COMMAND_TONE[cmd].text}`}>{text.command.name[cmd]}</span>
                    <span className="relative h-2 overflow-hidden rounded-full bg-hg-line/70">
                      <span className={`absolute inset-y-0 start-0 rounded-full ${COMMAND_TONE[cmd].fill}`} style={{ width: `${Math.min(100, (value / APTITUDE_SCALE) * 100)}%` }} />
                    </span>
                    <span className="text-end text-base font-black tabular-nums text-hg-bright">{displayAptitude(value)}</span>
                    <p className="col-span-3 col-start-2 text-sm text-text-secondary">
                      {basis.domains.map((d) => `${domainLabel(d)} ${card.influence[d]}`).join(" · ")} · {abilityLabel(basis.ability)} {card.ability[basis.ability]}
                    </p>
                  </li>
                );
              })}
            </ul>
          </section>

          {card.quotes && (
            <section>
              <h3 className="mb-1.5 text-sm font-black text-accent">{text.card.quote}</h3>
              <blockquote className="border-s-2 border-accent/60 ps-3 text-base leading-relaxed text-text-primary">{gameText(card.quotes)}</blockquote>
            </section>
          )}
        </div>
      )}
    </GameModal>
  );
}
