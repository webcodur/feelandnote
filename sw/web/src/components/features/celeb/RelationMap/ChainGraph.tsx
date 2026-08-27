/*
  파일명: /components/features/celeb/RelationMap/ChainGraph.tsx
  기능: 사슬 — 사제·영향이 일자로 이어진 계보
  책임: 고리의 길이가 건너뛴 햇수를 말한다. 얼굴을 고른 간격으로 늘어놓으면
        2,197년과 16년이 같은 거리로 보여 사슬에서 가장 놀라운 대목이 사라진다.
        넓은 화면은 남는 폭을 햇수 비율로 나눠 갖고, 좁은 화면은 고리 폭을 그대로 쥔 채
        옆으로 밀어 본다 — 세로로 세우면 사슬 하나가 1,200px을 먹어 구획이 끝없이 길어졌고,
        무엇보다 일자로 이어졌다는 사슬의 성격이 사라졌다.

        고리를 누르면 그 사이의 사연이 아래에 열린다. 한 고리만 펼쳐 두면 나머지 여섯이
        어떤 영향이었는지 볼 길이 없고, 여섯을 다 적으면 문장이 사슬을 덮는다.
*/

"use client";

import { Fragment, useState } from "react";
import { useTranslations } from "next-intl";

import type { ChainNode, InfluenceChain } from "@/lib/celeb/influenceChains";
import CelebNode from "./CelebNode";

/** 고리의 밑길이(px). 햇수가 0이어도 고리는 보여야 한다 */
const LINK_BASE_PX = 20;

/** 햇수가 고리에 더할 수 있는 최대 길이(px) */
const LINK_MAX_ADD_PX = 84;

/** 로그를 한 번 더 눌러 편 값에 곱하는 길이(px).
 *  로그만 쓰면 2,197년이 16년의 두 배밖에 안 되어 낙차가 눈에 들어오지 않는다 */
const LINK_PX_PER_STEP = 1.5;

/** 햇수를 고리 길이로 바꾼다. 사슬은 백 배 천 배로 벌어지므로 눌러야 한 줄에 담긴다 */
function linkWeight(gap: number | null): number {
  return Math.log1p(Math.max(0, gap ?? 0)) ** 2;
}

function linkLengthPx(gap: number | null): number {
  return Math.round(LINK_BASE_PX + Math.min(LINK_MAX_ADD_PX, linkWeight(gap) * LINK_PX_PER_STEP));
}

interface ChainGraphProps {
  chain: InfluenceChain;
  isEn: boolean;
}

export default function ChainGraph({ chain, isEn }: ChainGraphProps) {
  const t = useTranslations("explore.hub.relationMap");
  /* 관계 유형 이름은 인물 상세와 한 곳을 쓴다 — 같은 관계가 화면마다 다른 말로 불리면 안 된다 */
  const tRel = useTranslations("celebPage");
  const nameOf = (node: ChainNode) => (isEn && node.celeb.nicknameEn) || node.celeb.nickname;

  /* 처음에는 가장 멀리 건넌 고리를 펼쳐 둔다. 사슬에서 놀라운 대목은 늘 그 자리다 */
  const [openIndex, setOpenIndex] = useState(chain.highlight?.index ?? 0);

  const first = chain.nodes[0];
  const last = chain.nodes[chain.nodes.length - 1];
  const opened = chain.nodes[openIndex];
  const openedNote = opened ? (isEn && opened.noteEn) || opened.note : null;

  return (
    <article className="rounded-2xl border border-white/5 bg-card p-5 md:p-7">
      <header className="mb-6 text-center">
        <h4 className="text-base font-semibold text-text-primary md:text-lg">
          {t("chainTitle", { from: nameOf(first), to: nameOf(last) })}
        </h4>
        <span className="mt-1 block text-xs font-medium tabular-nums text-accent/80">
          {t("chainSpan", { years: chain.toYear - chain.fromYear })}
        </span>
      </header>

      <div className="relative">
        {/* 오른쪽 끝을 흐려 사슬이 더 이어진다는 것을 알린다 —
            힌트가 없으면 좁은 화면에서 두 사람만 보고 사슬이 끝났다고 읽는다 */}
        <span
          aria-hidden
          className="pointer-events-none absolute right-0 top-0 z-10 h-full w-12 bg-gradient-to-l from-card to-transparent md:hidden"
        />
        {/* 좁은 화면에서 밀어 볼 수 있게 사슬만 따로 감싼다. 페이지 몸통은 가로로 밀리지 않는다 */}
        <div className="-mx-1 overflow-x-auto px-1 pb-2 md:mx-0 md:overflow-visible md:px-0 md:pb-0">
          {/* 순서가 뜻을 가지므로 ol로 둔다 — 읽어 주는 기기가 차례를 알린다 */}
          <ol className="flex w-max items-start md:w-full">
            {chain.nodes.map((node, index) => {
              const previous = index > 0 ? chain.nodes[index - 1] : null;
              const linkIndex = index - 1;
              const isOpen = previous !== null && linkIndex === openIndex;

              return (
                <Fragment key={node.celeb.id}>
                  {/* 앞 사람에게서 건너온 고리. 길이가 곧 건너뛴 햇수이고, 누르면 사연이 열린다 */}
                  {previous && (
                    <li
                      style={
                        {
                          "--link-grow": linkWeight(previous.gap).toFixed(2),
                          "--link-len": `${linkLengthPx(previous.gap)}px`,
                        } as React.CSSProperties
                      }
                      className="mt-8 flex w-[var(--link-len)] shrink-0 flex-col items-center md:w-auto md:shrink md:grow-[var(--link-grow)] md:basis-5"
                    >
                      <button
                        type="button"
                        onClick={() => setOpenIndex(linkIndex)}
                        aria-label={t("openLink", {
                          from: nameOf(previous),
                          to: nameOf(node),
                        })}
                        aria-pressed={isOpen}
                        /* 손가락으로 짚을 자리를 넉넉히 둔다 — 고리 자체는 20px까지 얇아진다 */
                        className="flex w-full flex-col items-center gap-1.5 rounded py-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                      >
                        <span
                          className={`w-full rounded-full ${
                            isOpen
                              ? "h-0.5 bg-accent"
                              : previous.kind === "mentor"
                                ? "h-0.5 bg-accent/50"
                                : "h-px bg-white/20"
                          }`}
                        />
                        {previous.gap !== null && (
                          <span
                            className={`whitespace-nowrap text-[11px] tabular-nums leading-none ${
                              isOpen ? "font-semibold text-accent" : "text-text-secondary"
                            }`}
                          >
                            {t("gapYears", { years: previous.gap })}
                          </span>
                        )}
                      </button>
                    </li>
                  )}

                  <li className="shrink-0">
                    <CelebNode
                      celeb={node.celeb}
                      isEn={isEn}
                      size="md"
                      emphasis={index === openIndex || index === openIndex + 1}
                    />
                  </li>
                </Fragment>
              );
            })}
          </ol>
        </div>
      </div>

      {/* 열어 둔 고리의 사연. 자리를 늘 잡아 두어 고리를 바꿔도 판이 흔들리지 않는다 */}
      {opened && (
        <p className="mt-6 min-h-[4.5rem] border-l-2 border-accent/40 pl-3 text-xs leading-relaxed text-text-secondary">
          <span className="mb-1 block text-[11px] font-medium text-text-primary/80">
            {t("highlightLead", {
              from: nameOf(opened),
              to: nameOf(chain.nodes[openIndex + 1]),
              years: opened.gap ?? 0,
            })}
          </span>
          {/* 사연이 없는 고리는 무엇으로 이어졌는지만 적는다 */}
          {openedNote ?? tRel(opened.kind === "mentor" ? "relType_teacher" : "relType_influence")}
        </p>
      )}
    </article>
  );
}
