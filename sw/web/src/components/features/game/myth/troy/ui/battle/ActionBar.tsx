/*
  파일명: components/features/game/myth/troy/ui/battle/ActionBar.tsx
  기능: 트로이 전쟁 행동 단추 줄
  책임: 고른 우리 장수가 할 수 있는 행동(기술·성문 열기·대기·취소)을 단추로 늘어놓는다. 공격은 적을 눌러 예측을 띄워서 한다.
        쓸 수 없는 기술은 흐리게 두되 이유(대기·한 판 한 번)를 알 수 있게 이름 곁에 남은 차례를 적는다.
*/ // ------------------------------
"use client";

import { Check, DoorOpen, Sparkles, Undo2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { canUseSkill, SKILLS } from "../../engine";
import type { BattleState, SkillKey, Unit } from "../../engine";

interface Props {
  state: BattleState;
  unit: Unit;
  interactables: string[];
  onSkill: (key: SkillKey, aim: "self" | "target") => void;
  onInteract: (id: string) => void;
  onWait: () => void;
  onCancel: () => void;
  canCancel: boolean;
}

const BTN = "pointer-events-auto inline-flex min-h-11 items-center justify-center gap-1.5 rounded-lg border px-3.5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50";
const STONE = `${BTN} border-border bg-bg-main/92 text-text-primary hover:border-accent hover:text-accent`;
const GOLD = `${BTN} border-accent-dim bg-bg-main/92 text-accent hover:border-accent hover:bg-accent/15`;

export default function ActionBar({ state, unit, interactables, onSkill, onInteract, onWait, onCancel, canCancel }: Props) {
  const t = useTranslations("gameMythTroy");
  const active = unit.skills.filter((key) => SKILLS[key].use !== "passive");
  return (
    // 줄은 휴대폰에서 화면 폭을 다 차지한다 — 단추 밖 빈자리는 판 누름을 가로채지 않는다
    <div className="pointer-events-none flex flex-wrap items-center justify-center gap-2 sm:justify-end">
      {active.map((key) => {
        const info = SKILLS[key];
        const wait = unit.cooldowns[key] ?? 0;
        const aim = info.aim === "ally" || info.aim === "enemy" ? "target" : "self";
        return (
          <button key={key} type="button" title={t(`skills.${key}.desc`)} disabled={!canUseSkill(state, unit, key)} onClick={() => onSkill(key, aim)} className={GOLD}>
            <Sparkles className="h-4 w-4" aria-hidden />
            {t(`skills.${key}.name`)}
            {wait > 0 && <span className="tabular-nums text-text-secondary">{wait}</span>}
          </button>
        );
      })}
      {interactables.map((id) => {
        const spot = state.interactables.find((i) => i.id === id);
        return (
          <button key={id} type="button" onClick={() => onInteract(id)} className={GOLD}>
            <DoorOpen className="h-4 w-4" aria-hidden />
            {t(`interact.${spot?.labelKey ?? "openGate"}`)}
          </button>
        );
      })}
      <button type="button" onClick={onWait} className={STONE}>
        <Check className="h-4 w-4" aria-hidden />
        {t("action.wait")}
      </button>
      {canCancel && (
        <button type="button" onClick={onCancel} className={STONE}>
          <Undo2 className="h-4 w-4" aria-hidden />
          {t("action.cancel")}
        </button>
      )}
    </div>
  );
}
