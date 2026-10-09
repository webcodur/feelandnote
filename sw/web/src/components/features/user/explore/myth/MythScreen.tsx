"use client";

import { useCallback, useEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight, Clock3 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import type { MythData, MythPerson, MythWork } from "@/actions/home/mythTypes";
import { usePathname, useRouter } from "@/i18n/navigation";
import AtlasNavigation from "./AtlasNavigation";
import AtlasPicker from "./AtlasPicker";
import { buildMythNavigation } from "@/lib/atlas-navigation";
import { ATLAS_GROUP_PARAM, ATLAS_PERSON_PARAM, type AtlasSelection, type AtlasTheme } from "./atlasNavigationData";
import RecentHistoryRail from "@/components/shared/RecentHistoryRail";
import { useRecentAtlas } from "@/hooks/useRecentAtlas";
import { recentAtlasHref } from "@/lib/recent-atlas";
import { mythGroupName } from "./mythGroupName";
import MythPersonPicker from "./MythPersonPicker";
import MythPersonDetail from "./MythPersonDetail";
import MythOverview from "./MythOverview";
import MythWorkShelf from "./MythWorkShelf";
import AtlasNavSections from "@/components/shared/atlasNav/AtlasNavSections";
import type { AtlasNavItem } from "@/components/shared/atlasNav/AtlasNav";
import HubSection from "@/components/shared/HubSection";
import AtlasIndex, { type AtlasIndexGroup } from "./AtlasIndex";
import SceneCompletionBadge from "./SceneCompletionBadge";
import DeveloperCommerceFallback from "@/components/features/commerce/DeveloperCommerceFallback";
import ContentTextModal from "@/components/ui/ContentTextModal";
import { useRegisterFactionMusic } from "@/contexts/FactionMusicContext";

import { MYTH_LAYOUT as layout } from "./mythLayout";
import { MYTH_LAST_COOKIE, MYTH_LAST_COOKIE_MAX_AGE, MYTH_OPENING_SLUG, MYTH_PARAM, atlasPageOwnsTitle, mythHref, mythSlugFromPath } from "./mythHref";

/** 팩션도 같은 선택·개요·그룹·본문을 쓴다. 주소 이동과 인물별 자료만 호출부가 제공한다. */
export interface ThemeScreenOptions {
  navigationTree: AtlasTheme[];
  themeId: string;
  title: string;
  overviewLabel: string;
  overviewFallback: string;
  /** 책장 구획 머리·목차가 쓰는 이름(세력 책장 등) — 신화는 explore.hub.myth의 worksTitle */
  shelfTitle: string;
  renderPerson: (person: MythPerson, onClose: () => void) => ReactNode;
  renderWorks: (personIds: string[]) => ReactNode;
  participation?: ReactNode;
}

interface Props {
  data: MythData;
  faction?: ThemeScreenOptions;
  /** 쿠키에 남은 마지막 신화 slug. 공개 신화와 맞을 때만 쓴다 */
  rememberedSlug?: string | null;
  /** 화면 아래에 늘 펼치는 전체 목록 — 비어 있으면 「전체」 구획과 목차 항목을 세우지 않는다 */
  indexHeading: string;
  indexGroups: AtlasIndexGroup[];
}

function saveLastMyth(slug: string) {
  const secure = window.location.protocol === "https:" ? "; secure" : "";
  document.cookie = `${MYTH_LAST_COOKIE}=${encodeURIComponent(slug)}; path=/; max-age=${MYTH_LAST_COOKIE_MAX_AGE}; samesite=lax${secure}`;
}

function FactionPerson({ renderPerson, person, onClose }: Pick<ThemeScreenOptions, "renderPerson"> & {
  person: MythPerson; onClose: () => void;
}) {
  return renderPerson(person, onClose);
}

const subscribeHydration = () => () => {};
const browserHydrated = () => true;
const serverHydrated = () => false;

export default function MythScreen({ data, faction, rememberedSlug = null, indexHeading, indexGroups }: Props) {
  // 공유·최근 주소의 인물 창은 Portal이므로 첫 서버 화면과 맞춘 뒤 연다.
  const hydrated = useSyncExternalStore(subscribeHydration, browserHydrated, serverHydrated);
  const locale = useLocale();
  const router = useRouter();
  const t = useTranslations("explore.hub.myth");
  const tUi = useTranslations("explore.ui");
  const tAtlas = useTranslations("explore.ui.atlas");
  const groupLabels = { other: t("otherGroup"), unnamed: t("unnamedGroup") };
  /* 신화 주소(/explore/myth/<slug>)면 그 신화를 고른 채 연다. 옛 바로가기(?myth=)는 미들웨어가 옮기지만
     미들웨어를 거치지 않은 화면 안 이동에 대비해 함께 읽는다 */
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const requestedSlug = faction ? null : mythSlugFromPath(pathname) ?? searchParams.get(MYTH_PARAM);
  const published = data.myths.filter((myth) => myth.isPublished);
  const publishedBySlug = (slug: string | null) => (slug ? published.find((myth) => myth.slug === slug) : undefined);
  const requestedMyth = publishedBySlug(requestedSlug);
  // 차례는 mythHref.ts의 MYTH_OPENING_SLUG 주석이 쥔다. 세력도감은 첫 항목으로 연다
  const openingMyth = requestedMyth
    ?? (faction ? undefined : publishedBySlug(rememberedSlug) ?? publishedBySlug(MYTH_OPENING_SLUG))
    ?? published[0];
  const [regionId, setRegionId] = useState<string | null>(openingMyth?.regionId ?? data.regions[0]?.id ?? null);
  const [mythId, setMythId] = useState<string | null>(openingMyth?.id ?? null);
  const requestedPerson = searchParams.get(ATLAS_PERSON_PARAM);
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(requestedPerson);
  const [appliedPerson, setAppliedPerson] = useState(requestedPerson);
  const [groupOverviewOpen, setGroupOverviewOpen] = useState(false);
  const closeGroupOverview = useCallback(() => setGroupOverviewOpen(false), []);
  // 선택 창의 임시 값은 확정 전까지 본문에 적용하지 않는다.
  const [pickerLevel, setPickerLevel] = useState<number | null>(null);
  const requestedGroup = searchParams.get(ATLAS_GROUP_PARAM);
  const [groupId, setGroupId] = useState<string | null>(requestedGroup);
  const [appliedGroup, setAppliedGroup] = useState(requestedGroup);
  const [appliedSlug, setAppliedSlug] = useState(requestedSlug);
  const closePerson = useCallback(() => {
    setSelectedPersonId(null);
    const url = new URL(window.location.href);
    if (url.searchParams.has(ATLAS_PERSON_PARAM)) {
      url.searchParams.delete(ATLAS_PERSON_PARAM);
      window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
    }
  }, []);

  if (requestedPerson !== appliedPerson) {
    setAppliedPerson(requestedPerson);
    setSelectedPersonId(requestedPerson);
  }

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
      setSelectedPersonId(requestedPerson);
    }
  }

  /* 첫 진입의 오디세이아도 기억한다. 다음 진입은 마지막 선택으로 이어지고,
     국가별 지역 정렬은 처음 열리는 작품을 바꾸지 않는다. 공유 주소는 언제나 우선한다. */
  const linkedSlug = requestedMyth?.slug ?? (!faction ? openingMyth?.slug : undefined);
  useEffect(() => {
    if (linkedSlug) saveLastMyth(linkedSlug);
  }, [linkedSlug]);

  /* 같은 신화의 진영 선택은 주소만 바꾼다. 다른 신화는 해당 주소에서 필요한 자료를 받아 연다. */
  const rememberMyth = (slug: string | undefined, group: string | null, person: string | null) => {
    if (faction) return;
    if (slug) saveLastMyth(slug);
    const url = new URL(window.location.href);
    const localePrefix = /^\/en(\/|$)/.test(url.pathname) ? "/en" : "";
    if (slug) url.pathname = `${localePrefix}${mythHref(slug)}`;
    url.searchParams.delete(MYTH_PARAM);
    if (group) url.searchParams.set(ATLAS_GROUP_PARAM, group);
    else url.searchParams.delete(ATLAS_GROUP_PARAM);
    if (person) url.searchParams.set(ATLAS_PERSON_PARAM, person);
    else url.searchParams.delete(ATLAS_PERSON_PARAM);
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
    () => data.works.filter((work) => work.personIds.some((id) => activeIds.has(id)) || (activeMyth && work.themeIds?.includes(activeMyth.id))),
    [activeIds, activeMyth, data.works],
  );
  const selectedPerson = activePeople.find((person) => person.id === selectedPersonId) ?? null;
  const hasContent = Boolean(activeMyth) && activePeople.length > 0;
  const navigationTree: AtlasTheme[] = faction?.navigationTree ?? buildMythNavigation(data, groupLabels);
  const completedEntryIds = new Set(navigationTree.flatMap(theme => theme.entries.filter(entry => entry.scenesComplete).map(entry => entry.id)));
  const completedIndexGroups = indexGroups.map(group => ({
    ...group, items: group.items.map(item => ({ ...item, scenesComplete: completedEntryIds.has(item.id) })),
  }));
  const recentItems = useRecentAtlas(faction ? "faction" : "myth", activeMyth?.id ?? null, activeGroup?.id ?? null, selectedPerson?.id ?? null, navigationTree);

  /* 상단 구획 목차 — 공용 아틀라스 내비게이션. 구성·책장은 자료가 있을 때만, 전체는 목록이
     있을 때만 세운다. 구획 머리와 목차는 한 몸이라 같은 이름을 쓰고 「— NN —」 번호도 따라간다 —
     머리가 선택 이름(가상자산 등)을 쥐므로 목차도 같은 이름을 보여 준다 */
  const selectionTitle = activeMyth?.name ?? t("tocSelection");
  const memberTitle = activeGroup ? mythGroupName(activeGroup, groupLabels) : t("memberList");
  const shelfTitle = faction?.shelfTitle ?? t("worksTitle");
  const hasIndex = indexGroups.some((group) => group.items.length > 0);
  const tocItems: AtlasNavItem[] = [
      { key: "selection", label: selectionTitle, sectionId: "atlas-selection" },
      ...(hasContent ? [
        { key: "members", label: memberTitle, sectionId: "atlas-members" },
        { key: "shelf", label: shelfTitle, sectionId: "atlas-shelf" },
      ] : []),
      ...(hasIndex ? [{ key: "index", label: indexHeading, sectionId: "atlas-index" }] : []),
    ].map((item, index) => ({ ...item, chapter: String(index + 1).padStart(2, "0") }));
  /* 한 편의 주소에서는 고른 이름이 페이지의 큰 제목(h1) — 첫 화면은 배너의 「신화의 세계」「세력도감」이 h1이다 */
  const ownsTitle = atlasPageOwnsTitle(pathname);
  const sectionTotal = tocItems.length;
  const navGroupId = faction ? "faction" : "myth";


  /* 인물 목록 아래 작품 선반 — 지금 보이는 인물 범위(신화 전원 또는 고른 그룹)의 작품을 띄운다.
     차례는 그 범위 안에 인물을 가장 많이 담은 책부터 — 이 신화의 대표 원전(오디세이아의 호메로스)이
     신화 전체에 걸쳐 인물이 많은 참고서(그리스 신화 전편)에 밀리지 않게 범위 안 수로 센다.
     인물 모달이 떠도 뒤의 선반은 유지해 닫을 때 스크롤 위치가 바뀌지 않게 한다 */
  const railIds = useMemo(() => new Set(railPeople.map((person) => person.id)), [railPeople]);
  const shelfWorks = useMemo(() => {
    const castHere = (work: MythWork) => work.personIds.filter((id) => railIds.has(id)).length;
    return activeWorks
      .filter((work) => castHere(work) > 0 || (activeMyth && work.themeIds?.includes(activeMyth.id)))
      .sort((a, b) => castHere(b) - castHere(a) || a.title.localeCompare(b.title));
  }, [activeWorks, activeMyth, railIds]);

  const chooseAtlas = (selection: AtlasSelection, personId: string | null = null) => {
    if (!faction && selection.entryId !== activeMyth?.id) {
      const entry = data.myths.find(myth => myth.id === selection.entryId && myth.isPublished);
      if (entry) {
        saveLastMyth(entry.slug);
        router.push(recentAtlasHref(mythHref(entry.slug), selection.groupId, personId), { scroll: false });
      }
      return;
    }
    if (faction && selection.entryId !== activeMyth?.id) {
      const entry = navigationTree.find((item) => item.id === selection.themeId)?.entries.find((item) => item.id === selection.entryId);
      if (entry?.href) {
        router.push(recentAtlasHref(entry.href, selection.groupId, personId), { scroll: false });
      }
      return;
    }
    if (!faction) {
      setRegionId(selection.themeId);
      setMythId(selection.entryId);
      rememberMyth(data.myths.find((myth) => myth.id === selection.entryId)?.slug, selection.groupId, personId);
    } else {
      const url = new URL(window.location.href);
      if (selection.groupId) url.searchParams.set(ATLAS_GROUP_PARAM, selection.groupId);
      else url.searchParams.delete(ATLAS_GROUP_PARAM);
      if (personId) url.searchParams.set(ATLAS_PERSON_PARAM, personId);
      else url.searchParams.delete(ATLAS_PERSON_PARAM);
      window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
    }
    setGroupId(selection.groupId);
    setSelectedPersonId(personId);
    setGroupOverviewOpen(false);
  };
  if (!activeRegion) return null;
  const atlasSel: AtlasSelection = { themeId: faction?.themeId ?? activeRegion.id, entryId: activeMyth?.id ?? null, groupId: activeGroup?.id ?? null };
  const groupChoices = [null, ...(navigationTree.find(theme => theme.id === atlasSel.themeId)?.entries.find(entry => entry.id === atlasSel.entryId)?.groups.map(group => group.id) ?? [])];
  const stepGroup = (direction: number) => {
    const current = Math.max(0, groupChoices.indexOf(atlasSel.groupId));
    chooseAtlas({ ...atlasSel, groupId: groupChoices[(current + direction + groupChoices.length) % groupChoices.length] });
  };
  const groupOverviewText = activeGroup
    ? activeGroup.description || t("groupDescriptionFallback")
    : activeMyth?.description || t("groupDescriptionFallback");
  const groupButtonStyle = "flex min-h-10 items-center justify-center px-3 text-text-secondary outline-none enabled:hover:bg-accent/10 enabled:hover:text-accent enabled:active:bg-accent/15 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent disabled:opacity-30";
  const navigation = (overview?: ReactNode) => (
    <AtlasNavigation tree={navigationTree} myth={!faction} onSelect={chooseAtlas} onOpenPicker={setPickerLevel} overview={overview}
      selection={atlasSel} />
  );

  return (
    <section id={faction ? "faction" : "myth"} aria-label={faction?.title ?? t("title")} className={`${layout.shell} ${locale === "ko" ? "break-all" : ""}`}>
      <AtlasNavSections items={tocItems} />
      <RecentHistoryRail items={recentItems} onSelect={item => {
        if (item.kind !== (faction ? "faction" : "myth")) return false;
        const theme = navigationTree.find(theme => theme.entries.some(entry => entry.id === item.id && !entry.disabled));
        if (!theme) return false;
        chooseAtlas({ themeId: theme.id, entryId: item.id, groupId: item.position?.groupId ?? null }, item.position?.personId ?? null);
        return true;
      }} />
      {/* 「선택」구획. 머리는 고른 신화·세력의 이름+한 줄 정의를 직접 쥔다 —
          「선택」이라는 역할 이름은 목차에만 두고 겹쳐 쓰지 않는다 */}
      <div className={layout.navigationOuter}>
        <HubSection id="atlas-selection" title={selectionTitle} titleAs={ownsTitle && activeMyth ? "h1" : "h2"}
          headerActions={activeMyth && completedEntryIds.has(activeMyth.id) ? <SceneCompletionBadge /> : undefined}
          subtitle={activeMyth?.headline ? <span className="text-accent">{activeMyth.headline}</span> : undefined}
          index={0} total={sectionTotal} hideDivider groupId={navGroupId}>
          <div className={layout.selectionPanel} data-faction-selection>
            {activeMyth ? (
              <MythOverview key={activeMyth.id} myth={activeMyth} memberCount={activePeople.length} workCount={activeWorks.length} overviewLabel={faction?.overviewLabel} fallback={faction?.overviewFallback}
                navigation={navigation} participation={faction?.participation} />
            ) : navigation()}
          </div>
        </HubSection>
      </div>

      {hasContent && activeMyth ? (
        <>
          <div className={layout.membersOuter}>
            <HubSection id="atlas-members" title={`${memberTitle} (${t("groupMemberCount", { count: railPeople.length })})`}
              headerActions={
                <div data-member-group-controls className="inline-flex overflow-hidden rounded-lg border border-white/20 bg-bg-main divide-x divide-white/15">
                  <button type="button" data-member-group-prev aria-label={`${tUi("prev")} ${tAtlas("group")}`}
                    disabled={groupChoices.length < 2} onClick={() => stepGroup(-1)} className={groupButtonStyle}>
                    <ChevronLeft size={18} aria-hidden />
                  </button>
                  <button type="button" data-member-group-overview aria-haspopup="dialog" aria-expanded={groupOverviewOpen}
                    onClick={() => setGroupOverviewOpen(true)} className={`${groupButtonStyle} px-5 text-sm font-semibold`}>
                    {t("groupOverview")}
                  </button>
                  <button type="button" data-member-group-next aria-label={`${tUi("next")} ${tAtlas("group")}`}
                    disabled={groupChoices.length < 2} onClick={() => stepGroup(1)} className={groupButtonStyle}>
                    <ChevronRight size={18} aria-hidden />
                  </button>
                </div>
              }
              index={1} total={sectionTotal} groupId={navGroupId}>
              <div className={layout.container}>
                <MythPersonPicker key={`${activeMyth.id}-${activeGroup?.id ?? "all"}`}
                  people={railPeople} selectedId={selectedPersonId} onSelect={setSelectedPersonId}
                  name={memberTitle} />
              </div>
            </HubSection>
          </div>
          {groupOverviewOpen && <ContentTextModal isOpen onClose={closeGroupOverview} title={memberTitle} text={groupOverviewText} />}
          {hydrated && selectedPerson && (faction
            ? <FactionPerson renderPerson={faction.renderPerson} person={selectedPerson} onClose={closePerson} />
            : <MythPersonDetail key={`${activeMyth.id}-${selectedPerson.id}`} person={selectedPerson} myth={activeMyth} onClose={closePerson} />
          )}
          <div className={faction ? layout.factionShelfOuter : layout.overviewOuter}>
            <HubSection id="atlas-shelf" title={shelfTitle} index={2} total={sectionTotal} groupId={navGroupId}>
              <div className={faction ? layout.factionShelfContainer : layout.container}>
                {/* 모달을 열어도 목록·책장의 높이와 스크롤 위치는 그대로 유지한다. */}
                {faction ? faction.renderWorks(railPeople.map((person) => person.id)) : shelfWorks.length > 0 && (
                  <MythWorkShelf key={`${activeMyth.id}-${activeGroup?.id ?? "all"}`} works={shelfWorks} memberIds={railPeople.map((person) => person.id)} mythName={activeMyth.name} mythSlug={activeMyth.slug} mythId={activeMyth.id} />
                )}
                {!faction && shelfWorks.every((work) => work.editionId === undefined && !work.coupangUrl) && (
                  <DeveloperCommerceFallback
                    target={{ title: [activeMyth.name, activeGroup ? mythGroupName(activeGroup, groupLabels) : null].filter(Boolean).join(" "), type: "TOPIC" }}
                    placement="myth-selection"
                  />
                )}
              </div>
            </HubSection>
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

      {/* 「전체」구획 — 모든 신화·세력으로 가는 링크 목록. 비어 있으면 구획·목차 모두 세우지 않는다 */}
      {hasIndex ? (
        <div className={layout.overviewOuter}>
          <HubSection id="atlas-index" title={indexHeading} index={sectionTotal - 1} total={sectionTotal} groupId={navGroupId}>
            <AtlasIndex heading={indexHeading} groups={completedIndexGroups} stacked={Boolean(faction)} />
          </HubSection>
        </div>
      ) : null}

      {pickerLevel !== null && (
        <AtlasPicker tree={navigationTree} selection={atlasSel} initialLevel={pickerLevel} myth={!faction}
          onClose={() => setPickerLevel(null)} onSelect={chooseAtlas} />
      )}
    </section>
  );
}
