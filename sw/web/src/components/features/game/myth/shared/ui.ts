/*
  파일명: components/features/game/myth/shared/ui.ts
  기능: 신화 게임 공용 모양 상수
  책임: 버튼·선택 칩·이름표의 클래스를 한곳에 둔다. 누르는 요소는 모두 높이 44px 이상이고,
        hover는 색(배경·테두리·글자)만 즉시 바꾼다. 빛 쓸기 같은 연출은 자식(SHINE)에 따로 건다.
*/ // ------------------------------

// 주 버튼 — 즉각 축: 배경색. 자식 SHINE이 hover에 빛을 한 번 쓸고 지나간다
export const BTN_GOLD =
  "group/btn relative inline-flex min-h-12 items-center justify-center gap-2 overflow-hidden rounded-lg border border-accent-hover/40 bg-accent px-7 text-base font-bold text-bg-main shadow-[0_10px_32px_-10px_rgba(var(--color-accent-rgb),0.75)] hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50";

// 보조 버튼 — 즉각 축: 테두리·글자색
export const BTN_STONE =
  "inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border border-border bg-bg-card/90 px-6 text-base font-semibold text-text-primary hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-50";

// 그만두기처럼 조심스러운 버튼 — 즉각 축: 붉은 테두리·글자색
export const BTN_QUIET =
  "inline-flex min-h-11 items-center justify-center gap-1.5 rounded-lg border border-border bg-bg-main/70 px-4 text-sm font-semibold text-text-secondary hover:border-status-paused hover:text-status-paused";

export const SHINE =
  "pointer-events-none absolute inset-y-0 -start-1/3 w-1/4 -skew-x-12 bg-linear-to-r from-transparent via-text-primary/50 to-transparent transition-transform duration-700 ease-out group-hover/btn:translate-x-[520%]";

// 선택 칩(난이도·신화 고르기)
export const CHIP = "inline-flex min-h-11 items-center justify-center rounded-lg border px-4 text-sm font-semibold";
export const CHIP_ON = "border-accent bg-accent/15 text-accent shadow-[inset_0_0_0_1px_rgba(var(--color-accent-rgb),0.35)]";
export const CHIP_OFF = "border-border bg-bg-card/80 text-text-secondary hover:border-accent-dim hover:text-text-primary";

// 작은 금빛 이름표(단계·호칭)
export const EYEBROW = "text-sm font-semibold tracking-[0.2em] text-accent";

// 판 위의 누르는 카드 — 즉각 축: 테두리. 상태 색은 부르는 쪽이 덧붙인다
export const TILE = "relative overflow-hidden rounded-xl border-2 bg-bg-card/90 text-text-primary";

// 카드 모서리의 숫자 키 표시
export const KEY_BADGE =
  "pointer-events-none absolute start-2 top-2 z-[2] flex h-6 min-w-6 items-center justify-center rounded-md border border-border bg-bg-main/85 px-1 text-sm font-bold text-text-secondary";

// 주인공 얼굴 둘레 — 금테, 어두운 틈, 가는 바깥 금선을 겹친 메달
export const MEDALLION =
  "rounded-full border-2 border-accent shadow-[0_0_0_5px_var(--color-bg-main),0_0_0_6px_rgba(var(--color-accent-rgb),0.5),0_22px_48px_-14px_rgba(var(--color-accent-rgb),0.65)]";

// 판에서 빠진 인물의 얼굴 — 그림만 누르고 이름 글자는 그대로 둔다
export const FACE_MUTED = "grayscale brightness-50";

// 화면 아래에 붙는 막대. 틀의 스크롤 칸은 아래에 여백(MythGameFrame과 같은 값)을 두는데,
// 막대가 그 여백 위에 떠 있으면 밑으로 판 글자가 잘려 비친다. 여백까지 내려 덮고 안쪽에 같은 여백을 둔다
export const STICK_BOTTOM =
  "sticky bottom-[calc(-1*max(0.75rem,env(safe-area-inset-bottom)))] pb-[max(0.75rem,env(safe-area-inset-bottom))]";

// 떠 있는 판정·답하기 막대의 바탕 — 아래 여백은 어둡게 덮고 위로는 판이 비쳐 보이게 흐린다
export const STICK_FADE = "bg-linear-to-t from-bg-main via-bg-main/85 to-transparent";
