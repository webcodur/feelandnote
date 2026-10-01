/*
  파일명: components/features/game/hegemony/captain/CaptainScreen.tsx
  기능: 주장 임명 화면
  책임: 내 명단 다섯 명 가운데 주장을 고르게 한다. 추천 인물을 표시하고, 고른 인물의 효과를 숫자로 미리 보여 준다.
*/
"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Crown } from "lucide-react";
import CelebAvatarImage from "@/components/ui/CelebAvatarImage";
import type { BattleCard } from "@/lib/game/types";
import { aiChooseCaptain } from "@/lib/game/hegemony/ai";
import type { Difficulty } from "@/lib/game/hegemony/constants";
import { seededRng } from "@/lib/game/hegemony/rng";
import { useHotkeys } from "../hooks/useHotkeys";
import type { ScreenCommon } from "../screenTypes";
import { useHegemonyText } from "../text";
import GameButton from "../ui/GameButton";
import HeroCard from "../ui/HeroCard";
import CaptainPreview from "./CaptainPreview";

interface Props extends ScreenCommon {
  mine: BattleCard[];
  theirs: BattleCard[];
  difficulty: Difficulty;
  onAppoint: (cardId: string) => void;
}

export default function CaptainScreen({ mine, theirs, onAppoint, sfx, hush, onInspect }: Props) {
  const text = useHegemonyText();
  // AI가 자기 주장을 고르는 기준을 그대로 써서 추천한다 (무작위 흔들림 없이)
  const recommended = useMemo(() => aiChooseCaptain(mine, seededRng(1)), [mine]);
  const [selectedId, setSelectedId] = useState<string>(recommended);
  const selected = mine.find((c) => c.id === selectedId) ?? mine[0];

  const choose = (card: BattleCard | undefined) => {
    if (!card) return;
    sfx("select");
    setSelectedId(card.id);
  };
  const appoint = () => {
    if (!selected) return;
    sfx("confirm");
    hush();
    onAppoint(selected.id);
  };
  useHotkeys({
    "1": () => choose(mine[0]),
    "2": () => choose(mine[1]),
    "3": () => choose(mine[2]),
    "4": () => choose(mine[3]),
    "5": () => choose(mine[4]),
    Enter: appoint,
  });

  // 아주 낮은 노트북 화면은 장식 왕관과 틈을 줄여 미리보기가 붙은 단추에 가리지 않게 한다
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col items-center gap-5 py-2 lg:gap-7 lg:[@media(max-height:700px)]:gap-4">
      <header className="flex max-w-2xl flex-col items-center gap-2 text-center">
        <Crown className="text-accent lg:[@media(max-height:700px)]:hidden" size={28} />
        <h2 className="text-3xl font-black text-hg-bright">{text.captain.title}</h2>
        <p className="text-sm leading-relaxed text-text-primary md:text-base">{text.captain.guide}</p>
      </header>

      <div className="grid w-full grid-cols-3 gap-2.5 sm:grid-cols-5 sm:gap-4">
        {mine.map((card, i) => (
          <motion.div
            key={card.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: card.id === selectedId ? -10 : 0 }}
            transition={{ delay: i * 0.05, type: "spring", stiffness: 300, damping: 26 }}
          >
            <HeroCard
              card={card}
              selected={card.id === selectedId}
              captain={card.id === selectedId}
              tag={card.id === recommended && card.id !== selectedId ? { label: text.captain.recommend, tone: "accent" } : null}
              hotkey={String(i + 1)}
              lowPortrait
              onSelect={() => choose(card)}
              onInspect={() => onInspect(card.id)}
            />
          </motion.div>
        ))}
      </div>

      {selected && <CaptainPreview captain={selected} team={mine} />}

      {/* 화면이 낮아 단추가 아래로 밀려나면 미리보기를 보는 동안에도 화면 아래에 붙어 있게 한다 */}
      {selected && (
        <div className="sticky bottom-3 z-10 rounded-2xl shadow-2xl shadow-black/70">
          <GameButton variant="primary" size="lg" hotkey="Enter" icon={<Crown size={20} />} onClick={appoint}>
            {text.captain.confirm(selected.nickname)}
          </GameButton>
        </div>
      )}

      <div className="flex items-center gap-3">
        <span className="text-sm font-bold text-hg-enemy">{text.captain.enemy}</span>
        <div className="flex -space-x-2">
          {theirs.map((card) => (
            <span key={card.id} className="relative size-9 overflow-hidden rounded-full border-2 border-hg-ink bg-hg-raised" title={card.nickname}>
              {card.avatarUrl && <CelebAvatarImage src={card.avatarUrl} alt={card.nickname} className="object-cover object-top" />}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
