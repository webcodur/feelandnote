"use client";

import { useCallback, useEffect, useMemo, useState, useSyncExternalStore, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowRight, Clock3 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import type { MythPerson, MythWork } from "@/actions/home/mythTypes";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import AtlasNavigation from "../myth/AtlasNavigation";
import AtlasMemberControls from "../myth/AtlasMemberControls";
import AtlasMemberFooter from "../myth/AtlasMemberFooter";
import AtlasPicker from "../myth/AtlasPicker";
import { buildMythNavigation } from "@/lib/atlas-navigation";
import { ATLAS_GROUP_PARAM, ATLAS_PERSON_PARAM, type AtlasSelection, type AtlasTheme } from "../myth/atlasNavigationData";
import { useRecentAtlas } from "@/hooks/useRecentAtlas";
import { recentAtlasHref } from "@/lib/recent-atlas";
import { mythGroupName } from "../myth/mythGroupName";
import AtlasMemberList from "../myth/members/AtlasMemberList";
import type { CelebCardImage } from "@/components/shared/CelebCard";
import AtlasMemberViewToggle from "../myth/members/AtlasMemberViewToggle";
import AtlasPersonDetail from "./AtlasPersonDetail";
import AtlasSelectionPanel from "./AtlasSelection";
import AtlasOverviewReading from "./AtlasOverviewReading";
import AtlasWorkShelf from "./AtlasWorkShelf";
import AtlasNavSections from "@/components/shared/atlasNav/AtlasNavSections";
import type { AtlasNavItem } from "@/components/shared/atlasNav/AtlasNav";
import HubSection from "@/components/shared/HubSection";
import SceneCompletionBadge from "../myth/SceneCompletionBadge";
import ContentTextModal from "@/components/ui/ContentTextModal";
import { useRegisterFactionMusic } from "@/contexts/FactionMusicContext";
import FactionParticipation from "@/components/features/engagement/FactionParticipation";

import { MYTH_LAYOUT as layout } from "../myth/mythLayout";
import { MYTH_LAST_COOKIE, MYTH_LAST_COOKIE_MAX_AGE, MYTH_OPENING_SLUG, MYTH_PARAM, atlasPageOwnsTitle, mythHref, mythSlugFromPath } from "../myth/mythHref";
import type { AtlasScreenProps } from "./atlasScreenTypes";

function saveLastMyth(slug: string) {
  const secure = window.location.protocol === "https:" ? "; secure" : "";
  document.cookie = `${MYTH_LAST_COOKIE}=${encodeURIComponent(slug)}; path=/; max-age=${MYTH_LAST_COOKIE_MAX_AGE}; samesite=lax${secure}`;
}

const subscribeHydration = () => () => {};
const browserHydrated = () => true;
const serverHydrated = () => false;

export default function AtlasScreen({ mode, data, navigationTree: suppliedNavigation, themeId, profiles = [], rememberedSlug = null }: AtlasScreenProps) {
  const isMyth = mode === "myth";
  // 공유·최근 주소의 인물 창은 Portal이므로 첫 서버 화면과 맞춘 뒤 연다.
  const hydrated = useSyncExternalStore(subscribeHydration, browserHydrated, serverHydrated);
  const locale = useLocale();
  const router = useRouter();
  const [navigating, startNavigation] = useTransition();
  const t = useTranslations("explore.hub.myth");
  const tCatalog = useTranslations("explore.atlasCatalog");
  const labels = useTranslations(isMyth ? "explore.hub.myth" : "explore.faction");
  const [loadedWorkCount, setLoadedWorkCount] = useState<number | null>(null);
  const groupLabels = { other: t("otherGroup"), unnamed: t("unnamedGroup") };
  /* 신화 주소(/explore/myth/<slug>)면 그 신화를 고른 채 연다. 옛 바로가기(?myth=)는 미들웨어가 옮기지만
     미들웨어를 거치지 않은 화면 안 이동에 대비해 함께 읽는다 */
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const requestedSlug = isMyth ? mythSlugFromPath(pathname) ?? searchParams.get(MYTH_PARAM) : null;
  const published = data.myths.filter((myth) => myth.isPublished);
  const publishedBySlug = (slug: string | null) => (slug ? published.find((myth) => myth.slug === slug) : undefined);
  const requestedMyth = publishedBySlug(requestedSlug);
  // 차례는 mythHref.ts의 MYTH_OPENING_SLUG 주석이 쥔다. 세력도감은 첫 항목으로 연다
  const openingMyth = requestedMyth
    ?? (isMyth ? publishedBySlug(rememberedSlug) ?? publishedBySlug(MYTH_OPENING_SLUG) : undefined)
    ?? published[0];
  const [regionId, setRegionId] = useState<string | null>(openingMyth?.regionId ?? data.regions[0]?.id ?? null);
  const [mythId, setMythId] = useState<string | null>(openingMyth?.id ?? null);
  const requestedPerson = searchParams.get(ATLAS_PERSON_PARAM);
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(requestedPerson);
  const [appliedPerson, setAppliedPerson] = useState(requestedPerson);
  const [groupOverviewOpen, setGroupOverviewOpen] = useState(false);
  // 도감에서는 해당 세력·신화에서의 설명을 기본으로 읽는다. 보기만 바뀌므로 주소에 싣지 않는다.
  const [showMemberDescription, setShowMemberDescription] = useState(true);
  const [memberImage, setMemberImage] = useState<CelebCardImage>("portrait");
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
  const linkedSlug = requestedMyth?.slug ?? (isMyth ? openingMyth?.slug : undefined);
  useEffect(() => {
    if (linkedSlug) saveLastMyth(linkedSlug);
  }, [linkedSlug]);

  /* 같은 신화의 진영 선택은 주소만 바꾼다. 다른 신화는 해당 주소에서 필요한 자료를 받아 연다. */
  const rememberMyth = (slug: string | undefined, group: string | null, person: string | null) => {
    if (!isMyth) return;
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
    ? { id: activeMyth.id, title: activeMyth.name, url: activeMyth.music.url, kind: mode }
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
  const navigationTree: AtlasTheme[] = suppliedNavigation ?? buildMythNavigation(data, groupLabels);
  const completedEntryIds = new Set(navigationTree.flatMap(theme => theme.entries.filter(entry => entry.scenesComplete).map(entry => entry.id)));
  useRecentAtlas(mode, activeMyth?.id ?? null, activeGroup?.id ?? null, selectedPerson?.id ?? null, navigationTree);

  // 목차와 공용 구획 머리는 같은 고정 이름·순서를 사용한다. 선택된 작품·그룹 이름은 선택기만 표시한다.
  const selectionTitle = t("tocSelection");
  const overviewTitle = labels(isMyth ? "mythOverview" : "overview");
  const memberTitle = activeGroup ? mythGroupName(activeGroup, groupLabels) : t("memberList");
  const shelfTitle = labels("worksTitle");
  const tocItems: AtlasNavItem[] = [
      { key: "selection", label: selectionTitle, sectionId: "atlas-selection" },
      ...(activeMyth ? [{ key: "overview", label: overviewTitle, sectionId: "atlas-overview" }] : []),
      ...(hasContent ? [
        { key: "members", label: t("memberList"), sectionId: "atlas-members" },
        { key: "shelf", label: shelfTitle, sectionId: "atlas-shelf" },
      ] : []),
    ].map((item, index) => ({ ...item, chapter: String(index + 1).padStart(2, "0") }));
  /* 한 편의 주소에서는 고른 이름이 페이지의 큰 제목(h1) — 첫 화면은 배너의 「신화의 세계」「세력도감」이 h1이다 */
  const ownsTitle = atlasPageOwnsTitle(pathname);
  const sectionTotal = tocItems.length;
  const sectionIndex = (key: string) => tocItems.findIndex(item => item.key === key);
  const navGroupId = mode;


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
    if (isMyth && selection.entryId !== activeMyth?.id) {
      const entry = data.myths.find(myth => myth.id === selection.entryId && myth.isPublished);
      if (entry) {
        saveLastMyth(entry.slug);
        startNavigation(() => router.push(recentAtlasHref(mythHref(entry.slug), selection.groupId, personId), { scroll: false }));
      }
      return;
    }
    if (!isMyth && selection.entryId !== activeMyth?.id) {
      const entry = navigationTree.find((item) => item.id === selection.themeId)?.entries.find((item) => item.id === selection.entryId);
      const href = entry?.href;
      if (href) {
        startNavigation(() => router.push(recentAtlasHref(href, selection.groupId, personId), { scroll: false }));
      }
      return;
    }
    if (isMyth) {
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
  const atlasSel: AtlasSelection = { themeId: themeId ?? activeRegion.id, entryId: activeMyth?.id ?? null, groupId: activeGroup?.id ?? null };
  const groupOverviewText = activeGroup?.description || t("groupDescriptionFallback");
  const memberControls = (
    <div className={layout.memberControls}>
      <AtlasMemberControls disabled={!activeGroup} open={groupOverviewOpen} hideSteppers
        onOpen={activeGroup ? () => setGroupOverviewOpen(true) : undefined} />
      <AtlasMemberViewToggle showDescription={showMemberDescription} imageMode={memberImage}
        onDescriptionChange={setShowMemberDescription} onImageModeChange={setMemberImage} />
    </div>
  );
  const memberList = activeMyth ? (
    <div className={layout.container}>
      <AtlasMemberList key={activeMyth.id} listKey={`${activeMyth.id}-${activeGroup?.id ?? "all"}`}
        people={railPeople} selectedId={selectedPersonId} onSelect={setSelectedPersonId}
        name={memberTitle} showDescription={showMemberDescription} imageMode={memberImage} mythId={activeMyth.id} />
    </div>
  ) : null;

  return (
    <section id={mode} data-atlas-mode={mode} aria-label={labels("title")} className={`${layout.shell} ${locale === "ko" ? "break-all" : ""}`}>
      <AtlasNavSections items={tocItems} />
      <AtlasSelectionPanel mode={mode} tree={navigationTree} selection={atlasSel} onSelect={chooseAtlas} onOpenPicker={setPickerLevel}
        pending={navigating} myth={activeMyth} ownsTitle={ownsTitle}
        sectionTitle={selectionTitle} sectionIndex={sectionIndex("selection")} sectionTotal={sectionTotal}
        participation={activeMyth ? <FactionParticipation key={activeMyth.id} factionId={activeMyth.id} slug={activeMyth.slug} name={activeMyth.name} kind={mode} /> : undefined}
        badge={activeMyth && completedEntryIds.has(activeMyth.id) ? <SceneCompletionBadge /> : undefined} />
      {activeMyth && <AtlasOverviewReading key={activeMyth.id} factionId={activeMyth.id} title={activeMyth.name}
        label={overviewTitle} text={activeMyth.description ?? labels(isMyth ? "mythOverviewFallback" : "overviewFallback")}
        sectionIndex={sectionIndex("overview")} sectionTotal={sectionTotal}
        notice={<p className="mb-5 text-center text-sm text-text-secondary">{!isMyth && loadedWorkCount === null
          ? t("groupMemberCount", { count: activePeople.length })
          : t("mythOverviewStats", { people: activePeople.length, works: isMyth ? activeWorks.length : loadedWorkCount ?? 0 })}</p>} />}

      {hasContent && activeMyth ? <>
        <HubSection id="atlas-members" title={t("memberList")} index={sectionIndex("members")} total={sectionTotal}
          tabIndex={-1} className={layout.members} headerFooter={<div className={layout.memberHeader}>
            <AtlasNavigation tree={navigationTree} selection={atlasSel} onSelect={chooseAtlas} onOpenPicker={setPickerLevel}
              myth={isMyth} pending={navigating} levels={[2]} />
            {memberControls}
          </div>}>
          {memberList}
          {activeMyth.groups.length > 0 && <AtlasMemberFooter tree={navigationTree} selection={atlasSel}
            onSelect={chooseAtlas} onOpenPicker={setPickerLevel} myth={isMyth} pending={navigating}
            pickerOpen={pickerLevel !== null} />}
        </HubSection>
        {activeGroup && groupOverviewOpen && <ContentTextModal isOpen onClose={closeGroupOverview} title={memberTitle} text={groupOverviewText} />}
        {hydrated && selectedPerson && <AtlasPersonDetail key={`${activeMyth.id}-${selectedPerson.id}`} mode={mode}
          person={selectedPerson} theme={activeMyth} profile={profiles.find(profile => profile.id === selectedPerson.id)}
          group={activeMyth.groups.find(group => group.personIds.includes(selectedPerson.id))?.name} onClose={closePerson} />}
        <div className={layout.overviewOuter}>
          <HubSection id="atlas-shelf" title={shelfTitle} index={sectionIndex("shelf")} total={sectionTotal} groupId={navGroupId}>
            <div className={layout.container}>
              <AtlasWorkShelf key={activeMyth.id} mode={mode} theme={activeMyth} works={shelfWorks}
                memberIds={railPeople.map(person => person.id)} onCount={setLoadedWorkCount} />
            </div>
          </HubSection>
        </div>
      </> : <div className={layout.overviewOuter}>
        <div className={layout.container}>
          <div role="status" className={layout.notice}>
            <Clock3 size={14} className="mt-0.5 shrink-0 text-accent/70" aria-hidden /><p>{t("comingSoon")}</p>
          </div>
        </div>
      </div>}

      <div className="mt-8 flex justify-center border-t border-line pt-8 md:mt-10 md:pt-10">
        <Link href={`/explore/${mode}`} prefetch={false} data-atlas-catalog-link
          className="inline-flex min-h-12 items-center justify-center gap-3 rounded-control border border-line-strong px-5 text-sm font-medium text-text-primary outline-none hover:border-accent hover:bg-accent/10 hover:text-accent focus-visible:ring-2 focus-visible:ring-accent">
          {tCatalog(isMyth ? "browseMyths" : "browseFactions")}<ArrowRight size={16} aria-hidden />
        </Link>
      </div>
      {pickerLevel !== null && <AtlasPicker tree={navigationTree} selection={atlasSel} initialLevel={pickerLevel} myth={isMyth}
        onClose={() => setPickerLevel(null)} onSelect={chooseAtlas} />}
    </section>
  );
}
