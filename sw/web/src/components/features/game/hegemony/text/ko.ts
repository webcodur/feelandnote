/*
  파일명: components/features/game/hegemony/text/ko.ts
  기능: 패권 한국어 문구
  책임: 패권 화면 문구의 한국어 원본. 규칙 수치는 RULES에서 받아 문장에 넣는다(여기서 값을 복제하지 않는다).
*/

import type { Command } from "@/lib/game/types";
import { RULES } from "@/lib/game/hegemony/constants";
import { eulReul, iGa } from "./josa";
import { koPlay } from "./koPlay";

const CMD: Record<Command, string> = { assault: "전투", stratagem: "책략", govern: "내정" };
const pct = (x: number) => `${Math.round(x * 100)}%`;

export const ko = {
  game: { title: "패권", english: "HEGEMONY", tagline: "강한 자가 지배한다" },
  command: {
    name: CMD,
    effect: {
      assault: "상대 국력을 친다",
      stratagem: "상대 민심을 흔든다",
      govern: "국력과 민심을 되찾는다",
    } as Record<Command, string>,
    beats: (winner: Command, loser: Command) => `${iGa(CMD[winner])} ${eulReul(CMD[loser])} 누른다`,
  },
  stat: { power: "국력", morale: "민심", aptitude: "적성", hand: "손패", used: "쉬는 인물", captain: "주장" },
  difficulty: {
    name: { easy: "쉬움", normal: "보통", hard: "어려움" },
    desc: {
      easy: "AI가 자주 실수합니다. 처음이라면 여기서 시작하세요.",
      normal: "상대 인물의 적성이 모두 보이고, 선발은 내가 먼저 합니다.",
      hard: "상대 적성을 가리고, 선발도 AI가 먼저 합니다.",
    },
  },
  title: {
    start: "대전 시작",
    startSub: (difficulty: string) => `${difficulty} · AI와 한 판`,
    rules: "규칙 안내",
    records: "전적",
    settings: "설정",
    exit: "나가기",
    loading: "인물들을 불러오는 중",
    errorLoad: "인물 정보를 불러오지 못했습니다. 잠시 뒤 다시 시도해 주세요.",
    errorNotEnough: "대전에 필요한 인물이 모자랍니다.",
    recordLine: (w: number, l: number, d: number) => `${w}승 ${l}패${d > 0 ? ` ${d}무` : ""}`,
    streak: (n: number) => `${n}연승 중`,
    noRecord: "아직 치른 대전이 없습니다",
    shortcuts: "단축키 1–5 인물 · Q W E 명령 · Enter 출전",
  },
  records: {
    title: "전적",
    total: "전체",
    best: (n: number) => `최고 ${n}연승`,
    recent: "최근 대전",
    rounds: (n: number) => `${n}라운드`,
    result: { player: "승리", ai: "패배", draw: "무승부" },
    /** 전적 칸의 숫자 뒤에 작게 붙이는 단위 */
    unit: { win: "승", loss: "패", draw: "무" },
    empty: "대전을 마치면 여기에 기록됩니다.",
    back: "돌아가기",
  },
  settings: {
    title: "설정",
    bgm: "배경음악",
    sfx: "효과음과 대사",
    speed: "연출 속도",
    speedNormal: "보통",
    speedFast: "빠르게",
    on: "켜짐",
    off: "꺼짐",
    back: "돌아가기",
  },
  draft: {
    title: "인재 선발",
    batch: (n: number, total: number) => `${n} / ${total}묶음`,
    guide: "세 명 가운데 한 명을 고르면 상대도 한 명을 고르고, 남은 한 명은 제외됩니다.",
    myTurn: "내 차례입니다",
    aiTurn: "상대가 고르는 중",
    done: "선발 완료",
    first: (mine: boolean): string => (mine ? "이번 묶음은 내가 먼저" : "이번 묶음은 상대가 먼저"),
    excluded: "제외",
    reshuffle: "후보 다시 뽑기",
    auto: "자동 선발",
    mine: "내 명단",
    theirs: "상대 명단",
    empty: "빈 자리",
    next: "주장 임명으로",
    best: "주특기",
    teamBest: "명령별 최고 적성",
    detail: "자세히",
  },
  captain: {
    title: "주장 임명",
    guide: `주장이 손패에 있으면 다른 인물의 적성이 ${pct(RULES.captainAura)} 오르고, 주장이 직접 나서면 적성이 ${RULES.captainSelf}배가 됩니다.`,
    tip: "전투·책략에 쓰면 주장도 쉬러 가서 효과가 끊깁니다. 내정은 손패에 남습니다.",
    auraTitle: `손패에 두면 동료 적성 +${pct(RULES.captainAura)}`,
    selfTitle: (name: string) => `${iGa(name)} 직접 나서면 ×${RULES.captainSelf}`,
    recommend: "추천",
    confirm: (name: string) => `${eulReul(name)} 주장으로`,
    pick: "주장으로 세울 인물을 고르세요",
    enemy: "상대 명단",
  },
  battle: {
    round: (n: number) => `${n}라운드`,
    roundLabel: "라운드",
    of: (n: number, max: number) => `${n} / ${max}`,
    mandate: "천명",
    mandateNow: (cmd: Command) => `${CMD[cmd]} ×${RULES.mandateBonus}`,
    mandateNext: "다음",
    escalation: "격화",
    escalationValue: (x: number) => `공격 ×${x.toFixed(2)}`,
    danger: "반란 위기",
    you: "아군",
    enemy: "적군",
    powerOf: { player: "아군 국력", ai: "적군 국력" },
    hidden: "적성 비공개",
    chooseCard: "출전할 인물을 고르세요",
    chooseCommand: "명령을 고르세요",
    ready: "출전 준비 완료",
    deploy: "출전",
    recover: "불러올 인물",
    recoverAuto: "가장 강한 인물",
    recallTitle: "손패가 비었습니다",
    recallGuide: "쉬던 인물 가운데 한 명을 불러와 이번 라운드에 내보냅니다.",
    recallPick: "불러오기",
    log: "전황 기록",
    logEmpty: "아직 기록이 없습니다",
    forfeit: "기권",
    forfeitConfirm: "기권하면 이 판은 패배로 기록됩니다.",
    forfeitYes: "기권하기",
    cancel: "계속 싸우기",
    help: "규칙",
    enemyWaiting: "상대가 출전을 고르는 중",
    enemyHand: "상대 손패",
    cost: (n: number) => `민심\u00a0−${n} 소모`,
    duelsLeft: (n: number) => `일기토 ${n}회`,
    duelsLeftLong: (n: number): string => (n > 0 ? `이번 판에 일기토를 ${n}번 더 청할 수 있습니다` : "이번 판의 일기토는 이미 썼습니다"),
    menu: "메뉴",
    resting: "휴식",
  },
  ...koPlay,
};

export type HegemonyText = typeof ko;
