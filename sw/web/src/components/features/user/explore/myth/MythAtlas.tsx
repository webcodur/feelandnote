"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Clock3 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMouseDragScroll } from "@/hooks/useMouseDragScroll";
import type { MythAtlasData, MythPerson, MythRegion, MythWork } from "@/actions/home/mythAtlasTypes";
import { mythGroupName } from "./mythGroupName";
import MythMobilePicker from "./MythMobilePicker";
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
  const groupLabels = { other: t("otherGroup"), unnamed: t("unnamedGroup") };
  const openingTraditionId = focusedTradition(data, data.openingPersonId);
  const openingTradition = data.traditions.find((tradition) => tradition.id === openingTraditionId);
  const [regionId, setRegionId] = useState<string | null>(openingTradition?.regionId ?? data.regions[0]?.id ?? null);
  const [traditionId, setTraditionId] = useState<string | null>(openingTraditionId);
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
  const [comingSoonId, setComingSoonId] = useState<string | null>(null);
  const [groupId, setGroupId] = useState<string | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const { ref: regionListRef, cursorClassName: regionCursor, dragProps: regionDragProps } = useMouseDragScroll();
  const { ref: traditionListRef, cursorClassName: traditionCursor, dragProps: traditionDragProps } = useMouseDragScroll();
  const { ref: groupListRef, cursorClassName: groupCursor, dragProps: groupDragProps } = useMouseDragScroll();

  useEffect(() => {
    if (!comingSoonId) return;
    const timer = setTimeout(() => setComingSoonId(null), 2000);
    return () => clearTimeout(timer);
  }, [comingSoonId]);

  const publishedTraditionIds = useMemo(
    () => new Set(data.traditions.filter((tradition) => tradition.isPublished).map((tradition) => tradition.id)),
    [data.traditions],
  );
  const isRegionPublished = (region: MythRegion) => region.traditionIds.some((id) => publishedTraditionIds.has(id));
  /* 지역은 준비 여부와 무관하게 전부 고를 수 있다. 준비 중인 지역은 신화 칩이 잠긴 채 안내만 보인다 */
  const activeRegion = data.regions.find((region) => region.id === regionId)
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
  /* 묶음이 있는 전승은 고른 묶음의 인물만 인물 줄에 세운다. 작품·인원 수는 전승 전체 기준 그대로다 */
  const activeGroup = activeTradition?.groups.find((group) => group.id === groupId) ?? activeTradition?.groups[0] ?? null;
  const railPeople = useMemo(() => {
    if (!activeGroup) return activePeople;
    const byId = new Map(activePeople.map((person) => [person.id, person]));
    return activeGroup.personIds
      .map((id) => byId.get(id))
      .filter((person): person is MythPerson => Boolean(person));
  }, [activeGroup, activePeople]);
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

  /* 고른 칩을 줄 가운데로 옮긴다 — 지역·신화 줄은 한 줄짜리라 고른 칩이 화면 밖에 있을 수 있다 */
  useEffect(() => {
    [regionListRef.current, traditionListRef.current, groupListRef.current].forEach((scroller) => {
      const selected = scroller?.querySelector<HTMLElement>('[aria-pressed="true"]');
      if (!scroller || !selected) return;
      const scrollerRect = scroller.getBoundingClientRect();
      const selectedRect = selected.getBoundingClientRect();
      scroller.scrollLeft += selectedRect.left - scrollerRect.left - (scrollerRect.width - selectedRect.width) / 2;
    });
  }, [activeRegion?.id, activeTradition?.id, activeGroup?.id, regionListRef, traditionListRef, groupListRef]);

  useEffect(() => {
    if (!selectedPersonId || !window.matchMedia("(max-width: 1023px)").matches) return;
    contentRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [selectedPersonId]);

  const chooseRegion = (nextRegionId: string) => {
    const nextRegion = data.regions.find((region) => region.id === nextRegionId);
    if (!nextRegion) return;
    const nextTradition = data.traditions.find(
      (tradition) => nextRegion.traditionIds.includes(tradition.id) && tradition.isPublished,
    );
    setRegionId(nextRegionId);
    setTraditionId(nextTradition?.id ?? null);
    setGroupId(null);
    setSelectedPersonId(null);
  };

  const chooseTradition = (nextId: string) => {
    if (!data.traditions.some((tradition) => tradition.id === nextId && tradition.isPublished)) return;
    setTraditionId(nextId);
    setGroupId(null);
    setSelectedPersonId(null);
  };

  const chooseGroup = (nextId: string) => {
    setGroupId(nextId);
    setSelectedPersonId(null);
  };

  const choosePerson = (id: string) => setSelectedPersonId((current) => current === id ? null : id);

  if (!activeRegion) return null;
  const hasContent = Boolean(activeTradition) && activePeople.length > 0;

  return (
    <section id="myth-atlas" aria-label={t("title")} className={layout.atlas}>
      <div className={layout.navigationOuter}>
        <div className={layout.navigation}>
          <MythMobilePicker
            regions={data.regions}
            activeRegion={activeRegion}
            traditions={regionTraditions}
            activeTradition={activeTradition}
            comingSoonId={comingSoonId}
            onChooseRegion={chooseRegion}
            onChooseTradition={chooseTradition}
            onComingSoon={setComingSoonId}
            groups={hasContent && activeTradition ? activeTradition.groups : []}
            activeGroup={activeGroup}
            onChooseGroup={chooseGroup}
          />

          <nav className={layout.chipNav} aria-label={t("regionNav")}>
            <div ref={regionListRef} {...regionDragProps} className={`${layout.navList} ${regionCursor}`}>
              {data.regions.map((region) => {
                const selected = region.id === activeRegion.id;
                return (
                  <button
                    key={region.id}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => chooseRegion(region.id)}
                    className={`flex shrink-0 snap-start items-center justify-center border px-3.5 py-1.5 text-sm font-semibold ${layout.regionChipShape} ${selected ? "border-accent bg-accent/10 text-accent shadow-[inset_0_0_0_1px_rgba(217,181,78,.1)]" : "border-white/[0.18] bg-white/[0.04] text-text-secondary hover:border-accent/60 hover:bg-accent/[0.05] hover:text-accent"}`}
                  >
                    {region.name}
                  </button>
                );
              })}
            </div>
          </nav>

          <nav className={layout.chipNav} aria-label={t("traditionNav")}>
            <div ref={traditionListRef} {...traditionDragProps} className={`${layout.navList} ${traditionCursor}`}>
              {regionTraditions.map((tradition) => {
                const selected = tradition.id === activeTradition?.id;
                const published = tradition.isPublished;
                const showingComingSoon = comingSoonId === tradition.id;
                return (
                  <button
                    key={tradition.id}
                    type="button"
                    aria-pressed={selected}
                    aria-label={published ? tradition.name : `${tradition.name} · ${t("comingSoon")}`}
                    onClick={() => (published ? chooseTradition(tradition.id) : setComingSoonId(tradition.id))}
                    className={`flex shrink-0 snap-start items-center justify-center border px-3.5 py-1.5 text-center text-sm font-semibold ${layout.traditionChipShape} ${selected ? "border-accent bg-accent/10 text-accent shadow-[inset_0_0_0_1px_rgba(217,181,78,.1)]" : published ? "border-white/[0.18] bg-white/[0.04] text-text-secondary hover:border-accent/60 hover:bg-white/[0.07] hover:text-text-primary" : showingComingSoon ? "cursor-not-allowed border-dashed border-white/25 bg-white/[0.05] text-text-secondary" : "cursor-not-allowed border-dashed border-white/[0.1] bg-transparent text-white/35"}`}
                  >
                    {published ? <span>{tradition.name}</span> : (
                      /* 누르면 이름 자리에 잠깐 「준비 중」을 띄웠다 돌아온다. 두 글을 한 칸에 겹쳐 두어
                         글이 바뀌어도 칩 폭이 그대로다 — 폭이 바뀌면 옆 칩들이 밀린다 */
                      <span className="grid">
                        <span className={`[grid-area:1/1] ${showingComingSoon ? "invisible" : ""}`}>{tradition.name}</span>
                        <span aria-hidden className={`[grid-area:1/1] flex items-center justify-center gap-1 whitespace-nowrap ${showingComingSoon ? "" : "invisible"}`}>
                          <Clock3 size={13} aria-hidden />{t("comingSoon")}
                        </span>
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </nav>

          {/* 그룹 — 인물이 많은 전승을 묶음별로 나눠 보인다. 묶음이 없는 전승은 줄을 숨긴다 */}
          {hasContent && activeTradition && activeTradition.groups.length > 0 && (
            <nav className={layout.chipNav} aria-label={t("groupNav")}>
              <div ref={groupListRef} {...groupDragProps} className={`${layout.navList} ${groupCursor}`}>
                {activeTradition.groups.map((group) => {
                  const selected = group.id === activeGroup?.id;
                  return (
                    <button
                      key={group.id}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => chooseGroup(group.id)}
                      className={`${layout.groupTab} ${selected ? "border-accent text-accent" : "border-transparent text-text-secondary hover:text-text-primary"}`}
                    >
                      {mythGroupName(group, groupLabels)}
                      <span className="ms-1.5 text-xs font-medium text-text-tertiary">{group.personIds.length}</span>
                    </button>
                  );
                })}
              </div>
            </nav>
          )}

          {/* 마지막 줄 — 인물. 지역·신화·그룹 줄과 같은 상자에 같은 결로 쌓는다 */}
          {hasContent && (
            <div className={layout.nav}>
              <MythPersonPicker people={railPeople} selectedId={selectedPersonId} onSelect={choosePerson} />
            </div>
          )}
        </div>
      </div>

      {hasContent && activeTradition ? (
        <>
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
        </>
      ) : (
        <div className={layout.overviewOuter}>
          <div className={layout.container}>
            <div role="status" className={layout.notice}>
              <Clock3 size={14} className="mt-0.5 shrink-0 text-accent/70" aria-hidden />
              <p>{t("comingSoon")}</p>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
