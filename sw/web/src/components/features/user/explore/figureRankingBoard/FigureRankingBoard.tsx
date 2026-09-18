/*
  파일명: /components/features/user/explore/figureRankingBoard/FigureRankingBoard.tsx
  기능: 인물 순위판(Figure Ranking Board) — 기준 하나(매체·스펙트럼 축)의 상위 인물과 그들이 함께 감상한 작품
  책임: 분야별 챔피언과 스펙트럼이 함께 쓰는 부모 화면이다. 선택기 → 무대(머리·시상대·순위) → 서가의
        배치와 대기 상태를 여기서 전부 쥔다. 각 화면은 자기 자료를 content로 바꿔 넘기기만 한다.
        갈리는 곳은 content의 조건 셋뿐이다 — 머리 앞 표식(글자 칩 | 아이콘), 순위 형식(시상대 | 양극 매치업),
        서가 묶음 수(하나 | 둘). 선택기의 칩 모양(네모)도 여기서 고정한다.
        훅을 쓰지 않아 서버(분야별 챔피언)·클라이언트(스펙트럼) 어디서나 그린다.
*/ // ------------------------------

import type { ReactNode } from "react";
import ExploreNav, { type ExploreNavRow } from "@/components/shared/ExploreNav";
import RankingStage from "@/components/shared/RankingStage";
import PodiumBoard, { type PodiumBoardItem } from "@/components/shared/PodiumBoard";
import RankCardList, { type RankCardItem } from "@/components/shared/RankCardList";
import VersusPanels, { type VersusSide } from "@/components/shared/VersusPanels";
import { PendingBlock } from "@/components/ui/pending";
import RankingShelf, { type RankingShelfData } from "./RankingShelf";

/** 선택기 줄 — 칩 모양은 순위판이 정한다. 화면이 고르면 두 화면이 다시 갈린다 */
export type RankingNavRow = Omit<ExploreNavRow, "shape">;

export interface RankingHead {
  /** 제목 앞 글자 칩(스펙트럼의 짧은 축 이름) */
  chip?: string;
  /** 제목 앞 그림(매체 아이콘) */
  icon?: ReactNode;
  title: string;
  /** 무엇의 순위인지 알리는 한 줄 — 두 화면 모두 넘긴다. 제목 뒤 「Top N」은 순위판이 인원 수로 만든다 */
  description: string;
}

/** 상위 3인은 시상대, 4위부터는 순위 카드 */
interface PodiumRanking {
  kind: "podium";
  items: PodiumBoardItem[];
  valuePrefix?: ReactNode;
}

/** 양극 최고점자 매치업 + 양극 차순위 카드 */
interface VersusRanking {
  kind: "versus";
  left: VersusSide;
  right: VersusSide;
  restLabel: string;
  rest: RankCardItem[];
}

export interface FigureRankingBoardContent {
  head: RankingHead;
  ranking: PodiumRanking | VersusRanking;
  shelf?: RankingShelfData;
  /** 서가에 올릴 작품이 없을 때 그 자리에 세울 것 */
  shelfFallback?: ReactNode;
}

interface FigureRankingBoardProps {
  navRows: RankingNavRow[];
  /** 고른 기준의 색(매체색·축색) — 무대 광원과 순위·서가의 강조색 */
  accent: string;
  /** 기준이 바뀌면 무대를 새로 그려 등장 연출을 다시 튼다 */
  stageKey?: string;
  content?: FigureRankingBoardContent;
  /** content 없이 무대 안에 세울 것(다시 시도 안내). 둘 다 없으면 대기 화면이다 */
  children?: ReactNode;
  pendingLabel?: string;
}

function Ranking({ ranking, accent }: { ranking: PodiumRanking | VersusRanking; accent: string }) {
  if (ranking.kind === "versus") {
    return (
      <div className="space-y-8">
        <VersusPanels accent={accent} left={ranking.left} right={ranking.right} />
        {ranking.rest.length > 0 && (
          <div>
            {/* 소제목은 아래 순위 카드(RankCardList)와 같은 폭·가운데 정렬로 세워 카드 줄 왼쪽 끝에 맞춘다 */}
            <p className="mx-auto max-w-3xl px-1 pb-2 text-xs font-bold uppercase tracking-[0.18em] text-text-secondary">
              {ranking.restLabel}
            </p>
            <RankCardList items={ranking.rest} accent={accent} startRank={2} />
          </div>
        )}
      </div>
    );
  }

  const rest = ranking.items.slice(3);
  return (
    <div className="space-y-8">
      <PodiumBoard items={ranking.items.slice(0, 3)} accent={accent} valuePrefix={ranking.valuePrefix} />
      {rest.length > 0 && <RankCardList items={rest} accent={accent} startRank={4} />}
    </div>
  );
}

/** 한 줄로 선 순위의 인원 — 시상대는 전원, 양극 매치업은 차순위가 이어지는 쪽(1위 + 차순위) */
function rankedCount(ranking: PodiumRanking | VersusRanking) {
  return ranking.kind === "versus" ? ranking.rest.length + 1 : ranking.items.length;
}

export default function FigureRankingBoard({
  navRows, accent, stageKey, content, children, pendingLabel,
}: FigureRankingBoardProps) {
  return (
    <div className="space-y-8">
      <ExploreNav rows={navRows.map((row) => ({ ...row, shape: "square" as const }))} />

      <RankingStage key={stageKey} accent={accent} className={content ? "animate-hero-fade-in" : undefined}>
        <div className="px-4 py-6 sm:px-6 md:px-10 md:py-10">
          {content ? (
            <>
              <header className="text-center">
                <div className="flex flex-wrap items-baseline justify-center gap-x-3 gap-y-1.5">
                  {content.head.chip && (
                    <span
                      className="self-center rounded border px-1.5 py-0.5 text-[11px] font-black uppercase tracking-widest"
                      style={{ borderColor: `${accent}55`, color: accent }}
                    >
                      {content.head.chip}
                    </span>
                  )}
                  {content.head.icon && (
                    <span className="self-center" style={{ color: accent }}>{content.head.icon}</span>
                  )}
                  <h2 className="font-serif text-2xl font-bold text-text-primary md:text-3xl">{content.head.title}</h2>
                  <span className="text-sm text-text-secondary">Top {rankedCount(content.ranking)}</span>
                </div>
                <p className="mt-2 break-keep text-xs text-text-secondary sm:text-sm">{content.head.description}</p>
              </header>
              <div className="mt-8 md:mt-10">
                <Ranking ranking={content.ranking} accent={accent} />
              </div>
            </>
          ) : children ?? (
            <PendingBlock
              variant="grid"
              cols="grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5"
              count={10}
              label={pendingLabel}
            />
          )}
        </div>
      </RankingStage>

      {content && (content.shelf ? <RankingShelf shelf={content.shelf} accent={accent} /> : content.shelfFallback)}
    </div>
  );
}
