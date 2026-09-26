"use client";

import { useCallback, useMemo, useState, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import { Clock3 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import type { MythData, MythPerson, MythWork } from "@/actions/home/mythTypes";
import { useRouter } from "@/i18n/navigation";
import AtlasNavigation from "./AtlasNavigation";
import { ATLAS_GROUP_PARAM, type AtlasSelection, type AtlasTheme } from "./atlasNavigationData";
import { mythGroupName } from "./mythGroupName";
import MythPersonPicker from "./MythPersonPicker";
import MythPersonDetail from "./MythPersonDetail";
import MythOverview from "./MythOverview";
import MythWorkShelf from "./MythWorkShelf";
import DeveloperCommerceFallback from "@/components/features/commerce/DeveloperCommerceFallback";
import { useRegisterFactionMusic } from "@/contexts/FactionMusicContext";

import { MYTH_LAYOUT as layout } from "./mythLayout";
import { MYTH_PARAM } from "./mythHref";

/** 팩션도 같은 선택·개요·그룹·본문을 쓴다. 주소 이동과 인물별 자료만 호출부가 제공한다. */
export interface ThemeScreenOptions {
  navigationTree: AtlasTheme[];
  themeId: string;
  title: string;
  overviewLabel: string;
  overviewFallback: string;
  renderPerson: (person: MythPerson, onClose: () => void) => ReactNode;
  renderWorks: (personIds: string[]) => ReactNode;
}

interface Props { data: MythData; faction?: ThemeScreenOptions }

function FactionPerson({ renderPerson, person, onClose }: Pick<ThemeScreenOptions, "renderPerson"> & {
  person: MythPerson; onClose: () => void;
}) {
  return renderPerson(person, onClose);
}

function focusedMyth(data: MythData, personId: string | null) {
  const published = data.myths.filter((item) => item.isPublished);
  const matches = published.filter((item) => personId && item.personIds.includes(personId));
  return matches.sort((a, b) => a.personIds.length - b.personIds.length)[0]?.id ?? published[0]?.id ?? null;
}

export default function MythScreen({ data, faction }: Props) {
  const locale = useLocale();
  const router = useRouter();
  const t = useTranslations("explore.hub.myth");
  const groupLabels = { other: t("otherGroup"), unnamed: t("unnamedGroup") };
  /* 주소에 신화가 있으면(음악 재생기 바로가기 등) 그 신화를 고른 채 연다 */
  const searchParams = useSearchParams();
  const requestedSlug = faction ? null : searchParams.get(MYTH_PARAM);
  const requestedMyth = data.myths.find((myth) => myth.isPublished && myth.slug === requestedSlug);
  const openingMythId = requestedMyth?.id ?? focusedMyth(data, data.openingPersonId);
  const openingMyth = data.myths.find((myth) => myth.id === openingMythId);
  const [regionId, setRegionId] = useState<string | null>(openingMyth?.regionId ?? data.regions[0]?.id ?? null);
  const [mythId, setMythId] = useState<string | null>(openingMythId);
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
  const requestedGroup = searchParams.get(ATLAS_GROUP_PARAM);
  const [groupId, setGroupId] = useState<string | null>(requestedGroup);
  const [appliedGroup, setAppliedGroup] = useState(requestedGroup);
  const [appliedSlug, setAppliedSlug] = useState(requestedSlug);
  const closePerson = useCallback(() => setSelectedPersonId(null), []);

  if (requestedGroup !== appliedGroup) {
    setAppliedGroup(requestedGroup);
    setGroupId(requestedGroup);
  }

  /* 신화 화면에 머문 채 다른 신화 주소로 오면 그 신화로 옮긴다 */
  if (requestedSlug !== appliedSlug) {
    setAppliedSlug(requestedSlug);
    if (requestedMyth && requestedMyth.id !== mythId) {
      setRegionId(requestedMyth.regionId);
      setMythId(requestedMyth.id);
      setGroupId(requestedGroup);
      setSelectedPersonId(null);
    }
  }

  /* 화면에서 고른 신화를 주소에 남긴다. 주소가 늘 보이는 신화를 가리켜야 같은 바로가기를 다시 눌러도 그 신화로 돌아온다 */
  const rememberMyth = (slug: string | undefined, group: string | null) => {
    if (faction) return;
    const url = new URL(window.location.href);
    if (slug) url.searchParams.set(MYTH_PARAM, slug);
    else url.searchParams.delete(MYTH_PARAM);
    if (group) url.searchParams.set(ATLAS_GROUP_PARAM, group);
    else url.searchParams.delete(ATLAS_GROUP_PARAM);
    window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
  };

  const activeRegion = data.regions.find((region) => region.id === regionId) ?? data.regions[0] ?? null;
  const regionMyths = useMemo(
    () => data.myths.filter((myth) => activeRegion?.mythIds.includes(myth.id)),
    [activeRegion, data.myths],
  );
  const activeMyth = regionMyths.find((myth) => myth.id === mythId && myth.isPublished)
    ?? regionMyths.find((myth) => myth.isPublished)
    ?? null;
  useRegisterFactionMusic(activeMyth?.music
    ? { id: activeMyth.id, title: activeMyth.name, url: activeMyth.music.url, kind: faction ? "faction" : "myth" }
    : null);
  /* 신화가 정한 차례를 그대로 따른다. 인물 목록을 훑어 거르면 신화와 무관한 전역 차례가
     나오고, 한 인물이 여러 신화에 속할 때 각 신화에서 잡아 둔 자리도 잃는다 */
  const activePeople = useMemo(() => {
    const byId = new Map(data.people.map((person) => [person.id, person]));
    return (activeMyth?.personIds ?? [])
      .map((id) => byId.get(id))
      .filter((person): person is MythPerson => Boolean(person));
  }, [activeMyth, data.people]);
  // 그룹 선택은 인물·작품을 거른다. 표지와 개요 통계는 늘 전체 기준이다.
  const activeGroup = activeMyth?.groups.find((group) => group.id === groupId) ?? null;
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

  /* 인물 목록 아래 작품 선반 — 지금 보이는 인물 범위(신화 전원 또는 고른 그룹)의 작품을 띄운다.
     차례는 그 범위 안에 인물을 가장 많이 담은 책부터 — 이 신화의 대표 원전(오디세이아의 호메로스)이
     신화 전체에 걸쳐 인물이 많은 참고서(그리스 신화 전편)에 밀리지 않게 범위 안 수로 센다.
     인물 모달이 떠도 뒤의 선반은 유지해 닫을 때 스크롤 위치가 바뀌지 않게 한다 */
  const railIds = useMemo(() => new Set(railPeople.map((person) => person.id)), [railPeople]);
  const shelfWorks = useMemo(() => {
    const castHere = (work: MythWork) => work.personIds.filter((id) => railIds.has(id)).length;
    return activeWorks
      .filter((work) => castHere(work) > 0)
      .sort((a, b) => castHere(b) - castHere(a) || a.title.localeCompare(b.title));
  }, [activeWorks, railIds]);

  const navigationTree: AtlasTheme[] = faction?.navigationTree ?? data.regions.map((region) => ({
    id: region.id, name: region.name,
    entries: data.myths.filter((myth) => region.mythIds.includes(myth.id)).map((myth) => ({
      id: myth.id, name: myth.name, count: myth.personIds.length, disabled: !myth.isPublished,
      groups: myth.groups.map((group) => ({ id: group.id, name: mythGroupName(group, groupLabels), count: group.personIds.length })),
    })),
  }));
  const chooseAtlas = (selection: AtlasSelection) => {
    if (faction && selection.entryId !== activeMyth?.id) {
      const entry = navigationTree.find((item) => item.id === selection.themeId)?.entries.find((item) => item.id === selection.entryId);
      if (entry?.href) {
        const query = selection.groupId ? `?${ATLAS_GROUP_PARAM}=${encodeURIComponent(selection.groupId)}` : "";
        router.push(`${entry.href}${query}`, { scroll: false });
      }
      return;
    }
    if (!faction) {
      setRegionId(selection.themeId);
      setMythId(selection.entryId);
      rememberMyth(data.myths.find((myth) => myth.id === selection.entryId)?.slug, selection.groupId);
    } else {
      const url = new URL(window.location.href);
      if (selection.groupId) url.searchParams.set(ATLAS_GROUP_PARAM, selection.groupId);
      else url.searchParams.delete(ATLAS_GROUP_PARAM);
      window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
    }
    setGroupId(selection.groupId);
    setSelectedPersonId(null);
  };
  if (!activeRegion) return null;
  const hasContent = Boolean(activeMyth) && activePeople.length > 0;
  const navigation = (overview?: ReactNode) => (
    <AtlasNavigation tree={navigationTree} myth={!faction} onSelect={chooseAtlas} overview={overview}
      selection={{ themeId: faction?.themeId ?? activeRegion.id, entryId: activeMyth?.id ?? null, groupId: activeGroup?.id ?? null }} />
  );

  return (
    <section id={faction ? "faction" : "myth"} aria-label={faction?.title ?? t("title")} className={`${layout.shell} ${locale === "ko" ? "break-all" : ""}`}>
      <div className={layout.navigationOuter}>
        <div className={layout.selectionPanel} data-faction-selection>
          {hasContent && activeMyth ? (
            <MythOverview key={activeMyth.id} myth={activeMyth} memberCount={activePeople.length} workCount={activeWorks.length} overviewLabel={faction?.overviewLabel} fallback={faction?.overviewFallback}
              navigation={navigation} />
          ) : navigation()}
        </div>
      </div>

      {hasContent && activeMyth ? (
        <>
          <div className={layout.membersOuter}>
            <div className={layout.container}>
              <MythPersonPicker key={`${activeMyth.id}-${activeGroup?.id ?? "all"}`}
                people={railPeople} selectedId={selectedPersonId} onSelect={setSelectedPersonId}
                name={activeGroup ? mythGroupName(activeGroup, groupLabels) : t("memberList")}
                groupDescription={activeGroup?.description} />
            </div>
          </div>
          {selectedPerson && (faction
            ? <FactionPerson renderPerson={faction.renderPerson} person={selectedPerson} onClose={closePerson} />
            : <MythPersonDetail key={`${activeMyth.id}-${selectedPerson.id}`} person={selectedPerson} myth={activeMyth} onClose={closePerson} />
          )}
          <div className={layout.overviewOuter}>
            <div className={layout.container}>
              {/* 모달을 열어도 목록·책장의 높이와 스크롤 위치는 그대로 유지한다. */}
              {(faction ? faction.renderWorks(railPeople.map((person) => person.id)) : shelfWorks.length > 0 && (
                <div className="mt-4 overflow-hidden rounded-[24px] bg-black/[0.14] px-5 py-6 md:px-8 md:py-8">
                  <MythWorkShelf key={`${activeMyth.id}-${activeGroup?.id ?? "all"}`} works={shelfWorks} selectedPersonId="" mythName={activeMyth.name} mythSlug={activeMyth.slug} />
                </div>
              ))}
              {!faction && shelfWorks.every((work) => work.editionId === undefined && !work.coupangUrl) && (
                <DeveloperCommerceFallback
                  target={{ title: [activeMyth.name, activeGroup ? mythGroupName(activeGroup, groupLabels) : null].filter(Boolean).join(" "), type: "TOPIC" }}
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
