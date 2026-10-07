import type { InfluenceRank } from "@feelandnote/influence-constants";

// 모서리 배지용 세리프 문자. 폰트 파일 없이 같은 윤곽을 유지한다.
const GLYPHS: Record<InfluenceRank, string> = {
  S: "M31 5V16H28C27 10 24 7 19 7C14 7 11 10 11 13C11 17 15 18 21 20C29 23 33 26 33 32C33 40 27 43 19 43C14 43 11 41 8 40L6 43H4V30H7C8 37 12 40 18 40C23 40 26 37 26 34C26 30 22 28 16 26C8 23 4 20 4 14C4 7 10 4 18 4C22 4 26 5 28 7L29 5Z",
  A: "M18 4H23L35 39L39 40V43H22V40L27 39L24 30H12L9 39L14 40V43H1V40L5 39ZM18 12L13 27H23Z",
  B: "M2 5H21C30 5 34 9 34 15C34 20 31 22 27 23C33 24 36 27 36 32C36 39 31 43 21 43H2V40L7 39V9L2 8ZM16 8V22H20C25 22 27 19 27 15C27 10 25 8 20 8ZM16 25V40H21C27 40 29 37 29 32C29 27 26 25 21 25Z",
  C: "M34 5V17H31C29 10 26 7 21 7C14 7 11 13 11 24C11 35 14 40 21 40C27 40 31 36 33 31L36 33C33 40 28 43 20 43C9 43 3 36 3 24C3 12 10 4 21 4C25 4 29 5 31 7L32 5Z",
  D: "M2 5H20C32 5 38 12 38 24C38 36 32 43 20 43H2V40L7 39V9L2 8ZM16 8V40H19C27 40 30 35 30 24C30 13 27 8 19 8Z",
};

export default function InfluenceRankGlyph({ rank, className }: { rank: InfluenceRank; className?: string }) {
  return (
    <svg viewBox="0 0 42 48" className={className} aria-hidden="true" focusable="false" data-influence-rank={rank}>
      <path d={GLYPHS[rank]} fill="black" fillOpacity="0.35" fillRule="evenodd" transform="translate(0 1.5)" />
      <path d={GLYPHS[rank]} fill="currentColor" fillRule="evenodd" />
      <path d={GLYPHS[rank]} fill="none" stroke="white" strokeOpacity="0.35" strokeWidth="0.6" />
    </svg>
  );
}
