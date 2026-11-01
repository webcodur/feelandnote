"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ChevronDown } from "lucide-react";
import { ageRangeToBirthYears, birthYearsToAgeRange, type AgeRange } from "@/lib/celeb/ageFilter";
import { BIRTH_YEAR_MIN } from "@/lib/celeb/birthYearScale";
import { getKSTDateKey } from "@/lib/game/date-seed";

type AgeSelection = "atMost" | "atLeast" | "range";

export default function CelebAgeFilter({ min, max, onChange, referenceYear = Number(getKSTDateKey().slice(0, 4)) }: {
  min?: number;
  max?: number;
  onChange: (min: number | undefined, max: number | undefined) => void;
  referenceYear?: number;
}) {
  const t = useTranslations("home.ui.birthYear.age");
  const isKo = useLocale() === "ko";
  const age = birthYearsToAgeRange({ min, max }, referenceYear);
  const [selection, setSelection] = useState<AgeSelection>(() =>
    age.min !== undefined && age.max !== undefined ? "range" : age.min !== undefined ? "atLeast" : "atMost");
  const commit = (next: AgeRange) => {
    const birth = ageRangeToBirthYears(next, referenceYear);
    onChange(birth.min, birth.max);
  };
  const choose = (next: AgeSelection) => {
    setSelection(next);
    if (next === "range") return;
    const value = selection === "range" ? (next === "atLeast" ? age.min ?? age.max : age.max ?? age.min)
      : selection === "atLeast" ? age.min ?? age.max : age.max ?? age.min;
    commit(next === "atLeast" ? { min: value } : { max: value });
  };
  const change = (bound: "min" | "max", raw: string) => {
    const parsed = raw === "" ? undefined : Number(raw);
    if (parsed !== undefined && !Number.isFinite(parsed)) return;
    const value = parsed === undefined ? undefined : Math.max(0, Math.min(Math.floor(parsed), referenceYear - BIRTH_YEAR_MIN));
    if (selection !== "range") return commit({ [selection === "atLeast" ? "min" : "max"]: value });
    const next = { ...age, [bound]: value };
    if (next.min !== undefined && next.max !== undefined && next.min > next.max) {
      if (bound === "min") next.max = next.min;
      else next.min = next.max;
    }
    commit(next);
  };
  const bounds = selection === "range" ? ["min", "max"] as const : [selection === "atLeast" ? "min" : "max"] as const;
  const numbers = (
    <div className="flex min-w-0 flex-1 items-center gap-2">
      {bounds.map((bound, index) => (
        <span key={`${selection}-${bound}`} className="contents">
          {index > 0 && <span className="shrink-0 text-sm text-text-secondary">{t("and")}</span>}
          <input key={`${selection}-${bound}-${age[bound] ?? ""}`} type="number" min={0} max={referenceYear - BIRTH_YEAR_MIN} step={1} inputMode="numeric"
            aria-label={t(bound === "min" ? "minimum" : "maximum")}
            defaultValue={age[bound] ?? ""} placeholder={t("unbounded")} onBlur={event => change(bound, event.target.value)}
            onKeyDown={event => { if (event.key === "Enter") { event.preventDefault(); change(bound, event.currentTarget.value); } }}
            className="h-11 w-full min-w-0 flex-1 rounded-control border border-line bg-white/5 px-3 text-center text-text-primary outline-none focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent" />
        </span>
      ))}
      <span className="shrink-0 text-sm text-text-secondary">{t("unit")}</span>
    </div>
  );
  const condition = (
    <div className="relative shrink-0">
      <select aria-label={t("selection")} value={selection} onChange={event => choose(event.target.value as AgeSelection)}
        className="h-11 appearance-none rounded-control border border-accent/40 bg-bg-card py-2 ps-3 pe-8 text-sm text-accent hover:border-accent/70 hover:bg-bg-raised outline-none focus-visible:ring-2 focus-visible:ring-accent">
        {(["atMost", "atLeast", "range"] as const).map(value => <option key={value} value={value}>{t(value)}</option>)}
      </select>
      <ChevronDown size={14} aria-hidden className="pointer-events-none absolute end-2.5 top-1/2 -translate-y-1/2 text-accent" />
    </div>
  );

  return (
    <div className="space-y-3 p-3">
      <div className="flex items-center gap-2" role="group" aria-label={t("selection")}>
        {isKo ? <>{numbers}{condition}</> : <>{condition}{numbers}</>}
      </div>
      <p className="text-xs leading-5 text-text-tertiary">{t("basis", { year: referenceYear })}</p>
    </div>
  );
}
