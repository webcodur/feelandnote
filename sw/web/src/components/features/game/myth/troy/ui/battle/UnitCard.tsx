/*
  파일명: components/features/game/myth/troy/ui/battle/UnitCard.tsx
  기능: 트로이 전쟁 장수 정보 칸
  책임: 고르거나 가리킨 장수의 얼굴·이름·병과·수준·체력·능력치·상태·기술을 보여 준다. 편마다 색 띠가 다르다.
        휴대폰에서는 얼굴·이름·체력·능력치 한 줄만, 넓은 화면에서는 기술까지 펼친다.
        쓰러지면 지는 장수·쓰러뜨리면 이기는 장수에는 이름 곁에 그 표시를 단다.
*/ // ------------------------------
"use client";

import { useTranslations } from "next-intl";
import { celebAvatarSmallUrl } from "@feelandnote/shared/constants/celeb-avatar-small";
import { SKILLS } from "../../engine";
import type { Side, StatKey, Unit } from "../../engine";
import type { Names } from "../useNames";

const SIDE_TEXT: Record<Side, string> = { player: "text-hg-morale", ally: "text-status-watching", enemy: "text-status-paused" };
const SIDE_BAR: Record<Side, string> = { player: "bg-hg-morale", ally: "bg-status-watching", enemy: "bg-status-paused" };
const SIDE_RING: Record<Side, string> = { player: "border-hg-morale", ally: "border-status-watching", enemy: "border-status-paused" };
const STATS: StatKey[] = ["str", "skl", "spd", "def", "res", "mov"];

interface Props {
  unit: Unit;
  names: Names;
  // 이 판의 승패가 걸린 장수인가(guard: 쓰러지면 진다, target: 쓰러뜨리면 이긴다)
  stake?: "guard" | "target" | null;
}

const STAKE = { guard: "border-status-paused text-status-paused", target: "border-accent text-accent" } as const;

export default function UnitCard({ unit, names, stake = null }: Props) {
  const t = useTranslations("gameMythTroy");
  const figure = unit.figureSlug ? names.figure(unit.figureSlug) : null;
  const avatar = celebAvatarSmallUrl(figure?.avatarUrl) ?? figure?.avatarUrl ?? null;
  const name = names.unitName(unit);
  const ratio = Math.max(0, Math.min(1, unit.hp / unit.stats.hp));
  const sideKey = unit.side === "player" ? "ours" : unit.side;
  const skills = unit.skills.filter((key) => SKILLS[key]);
  return (
    <div className="pointer-events-auto w-full rounded-2xl border border-border bg-bg-main/92 p-3 shadow-[0_18px_40px_-16px_var(--color-bg-main)] backdrop-blur-sm sm:w-80 sm:p-4">
      <div className="flex items-center gap-3">
        <div className={`relative h-14 w-14 shrink-0 overflow-hidden rounded-full border-2 bg-bg-stone-light ${SIDE_RING[unit.side]}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {avatar && <img src={avatar} alt="" className="h-full w-full object-cover" decoding="async" />}
          {!avatar && <span className="flex h-full w-full items-center justify-center text-xl font-black text-text-secondary">{[...name][0]}</span>}
        </div>
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-2">
            <span className="truncate text-base font-bold text-text-primary">{name}</span>
            {stake && <span className={`shrink-0 rounded-md border px-1.5 text-sm font-semibold ${STAKE[stake]}`}>{t(stake === "guard" ? "unit.mustLive" : "unit.winTarget")}</span>}
          </p>
          <p className="text-sm text-text-secondary">
            <span className={`font-semibold ${SIDE_TEXT[unit.side]}`}>{t(`unit.${sideKey}`)}</span>
            {" · "}{t(`classes.${unit.classKey}`)}{" · "}{t("unit.level", { level: unit.level })}
          </p>
          <div className="mt-1.5 flex items-center gap-2">
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-bg-stone-light" role="meter" aria-valuemin={0} aria-valuemax={unit.stats.hp} aria-valuenow={unit.hp} aria-label={t("unit.hp")}>
              <div className={`h-full rounded-full ${SIDE_BAR[unit.side]}`} style={{ width: `${ratio * 100}%` }} />
            </div>
            <span className="text-sm font-bold tabular-nums text-text-primary">{unit.hp}/{unit.stats.hp}</span>
          </div>
        </div>
      </div>
      <dl className="mt-3 grid grid-cols-6 gap-1 text-center">
        {STATS.map((key) => (
          <div key={key} className="rounded-md bg-bg-card px-0.5 py-1">
            <dt className="text-sm text-text-tertiary">{t(`unit.stats.${key}`)}</dt>
            <dd className="text-sm font-bold tabular-nums text-text-primary">{unit.stats[key]}</dd>
          </div>
        ))}
      </dl>
      {(unit.statuses.length > 0 || skills.length > 0) && (
        <div className="mt-2 hidden flex-wrap gap-1.5 sm:flex">
          {unit.statuses.map((s) => (
            <span key={s.key} className="rounded-md border border-accent-dim px-2 py-0.5 text-sm font-semibold text-accent">{t(`statuses.${s.key}`)}</span>
          ))}
          {skills.map((key) => (
            <span key={key} title={t(`skills.${key}.desc`)} className="rounded-md border border-border px-2 py-0.5 text-sm text-text-secondary">{t(`skills.${key}.name`)}</span>
          ))}
        </div>
      )}
      {unit.acted && unit.side === "player" && <p className="mt-2 text-sm text-text-tertiary">{t("unit.acted")}</p>}
    </div>
  );
}
