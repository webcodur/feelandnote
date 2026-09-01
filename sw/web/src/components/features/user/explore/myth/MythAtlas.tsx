"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Clock3, MapPinned } from "lucide-react";
import { useTranslations } from "next-intl";
import type { MythAtlasData, MythRegion } from "@/actions/home/mythAtlasTypes";
import MythPersonPicker from "./MythPersonPicker";
import MythPersonDetail from "./MythPersonDetail";
import MythTraditionOverview from "./MythTraditionOverview";

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
  const activePeople = useMemo(() => {
    const ids = new Set(activeTradition?.personIds ?? []);
    return data.people.filter((person) => ids.has(person.id));
  }, [activeTradition, data.people]);
  const activeIds = useMemo(() => new Set(activePeople.map((person) => person.id)), [activePeople]);
  const activeWorks = useMemo(
    () => data.works.filter((work) => work.personIds.some((id) => activeIds.has(id))),
    [activeIds, data.works],
  );
  const selectedPerson = activePeople.find((person) => person.id === selectedPersonId) ?? null;
  const selectedWorks = selectedPerson ? activeWorks.filter((work) => selectedPerson.sourceIds.includes(work.id)) : [];

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
    <section id="myth-atlas" aria-label={t("title")} className="scroll-mt-20 overflow-hidden rounded-[28px] border border-white/[0.08] bg-[radial-gradient(circle_at_50%_0%,rgba(217,181,78,.045),transparent_30%),var(--color-bg-secondary)] [overflow-anchor:none]">
      <div className="px-4 pb-2 pt-4 md:px-6 md:pb-2 md:pt-6">
        <div className="mx-auto grid max-w-[1040px] gap-1 overflow-hidden rounded-[20px] border border-white/[0.08] bg-black/[0.16] p-2">
          <nav className="min-w-0 rounded-xl px-2 py-3 md:px-3" aria-label={t("regionNav")}>
            <div className="flex items-center justify-center gap-2 text-sm font-bold text-text-primary">
              <MapPinned size={16} className="text-accent" aria-hidden />
              <span>{t("regionSelection")}</span>
            </div>
            <div ref={regionScrollRef} className="scrollbar-hide -mx-1 mt-2.5 flex justify-start gap-1.5 overflow-x-auto px-1 pb-1 md:flex-wrap md:justify-center md:overflow-visible">
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

          <nav className="min-w-0 rounded-xl px-2 py-3 md:px-3" aria-label={t("traditionNav")}>
            <div className="flex items-center justify-center gap-2">
              <p className="text-sm font-bold text-text-primary">{t("mythSelection")}</p>
            </div>
            <div ref={traditionScrollRef} className="scrollbar-hide -mx-1 mt-2.5 flex justify-start gap-1.5 overflow-x-auto px-1 pb-1 md:flex-wrap md:justify-center md:overflow-visible">
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
            <div role="status" className="mx-2 mb-1 flex items-start justify-center gap-2 rounded-xl border border-accent/[0.12] bg-accent/[0.035] px-3 py-2.5 text-center text-xs leading-5 text-text-tertiary md:mx-3">
              <Clock3 size={14} className="mt-0.5 shrink-0 text-accent/70" aria-hidden />
              <p>{t("releaseNotice")}</p>
            </div>
          )}
        </div>
      </div>

      <div className="px-4 py-2 md:px-6">
        <div className="mx-auto max-w-[1040px]">
          <MythPersonPicker layout="rail" people={activePeople} traditionId={activeTradition.id} selectedId={selectedPersonId} onSelect={choosePerson} />
        </div>
      </div>

      <div className="min-w-0 px-4 pb-4 pt-2 md:px-6 md:pb-6">
        <div className="mx-auto max-w-[1040px]">
          {!selectedPerson && (
            <MythTraditionOverview key={activeTradition.id} tradition={activeTradition} memberCount={activePeople.length} workCount={activeWorks.length} />
          )}
          {selectedPerson && (
            <div ref={contentRef} className="min-w-0 overflow-hidden rounded-[24px] border border-white/[0.08] scroll-mt-20">
              <MythPersonDetail person={selectedPerson} tradition={activeTradition} works={selectedWorks} onClose={() => setSelectedPersonId(null)} />
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
