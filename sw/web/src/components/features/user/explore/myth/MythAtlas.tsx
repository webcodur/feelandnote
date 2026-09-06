"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Clock3, MapPinned } from "lucide-react";
import { useTranslations } from "next-intl";
import type { MythAtlasData, MythPerson, MythRegion, MythWork } from "@/actions/home/mythAtlasTypes";
import MythPersonPicker from "./MythPersonPicker";
import MythPersonDetail from "./MythPersonDetail";
import MythTraditionOverview from "./MythTraditionOverview";

import { MYTH_LAYOUT as layout } from "./mythLayout";

interface Props { data: MythAtlasData }

function focusedTradition(data: MythAtlasData, personId: string | null) {
  const published = data.traditions.filter((item) => item.isPublished);
  const matches = published.filter((item) => personId && item.personIds.includes(personId));
  return matches.sort((a, b) => a.personIds.length - b.personIds.length)[0]?.id ?? published[0]?.id ?? null;
}

export default function MythAtlas({ data }: Props) {
  const t = useTranslations("explore.hub.myth");
  const openingTraditionId = focusedTradition(data, data.openingPersonId);
  const openingTradition = data.traditions.find((tradition) => tradition.id === openingTraditionId);
  const [regionId, setRegionId] = useState<string | null>(openingTradition?.regionId ?? data.regions[0]?.id ?? null);
  const [traditionId, setTraditionId] = useState<string | null>(openingTraditionId);
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const regionScrollRef = useRef<HTMLDivElement>(null);
  const traditionScrollRef = useRef<HTMLDivElement>(null);

  const publishedTraditionIds = useMemo(
    () => new Set(data.traditions.filter((tradition) => tradition.isPublished).map((tradition) => tradition.id)),
    [data.traditions],
  );
  const hasUnpublishedTraditions = publishedTraditionIds.size < data.traditions.length;
  const isRegionPublished = (region: MythRegion) => region.traditionIds.some((id) => publishedTraditionIds.has(id));
  const activeRegion = data.regions.find((region) => region.id === regionId && isRegionPublished(region))
    ?? data.regions.find(isRegionPublished)
    ?? null;
  const regionTraditions = useMemo(
    () => data.traditions.filter((tradition) => activeRegion?.traditionIds.includes(tradition.id)),
    [activeRegion, data.traditions],
  );
  const activeTradition = regionTraditions.find((tradition) => tradition.id === traditionId && tradition.isPublished)
    ?? regionTraditions.find((tradition) => tradition.isPublished)
    ?? null;
  /* 전승이 정한 차례를 그대로 따른다. 인물 목록을 훑어 거르면 전승과 무관한 전역 차례가
     나오고, 한 인물이 여러 전승에 속할 때 각 전승에서 잡아 둔 자리도 잃는다 */
  const activePeople = useMemo(() => {
    const byId = new Map(data.people.map((person) => [person.id, person]));
    return (activeTradition?.personIds ?? [])
      .map((id) => byId.get(id))
      .filter((person): person is MythPerson => Boolean(person));
  }, [activeTradition, data.people]);
  const activeIds = useMemo(() => new Set(activePeople.map((person) => person.id)), [activePeople]);
  const activeWorks = useMemo(
    () => data.works.filter((work) => work.personIds.some((id) => activeIds.has(id))),
    [activeIds, data.works],
  );
  const selectedPerson = activePeople.find((person) => person.id === selectedPersonId) ?? null;
  const selectedWorks = selectedPerson ? activeWorks.filter((work) => selectedPerson.sourceIds.includes(work.id)) : [];

  /* 이 전승으로 들어가는 책 한 권. 신화 원전은 한 권이 수십 명에게 걸리는 세계 단위 책이라
     인물을 고르기 전에도 살 수 있어야 한다. 이 전승 인물을 가장 많이 담은 책을 세우되,
     살 수 있는 판본이 있으면 그쪽을 앞세운다(영문 화면은 구매 링크를 받지 않아 첫 권이 온다). */
  const entryWork = useMemo(() => {
    if (activeWorks.length === 0) return null;
    const castHere = (work: MythWork) => work.personIds.filter((id) => activeIds.has(id)).length;
    const ranked = [...activeWorks].sort((a, b) => castHere(b) - castHere(a));
    return ranked.find((work) => work.coupangUrl) ?? ranked[0] ?? null;
  }, [activeWorks, activeIds]);

  useEffect(() => {
    if (window.matchMedia("(min-width: 768px)").matches) return;
    [regionScrollRef.current, traditionScrollRef.current].forEach((scroller) => {
      const selected = scroller?.querySelector<HTMLElement>('[aria-pressed="true"]');
      if (!scroller || !selected) return;
      const scrollerRect = scroller.getBoundingClientRect();
      const selectedRect = selected.getBoundingClientRect();
      scroller.scrollLeft += selectedRect.left - scrollerRect.left - (scrollerRect.width - selectedRect.width) / 2;
    });
  }, [activeRegion?.id, activeTradition?.id]);

  useEffect(() => {
    if (!selectedPersonId || !window.matchMedia("(max-width: 1023px)").matches) return;
    contentRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [selectedPersonId]);

  const chooseRegion = (nextRegionId: string) => {
    const nextRegion = data.regions.find((region) => region.id === nextRegionId);
    if (!nextRegion || !isRegionPublished(nextRegion)) return;
    const nextTradition = data.traditions.find(
      (tradition) => nextRegion.traditionIds.includes(tradition.id) && tradition.isPublished,
    );
    setRegionId(nextRegionId);
    setTraditionId(nextTradition?.id ?? null);
    setSelectedPersonId(null);
  };

  const chooseTradition = (nextId: string) => {
    if (!data.traditions.some((tradition) => tradition.id === nextId && tradition.isPublished)) return;
    setTraditionId(nextId);
    setSelectedPersonId(null);
  };

  const choosePerson = (id: string) => setSelectedPersonId((current) => current === id ? null : id);

  if (!activeRegion || !activeTradition || activePeople.length === 0) return null;

  return (
    <section id="myth-atlas" aria-label={t("title")} className={layout.atlas}>
      <div className={layout.navigationOuter}>
        <div className={layout.navigation}>
          <nav className={layout.nav} aria-label={t("regionNav")}>
            <div className="flex items-center justify-center gap-2 text-sm font-bold text-text-primary">
              <MapPinned size={16} className="text-accent" aria-hidden />
              <span>{t("regionSelection")}</span>
            </div>
            <div ref={regionScrollRef} className={layout.navList}>
              {data.regions.map((region) => {
                const selected = region.id === activeRegion.id;
                const published = isRegionPublished(region);
                return (
                  <button
                    key={region.id}
                    type="button"
                    aria-pressed={selected}
                    aria-label={published ? region.name : `${region.name} · ${t("comingSoon")}`}
                    title={published ? undefined : t("comingSoon")}
                    disabled={!published}
                    onClick={() => chooseRegion(region.id)}
                    className={`flex shrink-0 items-center rounded-full border px-3.5 py-1.5 text-sm font-semibold ${selected ? "border-accent bg-accent/10 text-accent shadow-[inset_0_0_0_1px_rgba(217,181,78,.1)]" : published ? "border-white/[0.08] bg-black/10 text-text-secondary hover:border-accent/60 hover:bg-accent/[0.05] hover:text-accent" : "cursor-not-allowed border-white/[0.045] bg-black/[0.08] text-text-tertiary opacity-45"}`}
                  >
                    {region.name}
                  </button>
                );
              })}
            </div>
          </nav>

          <nav className={layout.nav} aria-label={t("traditionNav")}>
            <div className="flex items-center justify-center gap-2">
              <p className="text-sm font-bold text-text-primary">{t("mythSelection")}</p>
            </div>
            <div ref={traditionScrollRef} className={layout.navList}>
              {regionTraditions.map((tradition) => {
                const selected = tradition.id === activeTradition.id;
                const published = tradition.isPublished;
                return (
                  <button
                    key={tradition.id}
                    type="button"
                    aria-pressed={selected}
                    aria-label={published ? tradition.name : `${tradition.name} · ${t("comingSoon")}`}
                    title={published ? undefined : t("comingSoon")}
                    disabled={!published}
                    onClick={() => chooseTradition(tradition.id)}
                    className={`flex shrink-0 items-center rounded-full border px-3.5 py-1.5 text-start text-sm font-semibold ${selected ? "border-accent bg-accent/10 text-accent shadow-[inset_0_0_0_1px_rgba(217,181,78,.1)]" : published ? "border-white/[0.06] bg-black/15 text-text-secondary hover:border-accent/60 hover:bg-white/[0.035] hover:text-text-primary" : "cursor-not-allowed border-white/[0.04] bg-black/[0.08] text-text-tertiary opacity-45"}`}
                  >
                    <span>{tradition.name}</span>
                  </button>
                );
              })}
            </div>
          </nav>

          {hasUnpublishedTraditions && (
            <div role="status" className={layout.notice}>
              <Clock3 size={14} className="mt-0.5 shrink-0 text-accent/70" aria-hidden />
              <p>{t("releaseNotice")}</p>
            </div>
          )}
        </div>
      </div>

      <div className={layout.railOuter}>
        <div className={layout.container}>
          <MythPersonPicker people={activePeople} selectedId={selectedPersonId} onSelect={choosePerson} />
        </div>
      </div>

      <div className={layout.overviewOuter}>
        <div className={layout.container}>
          {!selectedPerson && (
            <MythTraditionOverview key={activeTradition.id} tradition={activeTradition} memberCount={activePeople.length} workCount={activeWorks.length} entryWork={entryWork} />
          )}
          {selectedPerson && (
            <div ref={contentRef} className="min-w-0 overflow-hidden rounded-[24px] border border-white/[0.08] scroll-mt-20">
              <MythPersonDetail key={`${activeTradition.id}-${selectedPerson.id}`} person={selectedPerson} tradition={activeTradition} works={selectedWorks} onClose={() => setSelectedPersonId(null)} />
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
