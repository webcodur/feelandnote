"use client";

import { useMemo, useState } from "react";
import { ChevronDown, Search, X } from "lucide-react";
import { getCountryFlag } from "@/lib/utils/countryFlag";
import type { CountryGroup } from "@/actions/home";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import Modal from "@/components/ui/Modal";
import { useMouseDragScroll } from "@/hooks/useMouseDragScroll";
import { EXPLORE_NAV_LAYOUT as atlas } from "@/components/shared/exploreNavLayout";
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
/** 모달 안의 칩 — 손가락으로 누르므로 넓은 화면 칩 줄(atlas.chip)보다 높게 둔다 */
const SHEET_CHIP = "flex min-h-10 w-full items-center gap-1.5 rounded-lg border px-3 text-sm font-semibold";

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
      className="w-full rounded-lg border border-white/10 bg-bg-card py-1.5 pl-9 pr-8 text-sm text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:border-accent/50" />
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
      className={`${mobile ? SHEET_CHIP : `${atlas.chip} ${layout.regionChipShape}`} ${focusClass} ${isActive ? atlas.chipSelected : atlas.chipIdle.pill}`}>
      {t(`continent.${group.id}`)}
    </Link>;
  });

  const countryLinks = (mobile = false) => filteredCountries.map((country) => {
    const isActive = country.code === selectedCountry;
    return <Link key={country.code} href={getTimelinePath(country.code, defaultCountry)} prefetch={false}
      aria-current={isActive ? "page" : undefined} onClick={() => setSheet(null)}
      className={`${mobile ? SHEET_CHIP : `${atlas.chip} ${atlas.square} whitespace-nowrap`} ${focusClass} ${isActive ? atlas.chipSelected : atlas.chipIdle.square}`}>
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
    <nav className={`${layout.chipNav} space-y-2 border-t border-white/[0.06]`} aria-label={t("countryNav")}>
      {searchField}
      <div ref={countryRef} {...countryDragProps} className={`${layout.navList} ${countryCursor}`}>
        {countryLinks()}
      </div>
      {!filteredCountries.length && <p className="py-2 text-center text-sm text-text-secondary">{t("noCountries")}</p>}
    </nav>
    <Modal isOpen={sheet !== null} onClose={() => setSheet(null)} title={t(sheet === "continent" ? "continentNav" : "countryNav")} animateHeight={false}>
      <div className="space-y-3 p-4">
        {sheet === "country" && searchField}
        <div className="grid grid-cols-2 gap-2">
          {sheet === "continent" ? continentLinks(true) : countryLinks(true)}
        </div>
        {sheet === "country" && !filteredCountries.length && <p className="py-2 text-center text-sm text-text-secondary">{t("noCountries")}</p>}
      </div>
    </Modal>
  </div>;
}
