/*
  파일명: components/features/game/hegemony/text/koPlay.ts
  기능: 패권 한국어 문구 — 대전 결과·예상 전과·일기토·결과 화면·규칙 안내
  책임: ko.ts가 합쳐 쓰는 두 번째 묶음. 규칙 수치는 RULES에서 받는다.
*/

import type { Command } from "@/lib/game/types";
import { RULES } from "@/lib/game/hegemony/constants";
import { eulReul, iGa } from "./josa";

const CMD: Record<Command, string> = { assault: "전투", stratagem: "책략", govern: "내정" };
const pct = (x: number) => `${Math.round(x * 100)}%`;

export const koPlay = {
  verdict: {
    name: { win: "상성 우위", lose: "상성 열세", draw: "맞대결" },
    short: { win: "우세", lose: "열세", draw: "맞대결" },
    /** 같은 명령끼리 붙은 라운드를 누가 가져갔는가 (적성 판정·일기토) */
    taken: {
      mirror: { win: "판정승", lose: "판정패", draw: "비김" },
      duel: { win: "일기토 승", lose: "일기토 패", draw: "일기토 비김" },
    },
    mirrorAptitude: (mine: number, theirs: number) => `같은 명령, 적성 ${mine} 대 ${theirs}`,
    mirrorTie: "적성이 같아 양쪽 모두 절반만 통했습니다",
    duelNote: (mine: number, theirs: number) => `적성 ${mine} 대 ${theirs}에서 일기토로 승부를 갈랐습니다`,
  },
  outcome: {
    title: (n: number) => `${n}라운드 결과`,
    // \u00a0: 좁은 칸에서 이름과 숫자가 다른 줄로 갈리지 않게 붙인다
    dealtPower: (n: number) => `상대 국력\u00a0−${n}`,
    dealtMorale: (n: number) => `상대 민심\u00a0−${n}`,
    healedPower: (n: number) => `국력\u00a0+${n}`,
    healedMorale: (n: number) => `민심\u00a0+${n}`,
    cost: (n: number) => `전투 비용 민심\u00a0−${n}`,
    nothing: "효과 없음",
    recovered: (name: string) => `${name} 복귀`,
    resting: (name: string) => `${name} 휴식`,
    overflow: (n: number) => `민심이 바닥나 국력\u00a0−${n}`,
    rebellion: (n: number) => `반란! 국력\u00a0−${n}`,
    mandate: "천명",
    next: "다음 라운드",
    toResult: "결과 보기",
    skip: "눌러서 넘기기",
    finalRound: "마지막 라운드",
  },
  forecast: {
    title: "예상 전과",
    ifEnemy: (cmd: Command) => `상대가 ${eulReul(CMD[cmd])} 내면`,
    enemyPower: (min: number, max: number) => (min === max ? `상대 국력 ${min}` : `상대 국력 ${min}~${max}`),
    /** 상대 인물에 따라 달라지는 값의 범위 */
    range: (from: string, to: string) => `${from}~${to}`,
    you: "아군",
    them: "상대",
    lethal: "이기면 끝",
    fatal: "패배 위험",
    mirror: (stronger: number, total: number) => (stronger === 0 ? "상대 누구보다 적성이 높습니다" : `상대 ${total}명 중 ${stronger}명이 더 강합니다`),
    hidden: "상대 적성에 달린 값은 ?로 가립니다",
    noPlay: "인물과 명령을 고르면 상대의 명령별 결과를 미리 보여 줍니다",
    loseHidden: `상대 효과가 ${RULES.counterWin}배로 들어옵니다`,
    drawHidden: "같은 명령이면 적성이 높은 쪽만 통합니다",
    none: "변화 없음",
  },
  duel: {
    title: "일기토를 청하시겠습니까?",
    body: (mine: number, theirs: number) => `같은 명령끼리 맞붙었습니다. 적성이 ${mine} 대 ${theirs}로 밀립니다.`,
    tie: (value: number) => `같은 명령끼리 맞붙었습니다. 적성이 ${value}로 같아 이대로면 양쪽 모두 절반만 통합니다.`,
    stake: `일기토에서 이기면 이 라운드를 가져옵니다. 한 판에 ${RULES.duelsPerGame}번만 쓸 수 있습니다.`,
    accept: "일기토 신청",
    decline: "그대로 판정",
  },
  result: {
    title: { player: "승리", ai: "패배", draw: "무승부" },
    koWin: (n: number) => `${n}라운드 만에 상대 국력을 무너뜨렸습니다`,
    koLose: (n: number) => `${n}라운드에 국력이 무너졌습니다`,
    timeWin: (a: number, b: number) => `${RULES.maxRounds}라운드 끝에 국력 ${a} 대 ${b}로 앞섰습니다`,
    timeLose: (a: number, b: number) => `${RULES.maxRounds}라운드 끝에 국력 ${a} 대 ${b}로 밀렸습니다`,
    draw: "끝까지 우열을 가리지 못했습니다",
    forfeit: "기권했습니다",
    dealt: "준 피해",
    taken: "받은 피해",
    counters: "상성 우위",
    // 좁은 칸에서 접힐 때 괄호 안이 끊기지 않게 괄호 안 공백은 줄바꿈 없는 공백으로 둔다
    rebellions: "반란 (아군\u00a0/\u00a0적군)",
    mvp: "가장 활약한 인물",
    mvpLine: (dealt: number, healed: number) => `피해 ${dealt} · 회복 ${healed}`,
    chart: "국력 흐름",
    rounds: "라운드 기록",
    rematch: "다시 대전",
    home: "처음으로",
    record: (w: number, l: number) => `통산 ${w}승 ${l}패`,
  },
  card: {
    aptitude: "명령 적성",
    best: "주특기",
    basis: "적성의 바탕",
    influence: "영향력",
    ability: "능력치",
    quote: "남긴 말",
    formula: {
      assault: "전략·사회 영향력 평균 × 무력",
      stratagem: "정치·기술 영향력 평균 × 지력",
      govern: "경제·문화 영향력 평균 × 통솔",
    } as Record<Command, string>,
    close: "닫기",
  },
  rules: {
    title: "규칙 안내",
    back: "돌아가기",
    sections: [
      {
        title: "한 판의 흐름",
        body: [
          "인재 선발: 세 명씩 다섯 묶음이 열립니다. 묶음마다 나와 상대가 한 명씩 고르고 남은 한 명은 빠집니다.",
          "주장 임명: 고른 다섯 명 가운데 주장 한 명을 세웁니다.",
          `대전: 최대 ${RULES.maxRounds}라운드. 매 라운드 인물 한 명과 명령 하나를 동시에 내고 한꺼번에 공개합니다.`,
        ],
      },
      {
        title: "세 가지 명령",
        body: [
          `${iGa("전투")} ${eulReul("내정")}, ${iGa("내정")} ${eulReul("책략")}, ${iGa("책략")} ${eulReul("전투")} 누릅니다.`,
          `상성에서 이기면 내 효과가 ${RULES.counterWin}배가 되고 상대 효과는 사라집니다.`,
          "같은 명령끼리 붙으면 적성이 높은 쪽만 효과를 냅니다. 적성이 같으면 둘 다 절반만 냅니다.",
        ],
      },
      {
        title: "국력과 민심",
        body: [
          `국력 ${RULES.initialPower}으로 시작합니다. 0이 되면 집니다. ${RULES.maxRounds}라운드가 끝나면 국력이 높은 쪽이 이깁니다.`,
          `민심 ${RULES.initialMorale}으로 시작합니다. 전투를 할 때마다 민심 ${RULES.assaultMoraleCost}을 씁니다.`,
          `민심이 0이면 매 라운드 반란이 일어나 국력을 (${RULES.rebellionBase} + 라운드)만큼 잃습니다.`,
        ],
      },
      {
        title: "인물 운용",
        body: [
          "전투·책략에 낸 인물은 쉬러 갑니다. 내정에 낸 인물은 손패에 남고, 쉬던 인물 한 명을 불러옵니다.",
          `손패가 비면 쉬던 인물 ${RULES.recallChoices}명 가운데 한 명을 골라 불러옵니다.`,
        ],
      },
      {
        title: "주장·천명·격화",
        body: [
          `주장이 손패에 있으면 다른 인물의 적성 +${pct(RULES.captainAura)}, 주장이 직접 나서면 적성 ×${RULES.captainSelf}.`,
          `천명: 라운드마다 한 명령의 적성이 ×${RULES.mandateBonus}가 됩니다. 앞으로 두 라운드의 천명도 미리 보입니다.`,
          `격화: ${RULES.escalationStartRound}라운드부터 공격 피해가 라운드마다 ${pct(RULES.escalationPerRound)}씩 커집니다. 회복은 그대로입니다.`,
        ],
      },
      {
        title: "일기토",
        body: [
          `같은 명령끼리 붙어 적성에서 밀리거나 같을 때, 한 판에 ${RULES.duelsPerGame}번 일기토를 청해 승부를 뒤집을 수 있습니다.`,
        ],
      },
    ],
    keys: "단축키: 1~5 인물 · Q 전투 · W 책략 · E 내정 · Enter 출전",
  },
};
