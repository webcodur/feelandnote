/*
  파일명: components/features/game/myth/troy/ui/battle/ForecastCard.tsx
  기능: 트로이 전쟁 싸움 예측 칸
  책임: 공격하기 전에 양쪽 피해·명중·치명·칠 횟수·남을 체력과 보정 이유(인연·맞수·높은 곳…)를 나란히 보여 주고, 공격·취소 단추를 둔다.
*/ // ------------------------------
"use client";

import { Swords, X } from "lucide-react";
import { useTranslations } from "next-intl";
import type { Forecast, ForecastSide, Unit } from "../../engine";
import type { Names } from "../useNames";

interface Props {
  forecast: Forecast;
  attacker: Unit;
  defender: Unit;
  names: Names;
  onConfirm: () => void;
  onCancel: () => void;
}

function Column({ side, unit, foe, names, tone }: { side: ForecastSide; unit: Unit; foe: ForecastSide; names: Names; tone: "ours" | "theirs" }) {
  const t = useTranslations("gameMythTroy.forecast");
  const color = tone === "ours" ? "text-hg-morale" : "text-status-paused";
  const left = foe.foeHpIfAllHit;
  return (
    <div className={`flex min-w-0 flex-1 flex-col gap-1 ${tone === "theirs" ? "items-end text-end" : ""}`}>
      <p className={`truncate text-sm font-bold ${color}`}>{names.unitName(unit)}</p>
      <p className="text-sm tabular-nums text-text-secondary">{side.hp} → <span className="font-bold text-text-primary">{left}</span> / {side.maxHp}</p>
      <dl className="mt-1 grid w-full grid-cols-3 gap-1">
        {[["damage", side.strikes > 0 ? `${side.damage}${side.strikes > 1 ? `×${side.strikes}` : ""}` : "—"], ["hit", side.strikes > 0 ? `${side.hit}%` : "—"], ["crit", side.strikes > 0 ? `${side.crit}%` : "—"]].map(([k, v]) => (
          <div key={k} className="rounded-md bg-bg-card py-1 text-center">
            <dt className="text-sm text-text-tertiary">{t(k)}</dt>
            <dd className="text-base font-black tabular-nums text-text-primary">{v}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

export default function ForecastCard({ forecast, attacker, defender, names, onConfirm, onCancel }: Props) {
  const t = useTranslations("gameMythTroy");
  const notes = forecast.notes.map((note) => {
    const name = note.key === "bond" && note.value ? names.figureName(note.value) : note.key === "skill" && note.value ? t(`skills.${note.value}.name`) : "";
    return { id: `${note.key}-${note.who}-${note.value ?? ""}`, who: note.who, text: t(`forecast.notes.${note.key}`, { name }) };
  });
  const unique = notes.filter((n, i) => notes.findIndex((m) => m.id === n.id) === i);
  const canKill = forecast.attacker.strikes > 0 && forecast.attacker.foeHpIfAllHit === 0;
  return (
    <div className="pointer-events-auto w-full rounded-2xl border border-border-gold bg-bg-main/95 p-3 shadow-[0_18px_40px_-16px_var(--color-bg-main)] backdrop-blur-sm sm:w-[26rem] sm:p-4" role="dialog" aria-label={t("forecast.heading")}>
      <div className="flex items-start gap-3">
        <Column side={forecast.attacker} unit={attacker} foe={forecast.defender} names={names} tone="ours" />
        <Swords className="mt-6 h-5 w-5 shrink-0 text-accent" aria-hidden />
        <Column side={forecast.defender} unit={defender} foe={forecast.attacker} names={names} tone="theirs" />
      </div>
      {(unique.length > 0 || canKill || forecast.defender.strikes === 0) && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {canKill && <span className="rounded-md bg-status-paused/20 px-2 py-0.5 text-sm font-bold text-status-paused">{t("forecast.ko")}</span>}
          {forecast.defender.strikes === 0 && <span className="rounded-md border border-border px-2 py-0.5 text-sm text-text-secondary">{t("forecast.noCounter")}</span>}
          {unique.map((n) => (
            <span key={n.id} className={`rounded-md border px-2 py-0.5 text-sm font-semibold ${n.who === "attacker" ? "border-hg-morale text-hg-morale" : "border-status-paused text-status-paused"}`}>{n.text}</span>
          ))}
        </div>
      )}
      <div className="mt-3 flex gap-2">
        <button type="button" onClick={onCancel} className="inline-flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-lg border border-border bg-bg-card text-sm font-semibold text-text-secondary hover:border-accent hover:text-accent">
          <X className="h-4 w-4" aria-hidden />{t("action.cancel")}
        </button>
        <button type="button" onClick={onConfirm} className="inline-flex min-h-11 flex-[2] items-center justify-center gap-1.5 rounded-lg border border-accent-hover/40 bg-accent text-base font-bold text-bg-main hover:bg-accent-hover">
          <Swords className="h-4 w-4" aria-hidden />{t("action.confirm")}
        </button>
      </div>
    </div>
  );
}
