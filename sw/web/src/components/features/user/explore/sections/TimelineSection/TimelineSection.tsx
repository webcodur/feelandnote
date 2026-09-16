/*
  파일명: /components/features/user/explore/sections/TimelineSection/TimelineSection.tsx
  기능: 국가별 셀럽 연대기 클라이언트 컴포넌트
  책임: 국가 선택 + 연대기 타임라인 표시 + 텍스트 클릭 시 대사 발사
*/ // ------------------------------

"use client";

import { useState, useMemo, useCallback, useRef } from "react";
import { ChevronsDownUp, ChevronsUpDown } from "lucide-react";
import { getCountryFlag } from "@/lib/utils/countryFlag";
import { celebDisplayName } from "@/lib/celeb/displayName";
import { useLocale, useTranslations } from "next-intl";
import { useDialogueSubtitle } from "@/components/features/game/shared/hooks/useDialogue";
import { useCelebGreeting } from "@/hooks/useCelebGreeting";
import type { Locale } from "@/types/locale";
import type { TimelineCeleb, CountryGroup } from "@/actions/home";
import { getYear, getEraInfo, type EraInfo } from "./utils";
import { getTimelineContemporaries } from "@/actions/home/getCelebTimeline";
import { getCelebForModal } from "@/actions/celebs/getCelebForModal";
import { Link } from "@/i18n/navigation";
import { ATLAS_NAV_LAYOUT as atlas } from "@/components/shared/atlasNavLayout";
import CountryPicker from "./sections/CountryPicker";
import DeveloperCommerceFallback from "@/components/features/commerce/DeveloperCommerceFallback";
import EraBanner from "./sections/EraBanner";
import CelebTimelineItem from "./sections/CelebTimelineItem";

interface Props {
  celebs: TimelineCeleb[];
  countries: CountryGroup[];
  country: string;
  defaultCountry: string;
  page: number;
  totalPages: number;
  previousPath: string | null;
  nextPath: string | null;
  eras: { era: EraInfo; href: string }[];
}

export default function TimelineSection({ celebs, countries, country: selectedCountry, defaultCountry, page, totalPages, previousPath, nextPath, eras }: Props) {
  const locale = useLocale() as Locale;
  const t = useTranslations("explore.ui");
  const { handleSubtitle } = useDialogueSubtitle();
  const pagination = useTranslations("shared.ui.pagination");
  const errors = useTranslations("actionErrors");
  const [countrySearch, setCountrySearch] = useState("");
  const [expandedBio, setExpandedBio] = useState<Set<string>>(new Set());
  const [collapsedEras, setCollapsedEras] = useState<Set<string>>(new Set());
  const [showContemporaries, setShowContemporaries] = useState<Set<string>>(new Set());
  const [loadingContemporaries, setLoadingContemporaries] = useState<Set<string>>(new Set());
  const [contemporariesError, setContemporariesError] = useState(false);
  const headerRef = useRef<HTMLDivElement>(null);

  const { fireGreeting } = useCelebGreeting({ onSubtitle: handleSubtitle, locale: locale as Locale });

  const fireDialogue = useCallback(async (celeb: TimelineCeleb) => {
    try {
      const profile = await getCelebForModal(celeb.id);
      if (!profile) return;
      const displayName = celebDisplayName(profile, locale);
      fireGreeting({ ...profile, nickname: displayName });
    } catch {
      setContemporariesError(true);
    }
  }, [locale, fireGreeting]);

  // 선택된 국가의 셀럽만 필터 + 연도순 정렬 (DB 텍스트 정렬 오류 보정)
  const filtered = celebs;

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

  // 개별 시대 토글
  const toggleEra = useCallback((eraKey: string) => {
    setCollapsedEras(prev => {
      const next = new Set(prev);
      if (next.has(eraKey)) next.delete(eraKey);
      else next.add(eraKey);
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

    return [];
  }, [selectedCountry]);

  const toggleContemporaries = useCallback(async (id: string) => {
    const cacheKey = `${id}_${selectedCountry}`;
    if (!contemporariesCache.current.has(cacheKey)) {
      setLoadingContemporaries(prev => new Set(prev).add(id));
      setContemporariesError(false);
      try {
        contemporariesCache.current.set(cacheKey, await getTimelineContemporaries(id, locale));
      } catch {
        setContemporariesError(true);
        return;
      } finally {
        setLoadingContemporaries(prev => { const next = new Set(prev); next.delete(id); return next; });
      }
    }
    setShowContemporaries(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, [selectedCountry, locale]);

  const toggleBio = useCallback((id: string) => {
    setExpandedBio(prev => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
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
        defaultCountry={defaultCountry}
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

      {eras.length > 1 && (
        <nav className="flex flex-wrap justify-center gap-1.5">
          {eras.map(({ era, href }) => (
            <Link key={era.key} href={href} prefetch={false} className={`${atlas.chip} ${atlas.pill} ${atlas.chipIdle.pill} outline-none focus-visible:ring-2 focus-visible:ring-accent`}>
              {locale === "en" ? era.labelEn : era.label}
            </Link>
          ))}
        </nav>
      )}

      {/* 타임라인 */}
      {selectedInfo && <DeveloperCommerceFallback target={{ title: `${selectedInfo.name} 역사`, type: "TOPIC" }} placement="timeline-country" />}
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
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-text-secondary hover:text-text-primary hover:bg-white/5 outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                {allCollapsed ? <ChevronsUpDown size={16} /> : <ChevronsDownUp size={16} />}
                {allCollapsed ? (locale === "en" ? "Expand all" : "전체 펼치기") : (locale === "en" ? "Collapse all" : "전체 접기")}
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
                  <div key={`${group.era.key}-${idx}`} id={`era-${group.era.key}`} className="scroll-mt-20">
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
                            isContemporariesLoading={loadingContemporaries.has(celeb.id)}
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
      {contemporariesError && <p role="alert" className="text-sm text-red-400">{errors("UNKNOWN_ERROR")}</p>}
      {totalPages > 1 && (
        <nav aria-label={pagination("label")} className="flex items-center justify-center gap-5 py-6">
          {previousPath && <Link href={previousPath} prefetch={false} rel="prev" className="rounded-md border border-white/15 px-4 py-2 hover:border-accent hover:text-accent outline-none focus-visible:ring-2 focus-visible:ring-accent">{pagination("previous")}</Link>}
          <span className="text-sm tabular-nums text-text-secondary">{page} / {totalPages}</span>
          {nextPath && <Link href={nextPath} prefetch={false} rel="next" className="rounded-md border border-white/15 px-4 py-2 hover:border-accent hover:text-accent outline-none focus-visible:ring-2 focus-visible:ring-accent">{pagination("next")}</Link>}
        </nav>
      )}
    </div>
  );
}
