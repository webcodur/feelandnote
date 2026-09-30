"use client";

import { useEffect, useId, useState } from "react";
import { BookOpen } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import type { MythData } from "@/actions/home/mythTypes";
import type { FactionFigureBook } from "@/actions/home/getFactionFigureBooks";
import type { AffiliateBook } from "@/actions/home/getAffiliateBooks";
import { getFactionMemberShelf } from "@/actions/home/getFactionMemberShelf";
import MythScreen from "@/components/features/user/explore/myth/MythScreen";
import { MYTH_LAYOUT } from "@/components/features/user/explore/myth/mythLayout";
import { mythLeadImage } from "@/components/features/user/explore/myth/mythLeadImage";
import AffiliateBookList from "@/components/shared/AffiliateBookList";
import ShelfModeTabs from "@/components/shared/ShelfModeTabs";
import { RetryBlock } from "@/components/ui/pending";
import type { AtlasTheme } from "@/components/features/user/explore/myth/atlasNavigationData";
import { getBookStorePlatform } from "@/constants/affiliatePlatforms";
import { FACTION_OWN_WORK_IDS } from "@/lib/faction-theme";
import type { CelebProfile } from "@/types/home";
import FactionMemberModal, { type FactionMemberMeta } from "./FactionMemberModal";

interface Props {
  data: MythData;
  navigationTree: AtlasTheme[];
  themeId: string;
  celebs: CelebProfile[];
  members: Record<string, FactionMemberMeta>;
  factionBooks: FactionFigureBook[];
}

type WorkMode = "theme" | "appeared" | "read" | "authored" | "profession";

function Works({ books, memberIds, memberNames, slug }: { books: FactionFigureBook[]; memberIds: string[]; memberNames: Record<string, string>; slug: string }) {
  const t = useTranslations("explore.faction");
  const tMore = useTranslations("shared.libraryShelf");
  const tBooks = useTranslations("popularBooks");
  const tCeleb = useTranslations("celebPage");
  const locale = useLocale();
  const [expanded, setExpanded] = useState(false);
  const [mode, setMode] = useState<WorkMode>("theme");
  const [extras, setExtras] = useState<Awaited<ReturnType<typeof getFactionMemberShelf>> | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const id = useId();

  /* 「감상」「직군」 탭 자료 — 탭이 실릴지는 자료가 와야 알 수 있어 화면이 뜨면 바로 한 번만 묻는다.
     진영 고름이 바뀌면 key 리마운트로 다시 묻는다 */
  const memberKey = memberIds.join(",");
  const shownIdsKey = books.map((book) => book.contentId).join(",");
  useEffect(() => {
    const ids = memberKey ? memberKey.split(",") : [];
    if (!ids.length) return;
    let alive = true;
    getFactionMemberShelf(ids, shownIdsKey ? shownIdsKey.split(",") : [], locale)
      .then((result) => { if (alive) setExtras(result); })
      .catch((error) => {
        console.error("[Works] 구성원 책장 조회 실패:", error);
        if (alive) setFailed(true);
      });
    return () => { alive = false; };
  }, [memberKey, shownIdsKey, locale, attempt]);

  /* 책장을 인물 페이지 「참고도서」의 모드 갈래로 나눈다 — 주제|등장|감상|집필|직군.
     자료가 찬 갈래만 탭에 선다(구분선 방식 폐기) */
  const memberSet = new Set(memberIds);
  const ownIds = new Set(FACTION_OWN_WORK_IDS[slug] ?? []);
  const own = books.filter((book) => ownIds.has(book.contentId));
  const appeared = books.filter((book) => !ownIds.has(book.contentId) && book.appearedIds.some((memberId) => memberSet.has(memberId)));
  const authored = books.filter((book) => book.authoredIds.some((memberId) => memberSet.has(memberId)));
  /* 「집필」 카드는 지은이가 표지의 저자(평역·편역자)가 아니라 이 세력의 어느 구성원인지 밝힌다 */
  const authorBadgeOf = (book: FactionFigureBook | AffiliateBook) => {
    const authoredBook = authored.find((item) => item.contentId === book.contentId);
    const names = (authoredBook?.authoredIds ?? []).filter((memberId) => memberSet.has(memberId)).map((memberId) => memberNames[memberId]).filter(Boolean);
    return names.length ? tCeleb("authoredByBadge", { name: names.join(", ") }) : null;
  };
  const modes = ([
    own.length ? { key: "theme", label: t("worksDividerLeft") } : null,
    appeared.length ? { key: "appeared", label: tCeleb("groupAppeared") } : null,
    extras?.read.length ? { key: "read", label: tCeleb("groupRead") } : null,
    authored.length ? { key: "authored", label: tCeleb("groupAuthored") } : null,
    extras?.professionBooks.length ? { key: "profession", label: tCeleb("groupProfession") } : null,
  ] as const).filter((modeItem): modeItem is { key: WorkMode; label: string } => modeItem !== null);
  const active = modes.some((modeItem) => modeItem.key === mode) ? mode : modes[0]?.key;
  /* 모드 안내문 — 개인 페이지 참고도서의 소개문 톤(「인물이 직간접적으로 등장하는 책」)에 맞추고
     고른 모드와 무관하게 항상 한 줄 선다(탭을 바꿀 때 문구가 나왔다 사라졌다 하지 않게) */
  const leadText =
    active === "theme" ? t("worksThemeLead")
    : active === "appeared" ? t("worksAppearedLead")
    : active === "read" ? t("worksReadLead")
    : active === "authored" ? t("worksAuthoredLead")
    : active === "profession" && extras?.profession ? t("worksProfessionLead", { profession: extras.profession })
    : undefined;
  const shown =
    active === "theme" ? own
    : active === "appeared" ? appeared
    : active === "read" ? (extras?.read ?? [])
    : active === "authored" ? authored
    : active === "profession" ? (extras?.professionBooks ?? [])
    : [...own, ...books.filter((book) => !ownIds.has(book.contentId))];

  if (!books.length) return null;
  /* 책장도 구성원·전체 목록과 같은 구획 구분선 리듬을 쓴다 */
  return (
    <div className={MYTH_LAYOUT.sectionDivider}>
      <AffiliateBookList books={expanded ? shown : shown.slice(0, 12)} heading={t("worksTitle")} icon={<BookOpen size={17} />} compact
        cardBadge={active === "authored" ? authorBadgeOf : undefined}
        buyLabel={locale === "en" ? tCeleb("sourceWorkBuyAmazon") : tBooks("buy")} platform={getBookStorePlatform(locale)}
        headerTabs={modes.length > 1 || failed || leadText ? (
          <div className="mb-4 flex flex-col items-center gap-2 md:-mt-2 md:mb-6">
            {modes.length > 1 && (
              <ShelfModeTabs id={id} ariaLabel={t("worksTitle")} active={active ?? "theme"}
                modes={[...modes]}
                onChange={(key) => { setMode(key as WorkMode); setExpanded(false); }} />
            )}
            {/* 안내문은 인물 페이지 선반 소개문과 같은 액센트 좌측 바 — 문구에 붙은 채 한 덩어리로 가운데 선다 */}
            {leadText && (
              <p className="relative ps-3.5 text-[15px] font-medium leading-6 text-text-primary before:absolute before:inset-y-1 before:start-0 before:w-0.5 before:rounded-full before:bg-accent/80 before:content-['']">
                {leadText}
              </p>
            )}
            {failed && <RetryBlock onRetry={() => { setFailed(false); setAttempt((value) => value + 1); }} />}
          </div>
        ) : undefined} />
      {!expanded && shown.length > 12 && (
        <div className="mt-5 flex justify-center">
          <button type="button" onClick={() => setExpanded(true)} className="min-h-10 rounded-full border border-white/15 px-5 text-sm font-semibold text-text-secondary outline-none hover:border-accent/60 hover:text-accent focus-visible:ring-2 focus-visible:ring-accent">
            {tMore("more", { count: shown.length - 12 })}
          </button>
        </div>
      )}
    </div>
  );
}

/** 선택 상태와 화면은 신화의 한 벌을 쓰고, 팩션의 책장과 소개 자료만 연결한다. */
export default function FactionEntryView({ data, navigationTree, themeId, celebs, members, factionBooks }: Props) {
  const t = useTranslations("explore.faction");
  const theme = data.myths[0];
  const byId = new Map(celebs.map((person) => [person.id, person]));
  return (
    <MythScreen data={data} faction={{
      navigationTree, themeId,
      title: t("title"), overviewLabel: t("overview"), overviewFallback: t("overviewFallback"),
      renderPerson: (person, onClose) => (
        <FactionMemberModal key={person.id} factionId={theme.id} factionName={theme.name}
          celeb={byId.get(person.id)!} meta={members[person.id]} portraitUrl={mythLeadImage(person, theme.id)} onClose={onClose} />
      ),
      renderWorks: (personIds) => {
        const ids = new Set(personIds);
        const books = factionBooks.filter((book) => book.memberIds.some((id) => ids.has(id)));
        return <Works key={personIds.join(",")} books={books} memberIds={personIds} memberNames={Object.fromEntries(data.people.map((person) => [person.id, person.name]))} slug={theme.slug} />;
      },
    }} />
  );
}
