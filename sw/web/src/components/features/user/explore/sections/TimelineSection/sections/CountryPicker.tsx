"use client";

import { useMemo, useState } from "react";
import { ChevronDown, Search, X } from "lucide-react";
import { getCountryFlag } from "@/lib/utils/countryFlag";
import type { CountryGroup } from "@/actions/home";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import BottomSheet from "@/components/ui/BottomSheet";
import { useMouseDragScroll } from "@/hooks/useMouseDragScroll";
import { MYTH_LAYOUT as layout } from "@/components/features/user/explore/myth/mythLayout";
import { getTimelinePath } from "../pagination";
import { getCountryContinent, groupTimelineCountries } from "../continents";

interface Props {
  countries: CountryGroup[];
  selectedCountry: string;
  countrySearch: string;
  onSearchChange: (value: string) => void;
  defaultCountry: string;
}

const focusClass = "outline-none focus-visible:ring-2 focus-visible:ring-accent";

export default function CountryPicker({ countries, selectedCountry, countrySearch, onSearchChange, defaultCountry }: Props) {
  const t = useTranslations("explore.ui.timeline");
  const [sheet, setSheet] = useState<"continent" | "country" | null>(null);
  const groups = useMemo(() => groupTimelineCountries(countries), [countries]);
  const active = groups.find((group) => group.id === getCountryContinent(selectedCountry)) ?? groups[0];
  const selected = countries.find((country) => country.code === selectedCountry);
  const { ref: continentRef, dragProps: continentDragProps, cursorClassName: continentCursor } = useMouseDragScroll();
  const { ref: countryRef, dragProps: countryDragProps, cursorClassName: countryCursor } = useMouseDragScroll();
  const query = countrySearch.trim().toLowerCase();
  const filteredCountries = (active?.countries ?? []).filter((country) =>
    !query || country.name.toLowerCase().includes(query) || country.code.toLowerCase().includes(query),
  );

  if (!active) return null;

  const searchField = <div className="relative mx-auto w-full max-w-xs">
    <Search size={16} aria-hidden className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
    <input type="text" value={countrySearch} onChange={(event) => onSearchChange(event.target.value)}
      aria-label={t("countrySearch")} placeholder={t("countrySearch")}
      className="w-full rounded-lg border border-white/10 bg-bg-card py-2 pl-9 pr-8 text-sm text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:border-accent/50" />
    {countrySearch && <button type="button" aria-label={t("clearSearch")} onClick={() => onSearchChange("")}
      className={`absolute right-2 top-1/2 -translate-y-1/2 rounded text-text-secondary hover:text-accent ${focusClass}`}>
      <X size={14} aria-hidden />
    </button>}
  </div>;

  const continentLinks = (mobile = false) => groups.map((group) => {
    const isActive = group.id === active.id;
    return <Link key={group.id}
      href={getTimelinePath(isActive ? selectedCountry : group.countries[0].code, defaultCountry)}
      prefetch={false} aria-current={isActive ? "page" : undefined} onClick={() => setSheet(null)}
      className={`flex shrink-0 snap-start items-center justify-center border px-3.5 py-2 text-sm font-semibold ${mobile ? "w-full rounded-lg" : layout.regionChipShape} ${focusClass} ${isActive
        ? "border-accent bg-accent/10 text-accent hover:bg-accent/20"
        : "border-white/[0.18] bg-white/[0.04] text-text-secondary hover:border-accent/60 hover:bg-accent/[0.05] hover:text-accent"}`}>
      {t(`continent.${group.id}`)}
    </Link>;
  });

  const countryLinks = (mobile = false) => filteredCountries.map((country) => {
    const isActive = country.code === selectedCountry;
    return <Link key={country.code} href={getTimelinePath(country.code, defaultCountry)} prefetch={false}
      aria-current={isActive ? "page" : undefined} onClick={() => setSheet(null)}
      className={`flex shrink-0 snap-start items-center gap-1.5 rounded-lg border px-3.5 py-2 text-sm font-semibold ${mobile ? "w-full" : "whitespace-nowrap"} ${focusClass} ${isActive
        ? "border-accent bg-accent/10 text-accent hover:bg-accent/20"
        : "border-white/[0.18] bg-white/[0.04] text-text-secondary hover:border-accent/60 hover:bg-accent/[0.05] hover:text-accent"}`}>
      <span aria-hidden>{getCountryFlag(country.code)}</span>
      <span className="min-w-0 truncate">{country.name}</span>
      <span className="ml-auto text-xs opacity-60">{country.count}</span>
    </Link>;
  });

  return <div className={layout.navigation}>
    <div className={layout.mobilePicker}>
      <button type="button" aria-haspopup="dialog" aria-label={`${t("continentNav")}: ${t(`continent.${active.id}`)}`}
        onClick={() => setSheet("continent")} className={`${layout.mobilePickerButton} ${focusClass}`}>
        <span className="truncate">{t(`continent.${active.id}`)}</span><ChevronDown size={15} aria-hidden className="shrink-0" />
      </button>
      <button type="button" aria-haspopup="dialog" aria-label={`${t("countryNav")}: ${selected?.name ?? ""}`}
        onClick={() => setSheet("country")} className={`${layout.mobilePickerButton} ${focusClass}`}>
        <span className="truncate">{selected?.name}</span><ChevronDown size={15} aria-hidden className="shrink-0" />
      </button>
    </div>
    <nav className={layout.chipNav} aria-label={t("continentNav")}>
      <div ref={continentRef} {...continentDragProps} className={`${layout.navList} ${continentCursor}`}>
        {continentLinks()}
      </div>
    </nav>
    <nav className={`${layout.chipNav} space-y-3 border-t border-white/[0.06]`} aria-label={t("countryNav")}>
      {searchField}
      <div ref={countryRef} {...countryDragProps} className={`${layout.navList} ${countryCursor}`}>
        {countryLinks()}
      </div>
      {!filteredCountries.length && <p className="py-2 text-center text-sm text-text-secondary">{t("noCountries")}</p>}
    </nav>
    <BottomSheet isOpen={sheet !== null} onClose={() => setSheet(null)} title={t(sheet === "continent" ? "continentNav" : "countryNav")}>
      <div className="space-y-3 p-4">
        {sheet === "country" && searchField}
        <div className="grid grid-cols-2 gap-2">
          {sheet === "continent" ? continentLinks(true) : countryLinks(true)}
        </div>
        {sheet === "country" && !filteredCountries.length && <p className="py-2 text-center text-sm text-text-secondary">{t("noCountries")}</p>}
      </div>
    </BottomSheet>
  </div>;
}
