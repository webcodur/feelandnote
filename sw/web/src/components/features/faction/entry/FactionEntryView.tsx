/*
  파일명: /components/features/faction/entry/FactionEntryView.tsx
  기능: 세력도감 테마 본문
  책임: 칩 상자에서 고른 진영(FactionGroupContext)의 인물을 정렬해 카드 격자로 보여 주고,
        카드를 누르면 세력도감 인물 소개 모달(FactionMemberModal)을 띄운다.
        격자 아래에는 테마 구성원이 나오는 인물 도서 선반(AffiliateBookList)을 띄우고,
        모달에서는 그 인물의 책만 보인다 — 신화 개요 아래 작품 선반과 같은 규칙이다.
        개발자 모드에서만 「서재」 탭을 세워 테마 인물들이 함께 본 작품(SharedLibraryShelf)을 시험으로 띄운다.
*/ // ------------------------------

"use client";

import { useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { getFactionSharedLibrary, type SharedContent } from "@/actions/home/getFactionSharedLibrary";
import type { FactionFigureBook } from "@/actions/home/getFactionFigureBooks";
import { CelebGrid } from "@/components/features/home/CelebCarousel";
import AffiliateBookList from "@/components/shared/AffiliateBookList";
import SharedLibraryShelf from "@/components/shared/SharedLibraryShelf";
import { getBookStorePlatform } from "@/constants/affiliatePlatforms";
import { isDeveloperMode } from "@/lib/developer-mode";
import { cn } from "@/lib/utils";
import type { CelebProfile } from "@/types/home";
import { useFactionGroup } from "./FactionGroupContext";
import FactionMemberModal, { type FactionMemberMeta } from "./FactionMemberModal";

export interface FactionEntryCluster {
  /** 칩 상자의 진영 key와 같다 */
  key: string;
  celebs: CelebProfile[];
}

interface FactionEntryViewProps {
  factionId: string;
  /** 화면 언어의 테마 이름 — 모달 머리에 쓴다 */
  factionName: string;
  /** 테마 전원 — 명단 차례대로 */
  celebs: CelebProfile[];
  /** 진영별 인물 */
  clusters: FactionEntryCluster[];
  /** 인물 id → 이 테마 안에서의 역할·진영·개인 화보 */
  members: Record<string, FactionMemberMeta>;
  /** 테마 구성원이 나오는 인물 도서 — 인물 격자 아래 선반에 띄운다. 진영 고름에 맞춰 걸러 쓴다 */
  factionBooks: FactionFigureBook[];
}

const SORTS = ["order", "influence", "name", "birth"] as const;
type SortKey = (typeof SORTS)[number];
type ViewKey = "people" | "library";

/** 개발자 모드 시험 탭 이름 — 채택하면 번역 문구로 옮긴다 */
const DEV_VIEW_LABELS: Record<ViewKey, string> = { people: "인물", library: "서재 (개발자 모드)" };

/** 출생 연도 — 기원전은 음수로 온다("-0551-09-28"). 모르면 맨 뒤 */
function birthYear(celeb: CelebProfile) {
  const year = parseInt(celeb.birth_date ?? "", 10);
  return Number.isNaN(year) ? Number.MAX_SAFE_INTEGER : year;
}

function sortCelebs(celebs: CelebProfile[], sort: SortKey, locale: string) {
  if (sort === "order") return celebs;
  const displayName = (celeb: CelebProfile) => (locale === "en" && celeb.nickname_en) || celeb.nickname;
  return [...celebs].sort((a, b) => {
    if (sort === "influence") return (b.influence?.total_score ?? -1) - (a.influence?.total_score ?? -1);
    if (sort === "name") return displayName(a).localeCompare(displayName(b), locale);
    return birthYear(a) - birthYear(b);
  });
}

const toggleClass = (active: boolean) =>
  cn(
    "inline-flex min-h-9 items-center gap-1.5 rounded px-3 py-1.5 text-xs outline-none focus-visible:ring-2 focus-visible:ring-accent",
    active ? "bg-accent/10 text-accent hover:bg-accent/20" : "text-text-secondary hover:bg-white/5 hover:text-text-primary",
  );

export default function FactionEntryView({ factionId, factionName, celebs, clusters, members, factionBooks }: FactionEntryViewProps) {
  const t = useTranslations("explore.faction");
  const tBooks = useTranslations("popularBooks");
  const tCeleb = useTranslations("celebPage");
  const tMore = useTranslations("shared.libraryShelf");
  const locale = useLocale();
  const isEn = locale === "en";
  const platform = getBookStorePlatform(locale);
  const { groupKey } = useFactionGroup();
  const [sort, setSort] = useState<SortKey>("order");
  const [openId, setOpenId] = useState<string | null>(null);
  const [view, setView] = useState<ViewKey>("people");
  const [library, setLibrary] = useState<SharedContent[] | null>(null);
  const libraryRequested = useRef(false);
  const showLibraryTab = isDeveloperMode();

  const selected = clusters.find((cluster) => cluster.key === groupKey) ?? null;
  const shown = useMemo(
    () => sortCelebs(selected ? selected.celebs : celebs, sort, locale),
    [selected, celebs, sort, locale],
  );
  const openCeleb = openId ? celebs.find((celeb) => celeb.id === openId) : undefined;

  /* 작품 선반 — 지금 보이는 인물(고른 진영 또는 테마 전원)이 나오는 책만 남긴다.
     인물 모달 「이 인물 관련 책」과 같은 자료·같은 카드다 */
  const shownIds = useMemo(() => new Set(shown.map((celeb) => celeb.id)), [shown]);
  const shelfBooks = useMemo(
    () => factionBooks.filter((book) => book.memberIds.some((id) => shownIds.has(id))),
    [factionBooks, shownIds],
  );
  /* 책이 많은 테마는 줄이 길어진다 — 앞의 12권만 세우고 나머지는 「더 보기」로 펼친다.
     펼침은 지금 범위(진영) 키에 묶어 두어 진영을 옮기면 저절로 다시 접힌다 */
  const scopeKey = groupKey ?? "all";
  const [expandedScope, setExpandedScope] = useState<string | null>(null);
  const booksExpanded = expandedScope === scopeKey;
  const visibleBooks = booksExpanded ? shelfBooks : shelfBooks.slice(0, 12);
  const hiddenBookCount = shelfBooks.length - visibleBooks.length;

  // 서재는 탭을 처음 열 때 한 번만 받는다. 조회에 실패하면 빈 목록이 온다
  const chooseView = (next: ViewKey) => {
    setView(next);
    if (next !== "library" || libraryRequested.current) return;
    libraryRequested.current = true;
    getFactionSharedLibrary(factionId).then(setLibrary);
  };

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
        {showLibraryTab ? (
          <div role="group" className="flex flex-wrap items-center gap-1">
            {(["people", "library"] as const).map((key) => (
              <button key={key} type="button" aria-pressed={view === key} onClick={() => chooseView(key)} className={toggleClass(view === key)}>
                {DEV_VIEW_LABELS[key]}
              </button>
            ))}
          </div>
        ) : <span />}
        {view === "people" && (
          <div role="group" aria-label={t("sortLabel")} className="flex flex-wrap items-center justify-end gap-1">
            {SORTS.map((key) => (
              <button key={key} type="button" aria-pressed={sort === key} onClick={() => setSort(key)} className={toggleClass(sort === key)}>
                {t(`sort.${key}`)}
              </button>
            ))}
          </div>
        )}
      </div>

      {view === "library" ? (
        <SharedLibraryShelf heading="함께 본 서재" items={library} memberCount={celebs.length} />
      ) : shown.length === 0 ? (
        <p className="py-12 text-center text-sm text-text-secondary">{t("empty")}</p>
      ) : (
        <CelebGrid celebs={shown} isLoading={false} quiet onSelect={setOpenId} />
      )}

      {/* 작품 선반 — 인물을 누르기 전에도 테마의 책이 미리 보인다. 모달을 열면 그 인물의 책만 남는다 */}
      {view === "people" && shelfBooks.length > 0 && (
        <div>
          <AffiliateBookList
            books={visibleBooks}
            heading={t("works")}
            buyLabel={isEn ? tCeleb("sourceWorkBuyAmazon") : tBooks("buy")}
            detailLabel={tBooks("viewBookDetails")}
            platform={platform}
          />
          {hiddenBookCount > 0 && (
            <div className="mt-5 flex justify-center">
              <button
                type="button"
                onClick={() => setExpandedScope(scopeKey)}
                className="flex min-h-10 items-center rounded-full border border-white/15 px-5 text-sm font-semibold text-text-secondary outline-none hover:border-accent/60 hover:text-accent focus-visible:ring-2 focus-visible:ring-accent"
              >
                {tMore("more", { count: hiddenBookCount })}
              </button>
            </div>
          )}
        </div>
      )}

      {openCeleb && (
        <FactionMemberModal
          key={openCeleb.id}
          factionId={factionId}
          factionName={factionName}
          celeb={openCeleb}
          meta={members[openCeleb.id]}
          onClose={() => setOpenId(null)}
        />
      )}
    </div>
  );
}
