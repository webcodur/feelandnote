"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, ListFilter } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { CountryGroup } from "@/actions/home";
import { getCountryFlag } from "@/lib/utils/countryFlag";
import { getTimelinePath } from "../pagination";
import { getCountryContinent, groupTimelineCountries } from "../continents";
import CountryPickerModal from "./CountryPickerModal";

export default function CountryPicker({ countries, selectedCountry, defaultCountry }: {
  countries: CountryGroup[]; selectedCountry: string; defaultCountry: string;
}) {
  const t = useTranslations("explore.ui.timeline");
  const ui = useTranslations("explore.ui");
  const [sheet, setSheet] = useState<'continent' | 'country' | null>(null);
  const groups = useMemo(() => groupTimelineCountries(countries), [countries]);
  const active = groups.find(group => group.id === getCountryContinent(selectedCountry)) ?? groups[0];
  const selected = countries.find(country => country.code === selectedCountry);
  if (!active || !selected) return null;
  const rows = [
    { kind: 'continent' as const, value: active.id, name: t('continent.' + active.id), flag: '', count: active.countries.length,
      options: groups.map(group => ({ value: group.id, name: t('continent.' + group.id), code: group.id === active.id ? selectedCountry : group.countries[0].code })) },
    { kind: 'country' as const, value: selectedCountry, name: selected.name, flag: getCountryFlag(selectedCountry), count: selected.count,
      options: active.countries.map(country => ({ value: country.code, name: country.name, code: country.code })) },
  ];
  const focus = 'outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent';
  return <div className="flex w-full min-w-0 flex-col gap-2 md:gap-3" data-timeline-navigation>
    {rows.map(row => {
      const index = row.options.findIndex(option => option.value === row.value);
      const previous = row.options[(index - 1 + row.options.length) % row.options.length];
      const next = row.options[(index + 1) % row.options.length];
      const label = t(row.kind + 'Label');
      const arrowClass = 'grid min-h-12 place-items-center text-text-secondary hover:bg-white/10 hover:text-accent ' + focus;
      return <nav key={row.kind} aria-label={t(row.kind + 'Nav')}
        className={'grid grid-cols-[2.75rem_minmax(0,1fr)_2.75rem] items-stretch overflow-hidden rounded-lg border md:grid-cols-[3rem_2.75rem_minmax(0,1fr)_2.75rem] ' + (row.kind === 'country' ? 'min-h-16 border-accent/25 bg-accent/[0.04] md:min-h-24' : 'min-h-12 border-white/10 bg-white/[0.02]')}
        data-timeline-level={row.kind} data-selected={row.value}>
        <span className="hidden items-center justify-center ps-2 text-xs font-medium text-text-secondary md:flex">{label}</span>
        {row.options.length > 1 && <Link href={getTimelinePath(previous.code, defaultCountry)} prefetch={false} className={arrowClass} aria-label={ui('prev') + ' ' + label + ': ' + previous.name}><ChevronLeft size={17} aria-hidden /></Link>}
        {row.options.length < 2 && <span />}
        <button type="button" aria-haspopup="dialog" aria-label={t(row.kind + 'Nav') + ': ' + row.name} onClick={() => setSheet(row.kind)}
          className={'flex min-w-0 items-center justify-center px-2 py-2 text-center font-semibold hover:bg-white/5 hover:text-accent ' + focus + (row.kind === 'country' ? ' flex-col gap-1 text-accent' : ' flex-wrap gap-2 text-text-primary')}>
          <span className={'flex min-w-0 items-center justify-center gap-2 ' + (row.kind === 'country' ? 'text-lg md:text-2xl' : 'text-sm md:text-base')}>
            {row.flag && <span aria-hidden className="shrink-0 text-xs md:text-sm">{row.flag}</span>}
            <span className="min-w-0 break-keep [overflow-wrap:anywhere]">{row.name}</span>
          </span>
          <span className="flex items-center justify-center gap-2 text-xs font-normal text-text-secondary">
            {t(row.kind === 'country' ? 'figureCount' : 'countryCount', { count: row.count })}
            <ListFilter size={12} aria-hidden className="shrink-0" />
          </span>
        </button>
        {row.options.length > 1 && <Link href={getTimelinePath(next.code, defaultCountry)} prefetch={false} className={arrowClass} aria-label={ui('next') + ' ' + label + ': ' + next.name}><ChevronRight size={17} aria-hidden /></Link>}
        {row.options.length < 2 && <span />}
      </nav>;
    })}
    {sheet && <CountryPickerModal countries={countries} selectedCountry={selectedCountry} defaultCountry={defaultCountry} initialLevel={sheet} onClose={() => setSheet(null)} />}
    <noscript><nav aria-label={t('countryNav')} className="flex flex-wrap justify-center gap-2">
      {countries.map(country => <Link key={country.code} href={getTimelinePath(country.code, defaultCountry)} prefetch={false} className="rounded-control px-2 py-2 hover:text-accent">{country.name}</Link>)}
    </nav></noscript>
  </div>;
}
