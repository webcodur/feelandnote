"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Clock3 } from "lucide-react";
import { useTranslations } from "next-intl";
import type { MythAtlasData, MythPerson, MythRegion, MythWork } from "@/actions/home/mythAtlasTypes";
import AtlasNav, { type AtlasNavRow } from "@/components/shared/AtlasNav";
import { mythGroupName } from "./mythGroupName";
import MythGroupOverview from "./MythGroupOverview";
import MythPersonPicker from "./MythPersonPicker";
import MythPersonDetail from "./MythPersonDetail";
import MythOverview from "./MythOverview";
import MythWorkShelf from "./MythWorkShelf";
import DeveloperCommerceFallback from "@/components/features/commerce/DeveloperCommerceFallback";
import { useRegisterFactionMusic } from "@/contexts/FactionMusicContext";

import { MYTH_LAYOUT as layout } from "./mythLayout";
import { MYTH_PARAM } from "./mythHref";

interface Props { data: MythAtlasData }

function focusedMyth(data: MythAtlasData, personId: string | null) {
  const published = data.myths.filter((item) => item.isPublished);
  const matches = published.filter((item) => personId && item.personIds.includes(personId));
  return matches.sort((a, b) => a.personIds.length - b.personIds.length)[0]?.id ?? published[0]?.id ?? null;
}

export default function MythAtlas({ data }: Props) {
  const t = useTranslations("explore.hub.myth");
  const groupLabels = { other: t("otherGroup"), unnamed: t("unnamedGroup") };
  /* 주소에 신화가 있으면(음악 재생기 바로가기 등) 그 신화를 고른 채 연다 */
  const requestedSlug = useSearchParams().get(MYTH_PARAM);
  const requestedMyth = data.myths.find((myth) => myth.isPublished && myth.slug === requestedSlug);
  const openingMythId = requestedMyth?.id ?? focusedMyth(data, data.openingPersonId);
  const openingMyth = data.myths.find((myth) => myth.id === openingMythId);
  const [regionId, setRegionId] = useState<string | null>(openingMyth?.regionId ?? data.regions[0]?.id ?? null);
  const [mythId, setMythId] = useState<string | null>(openingMythId);
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
  const [comingSoonId, setComingSoonId] = useState<string | null>(null);
  const [groupId, setGroupId] = useState<string | null>(null);
  const [appliedSlug, setAppliedSlug] = useState(requestedSlug);
  const contentRef = useRef<HTMLDivElement>(null);

  /* 신화 화면에 머문 채 다른 신화 주소로 오면 그 신화로 옮긴다 */
  if (requestedSlug !== appliedSlug) {
    setAppliedSlug(requestedSlug);
    if (requestedMyth && requestedMyth.id !== mythId) {
      setRegionId(requestedMyth.regionId);
      setMythId(requestedMyth.id);
      setGroupId(null);
      setSelectedPersonId(null);
    }
  }

  /* 화면에서 고른 신화를 주소에 남긴다. 주소가 늘 보이는 신화를 가리켜야 같은 바로가기를 다시 눌러도 그 신화로 돌아온다 */
  const rememberMyth = (slug: string | undefined) => {
    const url = new URL(window.location.href);
    if (slug) url.searchParams.set(MYTH_PARAM, slug);
    else url.searchParams.delete(MYTH_PARAM);
    window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
  };

  useEffect(() => {
    if (!comingSoonId) return;
    const timer = setTimeout(() => setComingSoonId(null), 2000);
    return () => clearTimeout(timer);
  }, [comingSoonId]);

  const publishedMythIds = useMemo(
    () => new Set(data.myths.filter((myth) => myth.isPublished).map((myth) => myth.id)),
    [data.myths],
  );
  const isRegionPublished = (region: MythRegion) => region.mythIds.some((id) => publishedMythIds.has(id));
  /* 지역은 준비 여부와 무관하게 전부 고를 수 있다. 준비 중인 지역은 신화 칩이 잠긴 채 안내만 보인다 */
  const activeRegion = data.regions.find((region) => region.id === regionId)
    ?? data.regions.find(isRegionPublished)
    ?? null;
  const regionMyths = useMemo(
    () => data.myths.filter((myth) => activeRegion?.mythIds.includes(myth.id)),
    [activeRegion, data.myths],
  );
  const activeMyth = regionMyths.find((myth) => myth.id === mythId && myth.isPublished)
    ?? regionMyths.find((myth) => myth.isPublished)
    ?? null;
  useRegisterFactionMusic(activeMyth?.music
    ? { id: activeMyth.id, title: activeMyth.name, url: activeMyth.music.url, kind: "myth" }
    : null);
  /* 신화가 정한 차례를 그대로 따른다. 인물 목록을 훑어 거르면 신화와 무관한 전역 차례가
     나오고, 한 인물이 여러 신화에 속할 때 각 신화에서 잡아 둔 자리도 잃는다 */
  const activePeople = useMemo(() => {
    const byId = new Map(data.people.map((person) => [person.id, person]));
    return (activeMyth?.personIds ?? [])
      .map((id) => byId.get(id))
      .filter((person): person is MythPerson => Boolean(person));
  }, [activeMyth, data.people]);
  /* 그룹을 고르면 그 그룹의 인물만 인물 줄에 세운다. 고르지 않으면 인물 줄은 전원,
     본문은 신화 개요다. 작품·인원 수는 늘 신화 전체 기준이다 */
  const activeGroup = activeMyth?.groups.find((group) => group.id === groupId) ?? null;
  const railPeople = useMemo(() => {
    if (!activeGroup) return activePeople;
    const byId = new Map(activePeople.map((person) => [person.id, person]));
    return activeGroup.personIds
      .map((id) => byId.get(id))
      .filter((person): person is MythPerson => Boolean(person));
  }, [activeGroup, activePeople]);
  /* 대표 인물 — 신화가 따로 뽑은 3인을 타이틀 아트에 세운다. 인물 줄의 클러스터 차례와 무관하다 */
  const leadPeople = useMemo(() => {
    const byId = new Map(activePeople.map((person) => [person.id, person]));
    return (activeMyth?.leadPersonIds ?? [])
      .map((id) => byId.get(id))
      .filter((person): person is MythPerson => Boolean(person));
  }, [activeMyth, activePeople]);
  const activeIds = useMemo(() => new Set(activePeople.map((person) => person.id)), [activePeople]);
  const activeWorks = useMemo(
    () => data.works.filter((work) => work.personIds.some((id) => activeIds.has(id))),
    [activeIds, data.works],
  );
  const selectedPerson = activePeople.find((person) => person.id === selectedPersonId) ?? null;
  const selectedWorks = selectedPerson ? activeWorks.filter((work) => selectedPerson.sourceIds.includes(work.id)) : [];

  /* 개요 아래 작품 선반 — 지금 보이는 인물 범위(신화 전원 또는 고른 그룹)의 작품을 띄운다.
     차례는 그 범위 안에 인물을 가장 많이 담은 책부터 — 이 신화의 대표 원전(오디세이아의 호메로스)이
     신화 전체에 걸쳐 인물이 많은 참고서(그리스 신화 전편)에 밀리지 않게 범위 안 수로 센다.
     인물을 고르면 선반은 인물 상세 안으로 들어가 그 사람의 작품만 보인다 */
  const railIds = useMemo(() => new Set(railPeople.map((person) => person.id)), [railPeople]);
  const shelfWorks = useMemo(() => {
    const castHere = (work: MythWork) => work.personIds.filter((id) => railIds.has(id)).length;
    return activeWorks
      .filter((work) => castHere(work) > 0)
      .sort((a, b) => castHere(b) - castHere(a) || a.title.localeCompare(b.title));
  }, [activeWorks, railIds]);

  useEffect(() => {
    if (!selectedPersonId || !window.matchMedia("(max-width: 1023px)").matches) return;
    contentRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [selectedPersonId]);

  const chooseRegion = (nextRegionId: string) => {
    const nextRegion = data.regions.find((region) => region.id === nextRegionId);
    if (!nextRegion) return;
    const nextMyth = data.myths.find(
      (myth) => nextRegion.mythIds.includes(myth.id) && myth.isPublished,
    );
    setRegionId(nextRegionId);
    setMythId(nextMyth?.id ?? null);
    setGroupId(null);
    setSelectedPersonId(null);
    rememberMyth(nextMyth?.slug);
  };

  const chooseMyth = (nextId: string) => {
    const nextMyth = data.myths.find((myth) => myth.id === nextId && myth.isPublished);
    if (!nextMyth) return;
    setMythId(nextId);
    setGroupId(null);
    setSelectedPersonId(null);
    rememberMyth(nextMyth.slug);
  };

  /** null이면 그룹 선택을 푼다 — 본문이 신화 개요로 돌아간다 */
  const chooseGroup = (nextId: string | null) => {
    setGroupId(nextId);
    setSelectedPersonId(null);
  };

  const choosePerson = (id: string) => setSelectedPersonId((current) => current === id ? null : id);

  if (!activeRegion) return null;
  const hasContent = Boolean(activeMyth) && activePeople.length > 0;

  /* 지역(알약)·신화(네모)·그룹(밑줄 탭) — 세력도감과 같은 공용 선택기에 줄로 넘긴다 */
  const rows: AtlasNavRow[] = [
    {
      id: "regions",
      label: t("regionNav"),
      shape: "pill",
      activeId: activeRegion.id,
      items: data.regions.map((region) => ({ id: region.id, name: region.name })),
      onSelect: chooseRegion,
    },
    {
      id: "myths",
      label: t("mythNav"),
      shape: "square",
      activeId: activeMyth?.id ?? null,
      emptyLabel: t("comingSoon"),
      items: regionMyths.map((myth) => ({ id: myth.id, name: myth.name, disabled: !myth.isPublished })),
      onSelect: chooseMyth,
      onDisabledSelect: setComingSoonId,
      noticeId: comingSoonId,
      noticeLabel: t("comingSoon"),
    },
  ];
  /* 그룹 — 인물이 많은 신화를 묶음별로 나눠 보인다. 묶음이 없는 신화는 줄을 숨긴다.
     「전체」 항목은 두지 않는다. 처음에는 아무 그룹도 고르지 않은 채 신화 개요를 보이고,
     고른 그룹을 다시 누르면 선택을 풀어 신화 개요로 돌아간다 */
  if (hasContent && activeMyth && activeMyth.groups.length > 0) {
    rows.push({
      id: "groups",
      label: t("groupNav"),
      shape: "tab",
      wide: true,
      activeId: activeGroup?.id ?? null,
      emptyLabel: t("groupNav"),
      items: activeMyth.groups.map((group) => ({ id: group.id, name: mythGroupName(group, groupLabels), count: group.personIds.length })),
      onSelect: chooseGroup,
      onClear: () => chooseGroup(null),
      clearLabel: t("clearGroup"),
    });
  }

  return (
    <section id="myth-atlas" aria-label={t("title")} className={layout.atlas}>
      <div className={layout.navigationOuter}>
        <AtlasNav rows={rows} bareOnMobile>
          {/* 마지막 줄 — 인물. 지역·신화·그룹 줄과 같은 상자에 같은 결로 쌓는다 */}
          {hasContent && (
            <div className={layout.nav}>
              <MythPersonPicker people={railPeople} selectedId={selectedPersonId} onSelect={choosePerson} />
            </div>
          )}
        </AtlasNav>
      </div>

      {hasContent && activeMyth ? (
        <>
          <div className={layout.overviewOuter}>
            <div className={layout.container}>
              {/* 인물을 고르기 전 본문 — 그룹을 고르지 않았으면 신화 개요, 그룹을 고르면 그 그룹 개요다.
                  인물 상세에서 뒤로 가면 보던 그룹 개요로 돌아온다 */}
              {!selectedPerson && !activeGroup && (
                <MythOverview key={activeMyth.id} myth={activeMyth} memberCount={activePeople.length} workCount={activeWorks.length} leadPeople={leadPeople} onSelectPerson={choosePerson} />
              )}
              {!selectedPerson && activeGroup && (
                <MythGroupOverview key={`${activeMyth.id}-${activeGroup.id}`} myth={activeMyth} group={activeGroup} people={railPeople} onSelectPerson={choosePerson} />
              )}
              {selectedPerson && (
                <div ref={contentRef} className="min-w-0 overflow-hidden rounded-[24px] scroll-mt-20 md:border md:border-white/[0.08]">
                  <MythPersonDetail key={`${activeMyth.id}-${selectedPerson.id}`} person={selectedPerson} myth={activeMyth} works={selectedWorks} onClose={() => setSelectedPersonId(null)} backLabel={activeGroup ? t("backToGroup") : t("backToOverview")} />
                </div>
              )}
              {/* 작품 선반 — 인물을 고르기 전 본문 아래에 같은 선반을 띄운다. 인물 상세 안의 선반과 같은 부품·같은 결 */}
              {!selectedPerson && shelfWorks.length > 0 && (
                <div className="mt-4 overflow-hidden rounded-[24px] bg-black/[0.14] px-5 py-6 md:px-8 md:py-8">
                  <MythWorkShelf key={`${activeMyth.id}-${activeGroup?.id ?? "all"}`} works={shelfWorks} selectedPersonId="" mythName={activeMyth.name} mythSlug={activeMyth.slug} />
                </div>
              )}
              {(selectedPerson ? selectedWorks : shelfWorks).every((work) => work.editionId === undefined && !work.coupangUrl) && (
                <DeveloperCommerceFallback
                  target={{ title: [activeMyth.name, selectedPerson?.name ?? (activeGroup ? mythGroupName(activeGroup, groupLabels) : null)].filter(Boolean).join(" "), type: "TOPIC" }}
                  placement="myth-selection"
                />
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
