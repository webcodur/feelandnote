import { ArrowDown, ArrowUp } from "lucide-react";
import { EXPLORE_QUICKNAV_HEADING_CLASS } from "./ExploreCard.styles";

/*
  탐색 두 모드의 위아래 이동. 위 목록(인물별 보기 | 기관별 보기)과 아래 안내 구획(관점별 보기)이 서로를 글자 링크 하나로 가리킨다.
  - 위: 모드 탭 아래 「관점별 보기 ↓」. 설명 문장은 두지 않는다 — 배너·모드 탭·검색창·결과 수가 이미 무엇을 하는 화면인지 말하고,
    「관심 있는 인물을 찾고 …」는 그 셋을 되풀이할 뿐이었다(26.09.28 철거). 제목은 문서 구조·스크린리더용으로만 남긴다.
  - 아래: 「관점별 보기」 제목 밑 「인물별 보기 ↑」(작품은 「기관별 보기 ↑」). 누르면 모드 탭 자리로 돌아간다.
  모드 탭과 목록 사이에 입구 줄을 따로 세우지 않는다 — "지금 보는 목록"과 "다른 화면"이 한 층에 섞인다
*/
export function ExploreJumpLink({ href, label, direction }: { href: string; label: string; direction: "up" | "down" }) {
  const Arrow = direction === "up" ? ArrowUp : ArrowDown;
  return (
    <a href={href}
      className="inline-flex min-h-10 items-center gap-1 rounded-control px-2 text-sm text-text-secondary underline decoration-text-tertiary underline-offset-4 hover:text-accent hover:decoration-accent outline-none focus-visible:ring-2 focus-visible:ring-accent">
      {label}<Arrow size={14} aria-hidden />
    </a>
  );
}

/** 모드 탭 아래 — 숨긴 제목 + 「관점별 보기 ↓」 */
export default function ExploreHubIntro({ id, title, jump }: {
  id: string;
  title: string;
  jump: { href: string; label: string };
}) {
  return (
    <header className="-mt-1 mb-3 flex justify-center md:mb-4">
      <h2 id={id} className="sr-only">{title}</h2>
      <ExploreJumpLink {...jump} direction="down" />
    </header>
  );
}

/** 아래 안내 구획 머리 — 「관점별 보기」 제목 + 위 목록으로 돌아가는 「인물별 보기 ↑」 */
export function ExploreLensHeading({ title, back }: { title: string; back: { href: string; label: string } }) {
  return (
    <header className="mb-5 flex flex-col items-center gap-1 md:mb-6">
      <h2 className={EXPLORE_QUICKNAV_HEADING_CLASS}>{title}</h2>
      <ExploreJumpLink {...back} direction="up" />
    </header>
  );
}
