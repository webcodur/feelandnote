/*
  파일명: components/features/game/myth/troy/ui/HeroPickCard.tsx
  기능: 트로이 전쟁 출진 영웅 칸
  책임: 영웅 하나의 얼굴·이름·병과·수준·체력·힘·방어를 보이고 누르면 고르거나 뺀다. 고른 칸은 금테, 반드시 나가는 영웅은 표시를 단다.
*/ // ------------------------------
"use client";

import { Check, Lock } from "lucide-react";
import { useTranslations } from "next-intl";
import { celebAvatarSmallUrl } from "@feelandnote/shared/constants/celeb-avatar-small";
import type { RosterEntry } from "../engine";
import type { Names } from "./useNames";

interface Props {
  hero: RosterEntry;
  names: Names;
  on: boolean;
  forced: boolean;
  full: boolean;
  onToggle: () => void;
}

export default function HeroPickCard({ hero, names, on, forced, full, onToggle }: Props) {
  const t = useTranslations("gameMythTroy");
  const figure = names.figure(hero.slug);
  const avatar = celebAvatarSmallUrl(figure?.avatarUrl) ?? figure?.avatarUrl ?? null;
  const name = names.figureName(hero.slug);
  const blocked = !on && full;
  return (
    <button type="button" onClick={onToggle} aria-pressed={on} disabled={blocked}
      className={`relative flex w-full min-h-11 items-center gap-2.5 rounded-xl border-2 p-2 text-start disabled:cursor-not-allowed disabled:opacity-50 ${on ? "border-accent bg-accent/10" : "border-border bg-bg-card hover:border-accent-dim"}`}>
      <span className="relative h-11 w-11 shrink-0 overflow-hidden rounded-full border border-border bg-bg-stone-light">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {avatar && <img src={avatar} alt="" className="h-full w-full object-cover" decoding="async" />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-bold text-text-primary">{name}</span>
        <span className="block truncate text-sm text-text-secondary">{t(`classes.${hero.classKey}`)} · {t("prep.level", { level: hero.level })}</span>
        <span className="block text-sm tabular-nums text-text-tertiary">{t("unit.hp")} {hero.stats.hp} · {t("unit.stats.str")} {hero.stats.str}</span>
      </span>
      {on && !forced && <Check className="absolute end-1.5 top-1.5 h-4 w-4 text-accent" aria-hidden />}
      {forced && <Lock className="absolute end-1.5 top-1.5 h-4 w-4 text-accent" aria-label={t("prep.forced")} />}
    </button>
  );
}
