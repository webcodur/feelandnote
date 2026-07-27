/*
  파일명: /components/features/user/explore/sections/TimelineSection/TimelineSection.tsx
  기능: 국가별 셀럽 연대기 클라이언트 컴포넌트
  책임: 국가 선택 + 연대기 타임라인 표시 + 텍스트 클릭 시 대사 발사
*/ // ------------------------------

"use client";

import { useState, useMemo, useCallback, useRef } from "react";
import { ChevronsDownUp, ChevronsUpDown } from "lucide-react";
import { getCountryFlag } from "@/lib/utils/countryFlag";
import { useLocale, useTranslations } from "next-intl";
import { useDialogueSubtitle } from "@/components/features/game/shared/hooks/useDialogue";
import { useCelebGreeting } from "@/hooks/useCelebGreeting";
import type { Locale } from "@/types/locale";
import type { TimelineCeleb, CountryGroup } from "@/actions/home";
import { getYear, getEraInfo, findContemporaries, type EraInfo } from "./utils";
import CountryPicker from "./sections/CountryPicker";
import EraBanner from "./sections/EraBanner";
import CelebTimelineItem from "./sections/CelebTimelineItem";

interface Props {
  celebs: TimelineCeleb[];
  countries: CountryGroup[];
}

export default function TimelineSection({ celebs, countries }: Props) {
  const locale = useLocale() as Locale;
  const t = useTranslations("explore.ui");
  const { handleSubtitle } = useDialogueSubtitle();
  const [selectedCountry, setSelectedCountry] = useState<string>(
    countries[0]?.code ?? ""
  );
  const [countrySearch, setCountrySearch] = useState("");
  const [expandedBio, setExpandedBio] = useState<Set<string>>(new Set());
  const [collapsedEras, setCollapsedEras] = useState<Set<string>>(new Set());
  const [showContemporaries, setShowContemporaries] = useState<Set<string>>(new Set());
  const headerRef = useRef<HTMLDivElement>(null);

  const { fireGreeting } = useCelebGreeting({ onSubtitle: handleSubtitle, locale: locale as Locale });

  const fireDialogue = useCallback((celeb: TimelineCeleb) => {
    const displayName = (locale === "en" && celeb.nickname_en) ? celeb.nickname_en : celeb.nickname;
    fireGreeting({ ...celeb, nickname: displayName });
  }, [locale, fireGreeting]);

  // 선택된 국가의 셀럽만 필터 + 연도순 정렬 (DB 텍스트 정렬 오류 보정)
  const filtered = useMemo(() => {
    return celebs
      .filter((c) => c.nationality === selectedCountry)
      .sort((a, b) => getYear(a.birth_date!) - getYear(b.birth_date!));
  }, [celebs, selectedCountry]);

  // 시대별 그룹핑
  const eraGroups = useMemo(() => {
    const groups: { era: EraInfo; celebs: TimelineCeleb[] }[] = [];
    let currentKey = "";

    for (const celeb of filtered) {
      const year = getYear(celeb.birth_date!);
      const era = getEraInfo(year);
      if (era.key !== currentKey) {
        currentKey = era.key;
        groups.push({ era, celebs: [celeb] });
      } else {
        groups[groups.length - 1].celebs.push(celeb);
      }
    }
    return groups;
  }, [filtered]);

  // 국가 변경 시 접힘 상태 리셋
  const handleCountryChange = useCallback((code: string) => {
    setSelectedCountry(code);
    setCountrySearch("");
    setCollapsedEras(new Set());
    setExpandedBio(new Set());
    setShowContemporaries(new Set());
    setTimeout(() => headerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  }, []);

  // 개별 시대 토글
  const toggleEra = useCallback((eraKey: string) => {
    setCollapsedEras(prev => {
      const next = new Set(prev);
      next.has(eraKey) ? next.delete(eraKey) : next.add(eraKey);
      return next;
    });
  }, []);

  // 전체 접기/펼치기
  const allCollapsed = eraGroups.length > 0 && collapsedEras.size === eraGroups.length;
  const toggleAll = useCallback(() => {
    if (allCollapsed) {
      setCollapsedEras(new Set());
    } else {
      setCollapsedEras(new Set(eraGroups.map(g => g.era.key)));
    }
  }, [allCollapsed, eraGroups]);

  // 동시대 인물: 클릭 시에만 계산 → 결과를 캐시
  const contemporariesCache = useRef(new Map<string, TimelineCeleb[]>());
  const getContemporaries = useCallback((celeb: TimelineCeleb) => {
    const cacheKey = `${celeb.id}_${selectedCountry}`;
    const cached = contemporariesCache.current.get(cacheKey);
    if (cached) return cached;

    const result = findContemporaries(celebs, celeb, selectedCountry);
    contemporariesCache.current.set(cacheKey, result);
    return result;
  }, [celebs, selectedCountry]);

  const toggleContemporaries = useCallback((id: string) => {
    setShowContemporaries(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const toggleBio = useCallback((id: string) => {
    setExpandedBio(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  }, []);

  const selectedInfo = countries.find((c) => c.code === selectedCountry);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* 국가 검색 + 칩 */}
      <CountryPicker
        countries={countries}
        selectedCountry={selectedCountry}
        countrySearch={countrySearch}
        onSearchChange={setCountrySearch}
        onCountryChange={handleCountryChange}
      />

      {/* 선택된 국가 헤더 */}
      {selectedInfo && (
        <div ref={headerRef} className="pt-4 scroll-mt-20">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-accent/30 to-transparent" />
          </div>
          <div className="flex flex-col items-center gap-2 py-4">
            <span className="text-4xl">{getCountryFlag(selectedInfo.code)}</span>
            <h2 className="text-2xl font-bold text-text-primary font-cinzel tracking-wide">
              {selectedInfo.name}
            </h2>
            <p className="text-sm text-text-secondary tracking-widest uppercase">
              Chronicle · {selectedInfo.count} Figures
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-accent/30 to-transparent" />
          </div>
        </div>
      )}

      {/* 타임라인 */}
      {filtered.length === 0 ? (
        <p className="text-text-secondary text-center py-12">
          {t("noCountryFigures")}
        </p>
      ) : (
        <>
          {/* 전체 접기/펼치기 버튼 */}
          {eraGroups.length > 1 && (
            <div className="flex justify-end">
              <button
                onClick={toggleAll}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-text-secondary hover:text-text-primary hover:bg-white/5 transition-colors"
              >
                {allCollapsed ? <ChevronsUpDown size={16} /> : <ChevronsDownUp size={16} />}
                {allCollapsed ? "전체 펼치기" : "전체 접기"}
              </button>
            </div>
          )}

          <div className="relative">
            {/* 세로 타임라인 줄 */}
            <div className="absolute left-[34px] md:left-[114px] top-0 bottom-0 w-px bg-white/10" />

            <div className="space-y-0">
              {eraGroups.map((group, idx) => {
                const isCollapsed = collapsedEras.has(group.era.key);

                return (
                  <div key={`${group.era.key}-${idx}`}>
                    {/* 시대 구분 — 풀폭 배너, 클릭 시 접기/펼치기 */}
                    <EraBanner
                      era={group.era}
                      count={group.celebs.length}
                      isCollapsed={isCollapsed}
                      locale={locale}
                      onToggle={toggleEra}
                    />

                    {/* 셀럽 항목들 — 애니메이션 접기/펼치기 */}
                    <div className="collapse-grid" data-open={!isCollapsed}>
                      <div className="collapse-inner">
                        {group.celebs.map((celeb) => (
                          <CelebTimelineItem
                            key={celeb.id}
                            celeb={celeb}
                            locale={locale}
                            isBioExpanded={expandedBio.has(celeb.id)}
                            isContemporariesShown={showContemporaries.has(celeb.id)}
                            onToggleBio={toggleBio}
                            onToggleContemporaries={toggleContemporaries}
                            onFireDialogue={fireDialogue}
                            getContemporaries={getContemporaries}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
