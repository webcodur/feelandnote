"use client";

import { useTranslations } from "next-intl";
import { ChevronsDownUp, ChevronsUpDown } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { EXPLORE_NAV_LAYOUT as nav } from "@/components/shared/exploreNavLayout";
import type { CountryGroup } from "@/actions/home";
import type { EraInfo } from "../utils";
import CountryPicker from "./CountryPicker";
import TimelineGlobe from "./TimelineGlobe";

export default function TimelineCountryHeader({ countries, country, defaultCountry, eras, canToggleAll, allCollapsed, onToggleAll }: {
  countries: CountryGroup[]; country: string; defaultCountry: string; eras: { era: EraInfo; href: string }[];
  canToggleAll: boolean; allCollapsed: boolean; onToggleAll: () => void;
}) {
  const t = useTranslations('explore.ui.timeline');
  return <header className="overflow-hidden rounded-2xl border border-white/10 bg-bg-card/50" data-timeline-panel>
    <div className="grid grid-cols-1 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
      <div className="order-2 px-3 md:order-1 md:border-e md:border-white/[0.08] md:px-4">
        <TimelineGlobe countries={countries} country={country} defaultCountry={defaultCountry} />
      </div>
      <div className="order-1 flex items-center p-3 md:order-2 md:p-6">
        <CountryPicker countries={countries} selectedCountry={country} defaultCountry={defaultCountry} />
      </div>
    </div>
    {(eras.length > 1 || canToggleAll) && <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 border-t border-white/[0.08] bg-black/10 px-3 py-2 md:flex md:gap-x-4 md:px-5" data-timeline-toolbar>
      {eras.length > 1 && <span className="text-[11px] font-medium text-text-tertiary md:hidden">{t('eraNav')}</span>}
      {eras.length > 1 && <nav aria-label={t('eraNav')} className="col-span-2 row-start-2 flex min-w-0 flex-wrap items-center gap-1 md:flex-1 md:gap-1.5">
        {eras.map(({ era, href }) => <Link key={era.key} href={href} prefetch={false} className={nav.chip + ' ' + nav.pill + ' ' + nav.chipIdle.pill + ' max-md:px-1.5 max-md:text-xs outline-none focus-visible:ring-2 focus-visible:ring-accent'}>
          {t('eras.' + era.key)}
        </Link>)}
      </nav>}
      {canToggleAll && <button type="button" onClick={onToggleAll} className="col-start-2 row-start-1 flex min-h-9 shrink-0 items-center gap-1.5 rounded-control px-2 text-xs text-text-secondary outline-none hover:bg-white/5 hover:text-text-primary focus-visible:ring-2 focus-visible:ring-accent md:min-h-11 md:text-sm">
        {allCollapsed && <ChevronsUpDown size={15} aria-hidden />}
        {!allCollapsed && <ChevronsDownUp size={15} aria-hidden />}
        {t(allCollapsed ? 'expandAll' : 'collapseAll')}
      </button>}
    </div>}
  </header>;
}
