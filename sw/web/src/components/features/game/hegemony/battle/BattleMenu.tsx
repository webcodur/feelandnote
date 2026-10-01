/*
  파일명: components/features/game/hegemony/battle/BattleMenu.tsx
  기능: 대전 보조 단추
  책임: 남은 일기토 표시와 전황 기록·규칙·기권 단추를 둔다. 기권은 확인을 한 번 더 받는다.
        좁은 화면(compact)은 메뉴 단추 하나로 접고, 누르면 같은 항목을 창으로 보여 준다.
*/
"use client";

import { useState, type ReactNode } from "react";
import { BookOpen, Flag, Menu, ScrollText } from "lucide-react";
import type { RoundRecord } from "@/lib/game/hegemony/types";
import RulesContent from "../title/RulesContent";
import { useHegemonyText } from "../text";
import GameButton from "../ui/GameButton";
import GameModal from "../ui/GameModal";
import { FOCUS_RING } from "../ui/tokens";
import BattleLog from "./BattleLog";

type Open = "menu" | "log" | "rules" | "forfeit" | null;

interface Props {
  records: RoundRecord[];
  nameOf: (id: string) => string;
  duelsLeft: number;
  onForfeit: () => void;
  compact?: boolean;
}

function IconButton({ label, icon, onClick }: { label: string; icon: ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`flex size-9 shrink-0 items-center justify-center rounded-lg border border-hg-line bg-hg-panel/80 text-text-secondary hover:border-accent/70 hover:text-accent ${FOCUS_RING}`}
    >
      {icon}
    </button>
  );
}

export default function BattleMenu({ records, nameOf, duelsLeft, onForfeit, compact = false }: Props) {
  const text = useHegemonyText();
  const [open, setOpen] = useState<Open>(null);
  const close = () => setOpen(null);
  const items = [
    { key: "log" as const, label: text.battle.log, icon: <ScrollText size={16} /> },
    { key: "rules" as const, label: text.battle.help, icon: <BookOpen size={16} /> },
    { key: "forfeit" as const, label: text.battle.forfeit, icon: <Flag size={16} /> },
  ];
  return (
    <div className="flex items-center justify-end gap-1.5">
      {!compact && duelsLeft > 0 && (
        <span className="me-auto whitespace-nowrap rounded-full border border-hg-mandate/50 bg-hg-mandate/10 px-2.5 py-1 text-sm font-bold text-hg-mandate">{text.battle.duelsLeft(duelsLeft)}</span>
      )}
      {!compact && items.map((item) => <IconButton key={item.key} label={item.label} icon={item.icon} onClick={() => setOpen(item.key)} />)}
      {compact && <IconButton label={text.battle.menu} icon={<Menu size={18} />} onClick={() => setOpen("menu")} />}

      <GameModal open={open === "menu"} onClose={close} title={text.battle.menu}>
        <p className="text-sm font-semibold text-hg-mandate">{text.battle.duelsLeftLong(duelsLeft)}</p>
        <div className="mt-4 grid gap-2">
          {items.map((item) => (
            <GameButton key={item.key} block icon={item.icon} variant={item.key === "forfeit" ? "danger" : "secondary"} onClick={() => setOpen(item.key)}>
              {item.label}
            </GameButton>
          ))}
        </div>
      </GameModal>
      <GameModal open={open === "log"} onClose={close} title={text.battle.log} wide>
        <BattleLog records={records} nameOf={nameOf} />
      </GameModal>
      <GameModal open={open === "rules"} onClose={close} title={text.rules.title} wide>
        <RulesContent />
      </GameModal>
      <GameModal open={open === "forfeit"} onClose={close} title={text.battle.forfeit}>
        <p className="text-base text-text-primary">{text.battle.forfeitConfirm}</p>
        <div className="mt-5 grid grid-cols-2 gap-2">
          <GameButton onClick={close}>{text.battle.cancel}</GameButton>
          <GameButton variant="danger" onClick={() => { close(); onForfeit(); }}>{text.battle.forfeitYes}</GameButton>
        </div>
      </GameModal>
    </div>
  );
}
