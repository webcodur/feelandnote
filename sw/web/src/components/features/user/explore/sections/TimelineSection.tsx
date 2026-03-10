/*
  파일명: /components/features/user/explore/sections/TimelineSection.tsx
  기능: 국가별 셀럽 연대기 클라이언트 컴포넌트
  책임: 국가 선택 + 연대기 타임라인 표시 + 텍스트 클릭 시 대사 발사
*/ // ------------------------------

"use client";

import { useState, useMemo, useCallback, useRef } from "react";
import { ExternalLink, Search, X, ChevronDown, ChevronUp, ChevronsDownUp, ChevronsUpDown, Clock } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { CelebImage, VoiceBadge } from "@/components/ui";
import { getCountryFlag } from "@/lib/utils/countryFlag";
import { useLocale } from "next-intl";
import { useDialogueSubtitle, stripEmotionTag } from "@/components/features/game/shared/hooks/useDialogue";
import { getVoiceUrl, getQuoteVoiceUrl } from "@/lib/game/voice/voiceUrl";
import type { Locale } from "@/types/locale";
import type { TimelineCeleb, CountryGroup } from "@/actions/home";

interface Props {
  celebs: TimelineCeleb[];
  countries: CountryGroup[];
}

/** birth_date에서 연도 추출. BC 표기("-0500-01-01")도 처리 */
function getYear(dateStr: string): number {
  if (dateStr.startsWith("-")) {
    return -parseInt(dateStr.slice(1, 5), 10);
  }
  return parseInt(dateStr.slice(0, 4), 10);
}

/** 연도를 표시용 문자열로 변환 */
function formatYear(year: number): string {
  if (year < 0) return `BC ${Math.abs(year)}`;
  return `${year}`;
}

interface EraInfo {
  key: string;
  label: string;
  labelEn: string;
  range: string;
}

/** 연도를 시대 정보로 변환 (현대 세분화) */
function getEraInfo(year: number): EraInfo {
  if (year < 500) return { key: "ancient", label: "고대", labelEn: "Ancient", range: "~ 500" };
  if (year < 1500) return { key: "medieval", label: "중세", labelEn: "Medieval", range: "500 ~ 1500" };
  if (year < 1800) return { key: "early-modern", label: "근세", labelEn: "Early Modern", range: "1500 ~ 1800" };
  if (year < 1900) return { key: "modern", label: "근대", labelEn: "Modern", range: "1800 ~ 1900" };
  if (year < 1950) return { key: "contemporary-1", label: "현대 전기", labelEn: "Early 20C", range: "1900 ~ 1950" };
  if (year < 2000) return { key: "contemporary-2", label: "현대 후기", labelEn: "Late 20C", range: "1950 ~ 2000" };
  return { key: "contemporary-3", label: "21세기", labelEn: "21st Century", range: "2000 ~" };
}

/** 생몰 표시 */
function formatLifespan(birth: string | null, death: string | null): string {
  if (!birth) return "";
  const bYear = getYear(birth);
  const bStr = formatYear(bYear);
  if (!death) return `${bStr} ~`;
  const dYear = getYear(death);
  return `${bStr} ~ ${formatYear(dYear)}`;
}

export default function TimelineSection({ celebs, countries }: Props) {
  const locale = useLocale() as Locale;
  const { handleSubtitle } = useDialogueSubtitle();
  const [selectedCountry, setSelectedCountry] = useState<string>(
    countries[0]?.code ?? ""
  );
  const [countrySearch, setCountrySearch] = useState("");
  const [expandedBio, setExpandedBio] = useState<Set<string>>(new Set());
  const [collapsedEras, setCollapsedEras] = useState<Set<string>>(new Set());
  const [showContemporaries, setShowContemporaries] = useState<Set<string>>(new Set());
  const headerRef = useRef<HTMLDivElement>(null);

  // 직전 대사 인덱스 기억 (중복 방지)
  const lastIdxMap = useRef(new Map<string, number>());
  const keyCounter = useRef(0);

  const fireDialogue = useCallback((celeb: TimelineCeleb) => {
    const greetings = (locale === "en" && celeb.greeting_en?.length) ? celeb.greeting_en : celeb.greeting;
    const displayQuote = (locale === "en" && celeb.quotes_en) ? celeb.quotes_en : celeb.quotes;
    const displayName = (locale === "en" && celeb.nickname_en) ? celeb.nickname_en : celeb.nickname;

    const slots: Array<{ type: "greeting"; idx: number } | { type: "quotes" }> = [];
    if (greetings?.length) {
      greetings.forEach((_, i) => slots.push({ type: "greeting", idx: i }));
    }
    if (displayQuote) {
      slots.push({ type: "quotes" });
    }
    if (slots.length === 0) return;

    const mapKey = celeb.id;
    const lastIdx = lastIdxMap.current.get(mapKey);
    let pick: number;
    if (slots.length <= 1) {
      pick = 0;
    } else {
      do { pick = Math.floor(Math.random() * slots.length); } while (pick === lastIdx);
    }
    lastIdxMap.current.set(mapKey, pick);

    const chosen = slots[pick];
    const hasVoice = celeb.has_voice;
    const voiceV = celeb.voice_v;

    if (chosen.type === "quotes") {
      handleSubtitle({
        key: ++keyCounter.current,
        tone: "composed",
        text: displayQuote!,
        nickname: displayName,
        avatarUrl: celeb.avatar_url,
        audioUrl: hasVoice ? getQuoteVoiceUrl(celeb.id, locale, voiceV) : null,
        label: "quotes",
      });
    } else {
      handleSubtitle({
        key: ++keyCounter.current,
        tone: "composed",
        text: stripEmotionTag(greetings![chosen.idx]),
        nickname: displayName,
        avatarUrl: celeb.avatar_url,
        audioUrl: hasVoice ? getVoiceUrl(celeb.id, locale, "greeting", chosen.idx + 1, voiceV) : null,
        label: "greeting",
      });
    }
  }, [locale, handleSubtitle]);

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

    const bYear = getYear(celeb.birth_date!);
    const dYear = celeb.death_date ? getYear(celeb.death_date) : bYear + 70;

    const result = celebs
      .filter((c) => {
        if (c.id === celeb.id || !c.birth_date) return false;
        if (c.nationality === selectedCountry) return false; // 현재 보고 있는 국가 제외
        const cBirth = getYear(c.birth_date);
        const cDeath = c.death_date ? getYear(c.death_date) : cBirth + 70;
        return bYear <= cDeath && dYear >= cBirth;
      })
      .sort((a, b) => {
        const tierA = a.celeb_tier === "full" ? 0 : 1;
        const tierB = b.celeb_tier === "full" ? 0 : 1;
        if (tierA !== tierB) return tierA - tierB;
        return Math.abs(getYear(a.birth_date!) - bYear) - Math.abs(getYear(b.birth_date!) - bYear);
      })
      .slice(0, 5);

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

  const selectedInfo = countries.find((c) => c.code === selectedCountry);

  // 국가 검색 필터
  const filteredCountries = useMemo(() => {
    if (!countrySearch.trim()) return countries;
    const q = countrySearch.trim().toLowerCase();
    return countries.filter(
      (c) => c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q)
    );
  }, [countries, countrySearch]);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* 국가 검색 + 칩 */}
      <div className="space-y-3">
        <div className="relative max-w-xs mx-auto">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
          <input
            type="text"
            value={countrySearch}
            onChange={(e) => setCountrySearch(e.target.value)}
            placeholder="국가 검색..."
            className="w-full pl-9 pr-8 py-2 rounded-lg bg-bg-card border border-white/10 text-text-primary text-sm placeholder:text-text-secondary/50 focus:outline-none focus:border-accent/50"
          />
          {countrySearch && (
            <button
              onClick={() => setCountrySearch("")}
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
                onClick={() => handleCountryChange(country.code)}
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
          해당 국가의 인물이 없습니다.
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
                    <button
                      type="button"
                      onClick={() => toggleEra(group.era.key)}
                      className="relative my-6 first:mt-2 w-full group/era"
                    >
                      <div className="w-full rounded-xl bg-gradient-to-r from-bg-card/90 via-bg-card/60 to-bg-card/90 border border-accent/15 group-hover/era:border-accent/35 transition-colors overflow-hidden">
                        {/* 상단 그라데이션 라인 */}
                        <div className="h-px bg-gradient-to-r from-transparent via-accent/40 to-transparent" />
                        <div className="flex items-center justify-between px-5 py-3.5">
                          {/* 왼쪽: 시대 정보 */}
                          <div className="flex items-center gap-4">
                            <div className="flex flex-col">
                              <span className="text-base md:text-lg font-bold text-accent tracking-wider">
                                {group.era.label}
                              </span>
                              <span className="text-[11px] text-text-secondary/50 tracking-wide uppercase">
                                {group.era.labelEn}
                              </span>
                            </div>
                            <div className="h-8 w-px bg-white/10" />
                            <span className="text-sm text-text-secondary font-mono">
                              {group.era.range}
                            </span>
                          </div>
                          {/* 오른쪽: 인물 수 + 접기/펼치기 */}
                          <div className="flex items-center gap-3">
                            <div className="flex items-baseline gap-1">
                              <span className="text-lg font-semibold text-text-primary">
                                {group.celebs.length}
                              </span>
                              <span className="text-xs text-text-secondary/50">
                                {locale === "en" ? "figures" : "명"}
                              </span>
                            </div>
                            {isCollapsed ? (
                              <ChevronDown size={18} className="text-text-secondary group-hover/era:text-accent transition-colors" />
                            ) : (
                              <ChevronUp size={18} className="text-text-secondary group-hover/era:text-accent transition-colors" />
                            )}
                          </div>
                        </div>
                        {/* 하단 그라데이션 라인 */}
                        <div className="h-px bg-gradient-to-r from-transparent via-accent/40 to-transparent" />
                      </div>
                    </button>

                    {/* 셀럽 항목들 — 애니메이션 접기/펼치기 */}
                    <div className="collapse-grid" data-open={!isCollapsed}>
                      <div className="collapse-inner">
                    {group.celebs.map((celeb) => {
                      const year = getYear(celeb.birth_date!);
                      const displayName =
                        locale === "en" && celeb.nickname_en
                          ? celeb.nickname_en
                          : celeb.nickname;
                      const displayTitle =
                        locale === "en" && celeb.title_en
                          ? celeb.title_en
                          : celeb.title;
                      const displayBio =
                        locale === "en" && celeb.bio_en
                          ? celeb.bio_en
                          : celeb.bio;

                      const hasVoice = celeb.has_voice;

                      return (
                        <div key={celeb.id} className="mb-3 md:mb-5 group/item">
                          {/* 인물 행 */}
                          <div className="flex gap-1.5 md:gap-3">
                            {/* 연도 + 도트 */}
                            <div className="w-[38px] md:w-[120px] flex items-center justify-end shrink-0 pt-3 md:pt-2.5">
                              <span className="text-[10px] md:text-sm text-text-primary/80 font-mono mr-1 md:mr-2">
                                {formatYear(year)}
                              </span>
                              <div className={`w-2 h-2 md:w-3 md:h-3 rounded-full shrink-0 transition-colors z-10 ${
                                hasVoice
                                  ? "bg-emerald-500/30 border-[1.5px] md:border-2 border-emerald-400/60"
                                  : "bg-bg-card border-[1.5px] md:border-2 border-accent/40"
                              }`} />
                            </div>

                            {/* 셀럽 카드 */}
                            <div className="flex-1 min-w-0 py-1.5 md:p-2.5">
                              {/* === PC 레이아웃 === */}
                              <div className="hidden md:flex items-start gap-3">
                                <div className="relative shrink-0">
                                  <button
                                    type="button"
                                    onClick={() => fireDialogue(celeb)}
                                    className={`block w-14 h-14 rounded-full overflow-hidden border hover:scale-105 transition-all cursor-pointer ${
                                      hasVoice ? "border-emerald-400/40 hover:border-emerald-400/70" : "border-white/10 hover:border-accent/50"
                                    }`}
                                  >
                                    <CelebImage src={celeb.avatar_url} alt={displayName} shape="circle" sizes="56px" maxPx={128} fallbackSize={24} />
                                  </button>
                                  {hasVoice && (
                                    <div className="absolute -bottom-0.5 -right-0.5 z-10"><VoiceBadge size="sm" /></div>
                                  )}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-start gap-2">
                                    <div className="min-w-0 flex-1">
                                      <p className="text-lg font-semibold text-text-primary leading-tight">
                                        {displayName}
                                        <span className="text-sm text-text-primary/70 font-normal ml-1.5">
                                          {formatLifespan(celeb.birth_date, celeb.death_date)}
                                        </span>
                                      </p>
                                      {displayTitle && (
                                        <p className="text-sm text-amber-400/80 truncate mt-0.5">{displayTitle}</p>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-1 shrink-0">
                                      <button type="button" onClick={() => toggleContemporaries(celeb.id)}
                                        className={`p-2 rounded-lg border transition-colors ${showContemporaries.has(celeb.id) ? "border-accent/50 text-accent bg-accent/10" : "border-white/10 text-text-secondary hover:text-text-primary hover:border-white/20 hover:bg-white/5"}`}
                                        title={locale === "en" ? "Contemporaries" : "동시대 인물"}>
                                        <Clock size={16} />
                                      </button>
                                      <Link href={celeb.slug ? `/celeb/${celeb.slug}` : `/celeb/${celeb.id}`}
                                        className="p-2 rounded-lg border border-white/10 text-text-secondary hover:text-text-primary hover:border-white/20 hover:bg-white/5 transition-colors">
                                        <ExternalLink size={16} />
                                      </Link>
                                    </div>
                                  </div>
                                  {displayBio && (
                                    <p role="button" onClick={() => setExpandedBio(prev => { const n = new Set(prev); n.has(celeb.id) ? n.delete(celeb.id) : n.add(celeb.id); return n; })}
                                      className={`text-sm text-text-primary/60 mt-1 cursor-pointer hover:text-text-primary/80 transition-colors ${expandedBio.has(celeb.id) ? "" : "line-clamp-2"}`}>
                                      {displayBio}
                                    </p>
                                  )}
                                </div>
                              </div>
                              {/* === 모바일 레이아웃 === */}
                              <div className="md:hidden">
                                <div className="flex items-center gap-2">
                                  {/* 아바타 — 이름+연도 2행에 걸침 */}
                                  <div className="relative shrink-0 self-start">
                                    <button type="button" onClick={() => fireDialogue(celeb)}
                                      className={`block w-9 h-9 rounded-full overflow-hidden border hover:scale-105 transition-all cursor-pointer ${
                                        hasVoice ? "border-emerald-400/40 hover:border-emerald-400/70" : "border-white/10 hover:border-accent/50"
                                      }`}>
                                      <CelebImage src={celeb.avatar_url} alt={displayName} shape="circle" sizes="36px" maxPx={72} fallbackSize={16} />
                                    </button>
                                    {hasVoice && (
                                      <div className="absolute -bottom-0.5 -right-0.5 z-10"><VoiceBadge size="sm" /></div>
                                    )}
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    {/* 1행: 이름 + 아이콘 */}
                                    <div className="flex items-center gap-1">
                                      <p className="text-sm font-semibold text-text-primary truncate flex-1">{displayName}</p>
                                      <button type="button" onClick={() => toggleContemporaries(celeb.id)}
                                        className={`p-1 rounded border transition-colors shrink-0 ${showContemporaries.has(celeb.id) ? "border-accent/50 text-accent bg-accent/10" : "border-white/10 text-text-secondary"}`}>
                                        <Clock size={12} />
                                      </button>
                                      <Link href={celeb.slug ? `/celeb/${celeb.slug}` : `/celeb/${celeb.id}`}
                                        className="p-1 rounded border border-white/10 text-text-secondary shrink-0">
                                        <ExternalLink size={12} />
                                      </Link>
                                    </div>
                                    {/* 2행: 연도 */}
                                    <p className="text-[11px] text-text-primary/60">{formatLifespan(celeb.birth_date, celeb.death_date)}</p>
                                  </div>
                                </div>
                                {/* 3행: 별명 */}
                                {displayTitle && (
                                  <p className="text-[11px] text-amber-400/80 truncate mt-0.5 pl-11">{displayTitle}</p>
                                )}
                                {/* 4행: bio */}
                                {displayBio && (
                                  <p role="button" onClick={() => setExpandedBio(prev => { const n = new Set(prev); n.has(celeb.id) ? n.delete(celeb.id) : n.add(celeb.id); return n; })}
                                    className={`text-[11px] text-text-primary/50 mt-0.5 pl-11 cursor-pointer hover:text-text-primary/70 transition-colors ${expandedBio.has(celeb.id) ? "" : "line-clamp-1"}`}>
                                    {displayBio}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                          {/* 동시대 인물 패널 */}
                          {showContemporaries.has(celeb.id) && (() => {
                            const contemporaries = getContemporaries(celeb);
                            if (contemporaries.length === 0) return (
                              <div className="ml-[40px] md:ml-[120px] pl-4 pt-1 pb-2 animate-slide-down">
                                <p className="text-xs text-text-secondary/60">
                                  {locale === "en" ? "No contemporaries found" : "동시대 인물이 없습니다"}
                                </p>
                              </div>
                            );
                            return (
                              <div className="ml-[40px] md:ml-[120px] pl-4 pt-1 pb-2 animate-slide-down">
                                <p className="text-xs text-text-secondary/60 mb-2">
                                  {locale === "en"
                                    ? `In the era of ${celeb.nickname_en || celeb.nickname}`
                                    : `${celeb.nickname}의 시대`
                                  }
                                </p>
                                <div className="flex flex-wrap gap-2">
                                  {contemporaries.map((c) => {
                                    const cName = (locale === "en" && c.nickname_en) ? c.nickname_en : c.nickname;
                                    return (
                                      <Link
                                        key={c.id}
                                        href={c.slug ? `/celeb/${c.slug}` : `/celeb/${c.id}`}
                                        className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-bg-card/80 border border-white/10 hover:border-accent/30 hover:bg-white/5 transition-colors group/cont"
                                      >
                                        <span className="text-sm">{getCountryFlag(c.nationality!)}</span>
                                        <div className="w-6 h-6 rounded-full overflow-hidden shrink-0">
                                          <CelebImage
                                            src={c.avatar_url}
                                            alt={cName}
                                            shape="circle"
                                            sizes="24px"
                                            maxPx={48}
                                            fallbackSize={12}
                                          />
                                        </div>
                                        <span className="text-sm text-text-primary group-hover/cont:text-accent transition-colors">
                                          {cName}
                                        </span>
                                        <span className="text-xs text-text-secondary/50">
                                          {formatLifespan(c.birth_date, c.death_date)}
                                        </span>
                                      </Link>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      );
                    })}
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
