"use client";

import { useId, useState } from "react";
import { Search, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import Modal from "@/components/ui/Modal";
import type { CountryGroup } from "@/actions/home";
import { getCountryFlag } from "@/lib/utils/countryFlag";
import { getCountryContinent, groupTimelineCountries, type TimelineContinent } from "../continents";
import { getTimelinePath } from "../pagination";

const focus = 'outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent';
const chip = 'inline-flex min-h-11 min-w-0 max-w-full items-center justify-center gap-2 rounded-full border px-3.5 py-2 text-sm font-semibold ' + focus;
const colors = (active: boolean) => active ? ' border-accent/60 bg-accent/10 text-accent hover:bg-accent/20' : ' border-white/15 text-text-primary hover:border-white/40 hover:bg-white/5 hover:text-accent';
const levels = ['continent', 'country'] as const;

export default function CountryPickerModal({ countries, selectedCountry, defaultCountry, initialLevel, onClose }: {
  countries: CountryGroup[]; selectedCountry: string; defaultCountry: string;
  initialLevel: 'continent' | 'country'; onClose: () => void;
}) {
  const t = useTranslations('explore.ui.timeline');
  const id = useId();
  const [level, setLevel] = useState(initialLevel);
  const [continent, setContinent] = useState<TimelineContinent>(getCountryContinent(selectedCountry));
  const [query, setQuery] = useState('');
  const groups = groupTimelineCountries(countries);
  const active = groups.find(group => group.id === continent) ?? groups[0];
  const search = query.trim().normalize('NFKC').toLocaleLowerCase();
  const options = search ? countries.filter(country => (country.name + ' ' + country.code).normalize('NFKC').toLocaleLowerCase().includes(search)) : active?.countries ?? [];
  const changeLevel = (next: typeof level) => { setLevel(next); setQuery(''); };
  return <Modal isOpen onClose={onClose} title={t('countryNav')} titleClassName="text-center text-text-primary" size="xl" stickyHeader frame="plain" boxClassName="rounded-panel border border-white/20 bg-bg-main">
    <div className="sticky top-0 z-10 space-y-3 bg-bg-main px-4 pt-3 pb-3 sm:px-5">
      <div role="tablist" aria-label={t('countryNav')} className="grid grid-cols-2 border-b border-white/10">
        {levels.map((item, index) => <button key={item} type="button" role="tab" id={id + '-' + item} aria-controls={id + '-options'} aria-selected={level === item} tabIndex={level === item ? 0 : -1}
          onClick={() => changeLevel(item)} onKeyDown={event => {
            const next = event.key === 'Home' ? 0 : event.key === 'End' ? 1 : ['ArrowLeft', 'ArrowRight'].includes(event.key) ? 1 - index : null;
            if (next === null) return;
            event.preventDefault(); changeLevel(levels[next]); document.getElementById(id + '-' + levels[next])?.focus();
          }} className={'min-h-11 border-b-2 px-2 text-sm font-semibold hover:bg-white/5 hover:text-accent ' + focus + (level === item ? ' border-accent text-accent' : ' border-transparent text-text-secondary')}>
          {t(item + 'Label')}
        </button>)}
      </div>
      <div className="relative">
        <Search size={16} aria-hidden className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-text-secondary" />
        <input type="search" value={query} onChange={event => { setQuery(event.target.value); setLevel('country'); }} aria-label={t('countrySearch')} placeholder={t('countrySearch')}
          className="min-h-11 w-full rounded-control border border-white/15 bg-bg-card ps-9 pe-11 text-sm text-text-primary outline-none placeholder:text-text-tertiary focus:border-accent/50"
          onKeyDown={event => { if (event.key === 'Escape' && query) { event.stopPropagation(); setQuery(''); } }} />
        {query && <button type="button" aria-label={t('clearSearch')} onClick={() => setQuery('')} className={'absolute end-0 top-0 grid size-11 place-items-center text-text-secondary hover:text-accent ' + focus}><X size={16} aria-hidden /></button>}
      </div>
    </div>
    <div role="tabpanel" id={id + '-options'} aria-labelledby={id + '-' + level} className="px-4 pb-5 sm:px-5" data-timeline-picker={level}>
      {level === 'country' && !search && active && <p className="mb-3 text-center text-xs text-text-secondary">{t('continent.' + active.id)}</p>}
      <div className="flex flex-wrap justify-center gap-2">
        {level === 'continent' && groups.map(group => <button key={group.id} type="button" aria-pressed={group.id === active?.id} onClick={() => { setContinent(group.id); changeLevel('country'); }} className={chip + colors(group.id === active?.id)}>
          {t('continent.' + group.id)}<span className="text-xs font-normal text-text-tertiary">{group.countries.length}</span>
        </button>)}
        {level === 'country' && options.map(country => <Link key={country.code} href={getTimelinePath(country.code, defaultCountry)} prefetch={false} onClick={onClose} aria-current={country.code === selectedCountry ? 'page' : undefined} className={chip + colors(country.code === selectedCountry)}>
          <span aria-hidden>{getCountryFlag(country.code)}</span><span className="min-w-0 break-keep [overflow-wrap:anywhere]">{country.name}</span><span className="text-xs font-normal text-text-tertiary">{country.count}</span>
        </Link>)}
      </div>
      {level === 'country' && !options.length && <p className="py-8 text-center text-sm text-text-secondary">{t('noCountries')}</p>}
    </div>
  </Modal>;
}
