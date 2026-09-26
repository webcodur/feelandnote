/*
  파일명: /components/features/user/explore/figureRankingBoard/RankingShelf.tsx
  기능: 인물 순위판의 서가 — 순위에 오른 인물들이 함께 감상한 작품
  책임: 무대 아래 별도 상자에 머리줄(제목·부제·구매 안내)과 작품 격자를 그린다.
        제목·부제는 여기서 정한다(explore.rankingBoard) — 화면은 매체 이름과 작품 묶음만 넘긴다.
        화면이 문구를 지어 넘기면 두 화면의 말투와 밀도가 다시 갈린다.
        묶음이 둘이면(성향 축의 양극) 묶음마다 소제목을 달고, 하나면 소제목 없이 격자만 둔다.
        낱장은 사이트 공통 ContentCard를 그대로 쓴다 — 감상 인원은 카드 기본 표시(표지 왼쪽 아래, 누르면 감상 인물 창)에 맡기고
        여기서는 늘어선 순서를 알리는 순번 칩만 얹는다. 비슷한 인원 칩을 따로 만들지 않는다.
        한국어 화면에서 도서는 값표가 붙은 구매 모듈, 그 밖의 매체는 판매처 단추를 표지 아래 붙인다.
*/ // ------------------------------

import { useLocale, useTranslations } from "next-intl";
import RankingStage from "@/components/shared/RankingStage";
import BookPurchaseSummary from "@/components/features/commerce/BookPurchaseSummary";
import WorkPurchaseAction from "@/components/features/commerce/WorkPurchaseAction";
import { ContentCard } from "@/components/ui/cards";
import type { ContentType } from "@/types/database";

export interface RankingShelfWork {
  contentId: string;
  type: string;
  title: string;
  creator?: string | null;
  thumbnail: string | null;
}

export interface RankingShelfGroup {
  id: string;
  /** 묶음 소제목 — 묶음이 둘 이상일 때만 보인다 */
  title: string;
  /** 소제목을 기준색으로 칠한다(상위 극단 묶음) */
  accented?: boolean;
  works: RankingShelfWork[];
}

export interface RankingShelfData {
  /** 한 매체만 담는 서가의 매체 이름(「도서」). 없으면 「감상 작품」으로 부른다 */
  media?: string;
  groups: RankingShelfGroup[];
}

function ShelfWork({ work, index, isKo }: { work: RankingShelfWork; index: number; isKo: boolean }) {
  return (
    <div className="min-w-0">
      <ContentCard
        contentId={work.contentId}
        contentType={work.type as ContentType}
        title={work.title}
        creator={work.creator}
        thumbnail={work.thumbnail}
        href={`/content/${work.contentId}`}
        showHeader={false}
        posterFooterNode={
          !isKo ? undefined
            : work.type === "BOOK" ? <BookPurchaseSummary contentId={work.contentId} title={work.title} creator={work.creator} thumbnail={work.thumbnail} full />
            : <WorkPurchaseAction target={{ title: work.title, creator: work.creator, contentId: work.contentId, type: work.type }} />
        }
        overlayTopLeft={
          <span className="rounded-md bg-black/75 px-1.5 py-1 font-mono text-[11px] font-bold tabular-nums text-white">
            {String(index + 1).padStart(2, "0")}
          </span>
        }
      />
    </div>
  );
}

export default function RankingShelf({ shelf, accent }: { shelf: RankingShelfData; accent: string }) {
  const isKo = useLocale() === "ko";
  const t = useTranslations("explore.rankingBoard");
  const groups = shelf.groups.filter((group) => group.works.length > 0);
  if (groups.length === 0) return null;

  return (
    <RankingStage>
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-white/[0.06] px-5 py-3.5 md:px-6">
        <h3 className="font-serif text-lg font-bold text-text-primary">
          {shelf.media ? t("shelfTitle", { media: shelf.media }) : t("shelfTitleAll")}
        </h3>
        <p className="break-keep text-xs text-text-secondary">{t("shelfDesc")}</p>
      </div>

      <div className="divide-y divide-white/[0.07]">
        {groups.map((group) => (
          <div key={group.id} className="px-5 py-5 md:px-6">
            {groups.length > 1 && (
              <p
                className="mb-3 border-s-2 ps-2 text-[13px] font-bold tracking-wide"
                style={group.accented ? { color: accent, borderColor: accent } : { borderColor: "rgba(255,255,255,0.2)" }}
              >
                {group.title}
              </p>
            )}
            <div className="grid grid-cols-2 gap-3 sm:[grid-template-columns:repeat(auto-fill,minmax(150px,1fr))]">
              {group.works.map((work, index) => (
                <ShelfWork key={work.contentId} work={work} index={index} isKo={isKo} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </RankingStage>
  );
}
