"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { EXPLORE_NAV_LAYOUT as nav } from "@/components/shared/exploreNavLayout";
import type { CountryGroup } from "@/actions/home";
import type { EraInfo } from "../utils";
import CountryPicker from "./CountryPicker";
import TimelineGlobe from "./TimelineGlobe";

export default function TimelineCountryHeader({ countries, country, defaultCountry, eras }: {
  countries: CountryGroup[]; country: string; defaultCountry: string; eras: { era: EraInfo; href: string }[];
}) {
  const t = useTranslations('explore.ui.timeline');
  return <header className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr)_280px] md:gap-x-8">
    <CountryPicker countries={countries} selectedCountry={country} defaultCountry={defaultCountry} />
    <TimelineGlobe countries={countries} country={country} defaultCountry={defaultCountry} />
    {eras.length > 1 && <nav aria-label={t('eraNav')} className="flex flex-wrap items-center justify-center gap-1.5 md:col-start-1 md:row-start-2 md:self-start">
      {eras.map(({ era, href }) => <Link key={era.key} href={href} prefetch={false} className={nav.chip + ' ' + nav.pill + ' ' + nav.chipIdle.pill + ' max-md:px-2 max-md:text-xs outline-none focus-visible:ring-2 focus-visible:ring-accent'}>
        {t('eras.' + era.key)}
      </Link>)}
    </nav>}
  </header>;
}
