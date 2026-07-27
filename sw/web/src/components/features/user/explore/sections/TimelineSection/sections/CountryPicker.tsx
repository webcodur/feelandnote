/*
  파일명: /components/features/user/explore/sections/TimelineSection/sections/CountryPicker.tsx
  기능: 국가 검색 + 칩 선택
  책임: 검색어로 국가 필터링 + 선택 칩 강조 표시.
*/ // ------------------------------

"use client";

import { useMemo } from "react";
import { Search, X } from "lucide-react";
import { getCountryFlag } from "@/lib/utils/countryFlag";
import type { CountryGroup } from "@/actions/home";
import { useTranslations } from "next-intl";

interface Props {
  countries: CountryGroup[];
  selectedCountry: string;
  countrySearch: string;
  onSearchChange: (value: string) => void;
  onCountryChange: (code: string) => void;
}

export default function CountryPicker({
  countries,
  selectedCountry,
  countrySearch,
  onSearchChange,
  onCountryChange,
}: Props) {
  const t = useTranslations("explore.ui.timeline");
  // 국가 검색 필터
  const filteredCountries = useMemo(() => {
    if (!countrySearch.trim()) return countries;
    const q = countrySearch.trim().toLowerCase();
    return countries.filter(
      (c) => c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q)
    );
  }, [countries, countrySearch]);

  return (
    <div className="space-y-3">
      <div className="relative max-w-xs mx-auto">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
        <input
          type="text"
          value={countrySearch}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={t("countrySearch")}
          className="w-full pl-9 pr-8 py-2 rounded-lg bg-bg-card border border-white/10 text-text-primary text-sm placeholder:text-text-secondary/50 focus:outline-none focus:border-accent/50"
        />
        {countrySearch && (
          <button
            onClick={() => onSearchChange("")}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary"
          >
            <X size={14} />
          </button>
        )}
      </div>
      {/* 모바일: 검색어 없으면 가로스크롤, 있으면 결과만 표시. PC: wrap */}
      <div className={`flex gap-2 pb-2 scrollbar-thin ${
        countrySearch
          ? "flex-wrap justify-center"
          : "overflow-x-auto md:overflow-x-visible md:flex-wrap md:justify-center"
      }`}>
        {filteredCountries.map((country) => {
          const isActive = country.code === selectedCountry;
          return (
            <button
              key={country.code}
              onClick={() => onCountryChange(country.code)}
              className={`
                flex items-center gap-1.5 px-4 py-2 rounded-full text-base whitespace-nowrap shrink-0 md:shrink
                border transition-colors
                ${isActive
                  ? "bg-accent/20 border-accent/50 text-accent"
                  : "bg-bg-card border-white/10 text-text-secondary hover:border-white/20 hover:text-text-primary"
                }
              `}
            >
              <span className="text-lg">{getCountryFlag(country.code)}</span>
              <span>{country.name}</span>
              <span className={`text-sm ${isActive ? "text-accent/70" : "text-text-secondary/60"}`}>
                {country.count}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
