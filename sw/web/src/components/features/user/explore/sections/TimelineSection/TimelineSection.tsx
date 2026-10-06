/*
  파일명: /components/features/user/explore/sections/TimelineSection/TimelineSection.tsx
  기능: 국가별 셀럽 연대기 클라이언트 컴포넌트
  책임: 국가 선택 + 연대기 타임라인 표시 + 텍스트 클릭 시 대사 발사
*/ // ------------------------------

"use client";

import { useState, useMemo, useCallback, useRef } from "react";
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

import DeveloperCommerceFallback from "@/components/features/commerce/DeveloperCommerceFallback";

import TimelineCountryHeader from "./sections/TimelineCountryHeader";
import TimelineEraList from "./sections/TimelineEraList";

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
  const [expandedBio, setExpandedBio] = useState<Set<string>>(new Set());
  const [collapsedEras, setCollapsedEras] = useState<Set<string>>(new Set());
  const [showContemporaries, setShowContemporaries] = useState<Set<string>>(new Set());
  const [loadingContemporaries, setLoadingContemporaries] = useState<Set<string>>(new Set());
  const [contemporariesError, setContemporariesError] = useState(false);

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

  return <div className="mx-auto max-w-4xl space-y-4">
    <TimelineCountryHeader countries={countries} country={selectedCountry} defaultCountry={defaultCountry} eras={eras} />
    {selectedInfo && <DeveloperCommerceFallback target={{ title: `${selectedInfo.name} 역사`, type: "TOPIC" }} placement="timeline-country" />}
    {!filtered.length && <p className="py-12 text-center text-text-secondary">{t('noCountryFigures')}</p>}
    {filtered.length > 0 && <TimelineEraList groups={eraGroups} collapsedEras={collapsedEras} allCollapsed={allCollapsed} onToggleAll={toggleAll} onToggleEra={toggleEra}
      itemProps={{ locale, expandedBio, showContemporaries, loadingContemporaries, onToggleBio: toggleBio, onToggleContemporaries: toggleContemporaries, onFireDialogue: fireDialogue, getContemporaries }} />}
    {contemporariesError && <p role="alert" className="text-sm text-status-paused">{errors('UNKNOWN_ERROR')}</p>}
    {totalPages > 1 && <nav aria-label={pagination('label')} className="flex items-center justify-center gap-5 py-6">
      {previousPath && <Link href={previousPath} prefetch={false} rel="prev" className="rounded-control border border-white/15 px-4 py-2 outline-none hover:border-accent hover:text-accent focus-visible:ring-2 focus-visible:ring-accent">{pagination('previous')}</Link>}
      <span className="text-sm tabular-nums text-text-secondary">{page} / {totalPages}</span>
      {nextPath && <Link href={nextPath} prefetch={false} rel="next" className="rounded-control border border-white/15 px-4 py-2 outline-none hover:border-accent hover:text-accent focus-visible:ring-2 focus-visible:ring-accent">{pagination('next')}</Link>}
    </nav>}
  </div>;
}
