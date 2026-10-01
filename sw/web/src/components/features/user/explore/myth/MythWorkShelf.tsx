"use client";

import { useEffect, useId, useState } from "react";
import { BookOpen } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { GRAVES_GREEK_MYTHS_ID, type MythWork } from "@/actions/home/mythTypes";
import type { AffiliateBook } from "@/actions/home/getAffiliateBooks";
import { getFactionMemberShelf } from "@/actions/home/getFactionMemberShelf";
import AffiliateBookList from "@/components/shared/AffiliateBookList";
import ShelfModeTabs from "@/components/shared/ShelfModeTabs";
import { RetryBlock } from "@/components/ui/pending";
import { getBookStorePlatform } from "@/constants/affiliatePlatforms";

interface Props { works: MythWork[]; memberIds: string[]; memberNames: Record<string, string>; mythName: string; mythSlug: string }

/* 「이 신화의 책」은 제목이 신화 이름으로 시작하는 작품에 신화별 대표 원전을 더한 것이다.
   신들의 계보·변신 이야기 같은 종합 신화서는 제목에 신화 이름이 없고, 인물 그래프만으로는
   일리아스처럼 인물이 겹치는 별개 서사시와 가를 수 없어 원전은 신화마다 명시한다 */
const MYTH_OWN_WORK_IDS: Record<string, string[]> = {
  "greek-roman-myth": [
    "5c38c188-32a1-4551-9ce7-97c025b2e364", // 신들의 계보
    "f584f015-601d-52ad-b76b-006b231eb54d", // 호메로스 찬가
    "13410b89-7c1f-4461-a1e2-b3f2975148e6", // 변신 이야기
    "24d56c9e-ad64-5c95-b1e3-4bd7f029f92c", // 해밀턴의 그리스로마신화
    "1d625a51-414b-40b3-a3b7-df43aa1e48b9", // 스티븐 프라이의 그리스 신화
    "905e4914-9aa2-59e3-94c6-1bf04e2fe97c", // 아폴로도로스의 도서관과 히기누스의 신화집
    "e4e3f23f-bc12-55a0-92d2-29f9a3188510", // 신화집(아폴로도로스)
  ],
};

const normalizeTitle = (value: string) => value.toLowerCase().replace(/[\s\-—–:：·,.'"《》「」『』()（）[\]]/g, "");

type WorkMode = "theme" | "appeared" | "read" | "authored" | "profession";

const toShelfBook = (work: MythWork): AffiliateBook => ({
  contentId: work.id, editionId: work.editionId, title: work.title,
  creator: work.creator ?? undefined, thumbnail: work.thumbnailUrl ?? undefined,
  url: work.coupangUrl ?? "", titleBadge: work.titleBadge,
});

/* 책장을 인물 페이지 「참고도서」의 모드 갈래로 나눈다 — 주제|등장|감상|집필|직군.
   신화 인물에도 실존 인물(복음서 기자 등)이 섞이므로 세력 선반과 같은 갈래가 전부 선다. */
export default function MythWorkShelf({ works, memberIds, memberNames, mythName, mythSlug }: Props) {
  const t = useTranslations("explore.hub.myth");
  const tCeleb = useTranslations("celebPage");
  const tBooks = useTranslations("popularBooks");
  const tMore = useTranslations("shared.libraryShelf");
  const locale = useLocale();
  const id = useId();
  const [mode, setMode] = useState<WorkMode>("theme");
  const [expanded, setExpanded] = useState(false);
  const [extras, setExtras] = useState<Awaited<ReturnType<typeof getFactionMemberShelf>> | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  /* 「감상」「직군」 탭 자료 — 탭이 실릴지는 자료가 와야 알 수 있어 화면이 뜨면 바로 한 번만 묻는다.
     진영 고름이 바뀌면 key 리마운트로 다시 묻는다(세력 선반과 같은 장치) */
  const memberKey = memberIds.join(",");
  const shownIdsKey = works.map((work) => work.id).join(",");
  useEffect(() => {
    const ids = memberKey ? memberKey.split(",") : [];
    if (!ids.length) return;
    let alive = true;
    getFactionMemberShelf(ids, shownIdsKey ? shownIdsKey.split(",") : [], locale)
      .then((result) => { if (alive) setExtras(result); })
      .catch((error) => {
        console.error("[MythWorkShelf] 인물 책장 조회 실패:", error);
        if (alive) setFailed(true);
      });
    return () => { alive = false; };
  }, [memberKey, shownIdsKey, locale, attempt]);

  // 오디세우스의 방랑·귀향은 그레이브스 2권에 있다. 작품은 공유하되 이 신화의 카드만 해당 권으로 보여 준다.
  const displayWorks = works.map((work) => {
    if (locale !== "ko" || mythSlug !== "homer-odyssey" || work.id !== GRAVES_GREEK_MYTHS_ID) return work;
    const volume = work.editions?.find((edition) => edition.textScope === "volume-2");
    return volume ? { ...work, editionId: volume.id, title: volume.title, creator: volume.creator,
      thumbnailUrl: volume.thumbnailUrl, coupangUrl: volume.coupangUrl } : work;
  });
  const mythKey = normalizeTitle(mythName);
  const memberSet = new Set(memberIds);
  // 선반 카드는 책만 — 판본·구매 단추가 책 전용 맞춤이다
  const bookWorks = displayWorks.filter((work) => work.category === "book");
  const ownWorkIds = new Set(MYTH_OWN_WORK_IDS[mythSlug] ?? []);
  const ownWorks = bookWorks.filter((work) => ownWorkIds.has(work.id) || (mythKey && normalizeTitle(work.title).startsWith(mythKey)));
  const ownIds = new Set(ownWorks.map((work) => work.id));
  const appearedWorks = bookWorks.filter((work) => !ownIds.has(work.id) && work.appearedIds.some((memberId) => memberSet.has(memberId)));
  const authoredWorks = bookWorks.filter((work) => work.authorIds.some((memberId) => memberSet.has(memberId)));
  /* 「집필」 카드는 지은이가 표지의 저자(평역·편역자)가 아니라 이 신화의 어느 인물인지 밝힌다 */
  const authorBadgeOf = (book: AffiliateBook) => {
    const work = authoredWorks.find((item) => item.id === book.contentId);
    const names = (work?.authorIds ?? []).filter((memberId) => memberSet.has(memberId)).map((memberId) => memberNames[memberId]).filter(Boolean);
    return names.length ? tCeleb("authoredByBadge", { name: names.join(", ") }) : null;
  };

  /* YES24로 이을 한국어 판본이 있는 책을 앞에 세운다. 연결 인물이 가장 많은 원전이 정작 판본이 없어
     선반 맨 앞을 차지하던 자리다(아폴로도로스 『그리스 신화』). 판본 없는 책도 뒤에 그대로
     남아 등장 작품 정보는 잃지 않는다. 판본을 받지 않는 영문 화면은 원래 순서를 지킨다. */
  const buyableFirst = (list: MythWork[]) =>
    locale === "ko" ? [...list.filter((work) => work.editionId !== undefined), ...list.filter((work) => work.editionId === undefined)] : list;

  const modes = ([
    ownWorks.length ? { key: "theme", label: mythName } : null,
    appearedWorks.length ? { key: "appeared", label: tCeleb("groupAppeared") } : null,
    extras?.read.length ? { key: "read", label: tCeleb("groupRead") } : null,
    authoredWorks.length ? { key: "authored", label: tCeleb("groupAuthored") } : null,
    extras?.professionBooks.length ? { key: "profession", label: tCeleb("groupProfession") } : null,
  ] as const).filter((modeItem): modeItem is { key: WorkMode; label: string } => modeItem !== null);
  const active = modes.some((modeItem) => modeItem.key === mode) ? mode : modes[0]?.key;
  /* 모드 안내문 — 개인 페이지 참고도서의 소개문 톤에 맞추고 고른 모드와 무관하게 항상 한 줄 선다 */
  const leadText =
    active === "theme" ? t("worksLeadOwn")
    : active === "appeared" ? t("worksLeadOthers")
    : active === "read" ? t("worksReadLead")
    : active === "authored" ? t("worksAuthoredLead")
    : active === "profession" && extras?.profession ? t("worksProfessionLead", { profession: extras.profession })
    : undefined;
  const shown: AffiliateBook[] =
    active === "theme" ? buyableFirst(ownWorks).map(toShelfBook)
    : active === "appeared" ? buyableFirst(appearedWorks).map(toShelfBook)
    : active === "read" ? (extras?.read ?? [])
    : active === "authored" ? buyableFirst(authoredWorks).map(toShelfBook)
    : active === "profession" ? (extras?.professionBooks ?? [])
    : [];

  if (!modes.length) return null;

  return (
    <>
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
    </>
  );
}
