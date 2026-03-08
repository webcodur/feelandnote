import type { Command, CounterResult } from "@/lib/game/types";

type LocaleKey = "ko" | "en";

interface BattleSection {
  label: string;
  content: string;
}

interface BattleCommandInfo {
  summary: string;
  sections: BattleSection[];
  aptFormula: string;
  tip: string;
}

interface BattleCaptainInfo {
  title: string;
  subtitle: string;
  sections: { label: string; content: string }[];
  tipTitle: string;
  tip: string;
}

interface BattleText {
  loading: string;
  phase: {
    draftTitle: string;
    draftSubtitle: string;
    captainTitle: string;
    captainSubtitle: string;
    battleTitle: string;
    battleSubtitle: string;
  };
  draft: {
    done: string;
    aiThinking: string;
    aiPicked: string;
    discarding: string;
    revealing: string;
    playerTurn: string;
    reshuffle: string;
    autoPick: string;
    confirm: string;
  };
  captain: {
    title: string;
    aura: string;
    deploy: string;
    appoint: string;
  };
  result: {
    victory: string;
    defeat: string;
    draw: string;
    me: string;
    power: string;
    morale: string;
    replay: string;
    lobby: string;
    roundHistory: string;
    roundsSuffix: string;
  };
  commandInfo: {
    aptitude: string;
    strategy: string;
    counterTable: string;
    counterFlow: string;
    outcome: Record<CounterResult, string>;
  };
  cardInfo: {
    commandAptitude: string;
    influence: string;
    abilities: string;
  };
  play: {
    aptitude: string;
    invalid: string;
    duel: string;
    duelOutcome: { player: string; ai: string; draw: string };
    edge: string;
    tie: string;
    ally: string;
    enemy: string;
    next: string;
    nextRound: string;
    battleLog: string;
    battleLogEmpty: string;
    handMine: string;
    handEnemy: string;
    used: string;
    usedDone: string;
    recovered: string;
    waiting: string;
    restTitle: string;
    restDescription: string;
    restComplete: string;
    clash: string;
    resolving: string;
    exhausted: string;
    chooseCard: string;
    chooseCommand: string;
    ready: string;
    tapContinue: string;
    clickContinue: string;
    result: string;
    advance: string;
    restButton: string;
    randomRecover: string;
    escalateTitle: string;
    escalateSubtitlePrefix: string;
    recordTitle: string;
    noRecord: string;
  };
}

const TEXT: Record<LocaleKey, BattleText> = {
  ko: {
    loading: "카드 데이터 로딩 중...",
    phase: {
      draftTitle: "드래프트",
      draftSubtitle: "15장에서 5장씩 선택합니다",
      captainTitle: "주장 선택",
      captainSubtitle: "아군의 지휘관을 임명합니다",
      battleTitle: "대전",
      battleSubtitle: "동시에 카드와 명령을 선택합니다",
    },
    draft: {
      done: "드래프트 완료",
      aiThinking: "AI 선택 중",
      aiPicked: "AI 선택 완료",
      discarding: "카드 폐기",
      revealing: "다음 개봉",
      playerTurn: "내 차례",
      reshuffle: "다시 섞기",
      autoPick: "자동 선택",
      confirm: "확정",
    },
    captain: {
      title: "주장 선택",
      aura: "주장이 손패에 있으면 아군 전원 적성 +15%.",
      deploy: "주장이 직접 출전하면 본인 적성 ×1.5.",
      appoint: "임명",
    },
    result: {
      victory: "승리!",
      defeat: "패배",
      draw: "무승부",
      me: "나",
      power: "국력",
      morale: "민심",
      replay: "다시 대전",
      lobby: "로비로",
      roundHistory: "라운드 기록",
      roundsSuffix: "회",
    },
    commandInfo: {
      aptitude: "적성",
      strategy: "전략",
      counterTable: "상성표",
      counterFlow: "전투 > 내정 > 책략 > 전투",
      outcome: { win: "승", lose: "패", draw: "무" },
    },
    cardInfo: {
      commandAptitude: "명령 적성",
      influence: "영향력",
      abilities: "능력",
    },
    play: {
      aptitude: "적성",
      invalid: "무효",
      duel: "일기토",
      duelOutcome: { player: "승", ai: "패", draw: "무" },
      edge: "우세",
      tie: "동률",
      ally: "아군",
      enemy: "적군",
      next: "다음",
      nextRound: "다음 라운드",
      battleLog: "전황 기록",
      battleLogEmpty: "전황 기록 없음",
      handMine: "내 패",
      handEnemy: "상대 패",
      used: "사용",
      usedDone: "사용됨",
      recovered: "회수",
      waiting: "출전 대기",
      restTitle: "패 재편성",
      restDescription: "손패가 소진되어 1턴 휴식합니다",
      restComplete: "재편성 완료",
      clash: "충돌!",
      resolving: "결과 처리 중...",
      exhausted: "손패가 소진되었습니다",
      chooseCard: "카드를 선택하세요",
      chooseCommand: "군령패를 선택하세요",
      ready: "출전 준비 완료",
      tapContinue: "탭하여 계속",
      clickContinue: "클릭하여 계속",
      result: "결과",
      advance: "진군",
      restButton: "한 턴 쉬기",
      randomRecover: "버린패에서 랜덤 징집",
      escalateTitle: "전세 격화",
      escalateSubtitlePrefix: "공격 피해 +",
      recordTitle: "전황 기록",
      noRecord: "전황 기록 없음",
    },
  },
  en: {
    loading: "Loading card data...",
    phase: {
      draftTitle: "Draft",
      draftSubtitle: "Pick 5 cards out of 15",
      captainTitle: "Captain",
      captainSubtitle: "Appoint your commander",
      battleTitle: "Battle",
      battleSubtitle: "Choose cards and orders simultaneously",
    },
    draft: {
      done: "Draft Complete",
      aiThinking: "AI Picking",
      aiPicked: "AI Picked",
      discarding: "Discarding",
      revealing: "Revealing Next",
      playerTurn: "Your Turn",
      reshuffle: "Reshuffle",
      autoPick: "Auto Pick",
      confirm: "Confirm",
    },
    captain: {
      title: "Select Captain",
      aura: "If the captain stays in hand, all allies gain +15% aptitude.",
      deploy: "If the captain deploys directly, their aptitude becomes x1.5.",
      appoint: "Appoint",
    },
    result: {
      victory: "Victory!",
      defeat: "Defeat",
      draw: "Draw",
      me: "Me",
      power: "Power",
      morale: "Morale",
      replay: "Rematch",
      lobby: "Lobby",
      roundHistory: "Round History",
      roundsSuffix: " rounds",
    },
    commandInfo: {
      aptitude: "Apt.",
      strategy: "Strategy",
      counterTable: "Matchups",
      counterFlow: "Battle > Govern > Scheme > Battle",
      outcome: { win: "Win", lose: "Lose", draw: "Draw" },
    },
    cardInfo: {
      commandAptitude: "Order Aptitude",
      influence: "Influence",
      abilities: "Abilities",
    },
    play: {
      aptitude: "APT",
      invalid: "Nullified",
      duel: "Duel",
      duelOutcome: { player: "Win", ai: "Lose", draw: "Draw" },
      edge: "Edge",
      tie: "Tie",
      ally: "Ally",
      enemy: "Enemy",
      next: "Next",
      nextRound: "Next Round",
      battleLog: "Battle Log",
      battleLogEmpty: "No battle log yet",
      handMine: "My Hand",
      handEnemy: "Enemy Hand",
      used: "Used",
      usedDone: "Spent",
      recovered: "Recovered",
      waiting: "Awaiting Deployment",
      restTitle: "Regrouping",
      restDescription: "Your hand is exhausted. Resting for one round.",
      restComplete: "Regroup Complete",
      clash: "Clash!",
      resolving: "Resolving...",
      exhausted: "Your hand is exhausted",
      chooseCard: "Choose a card",
      chooseCommand: "Choose an order",
      ready: "Ready to deploy",
      tapContinue: "Tap to continue",
      clickContinue: "Click to continue",
      result: "Result",
      advance: "Advance",
      restButton: "Skip Round",
      randomRecover: "Randomly recover from discard",
      escalateTitle: "Battle Intensifies",
      escalateSubtitlePrefix: "Attack damage +",
      recordTitle: "Battle Log",
      noRecord: "No battle log yet",
    },
  },
};

const COMMAND_LABELS_BY_LOCALE: Record<LocaleKey, Record<Command, string>> = {
  ko: {
    assault: "전투",
    stratagem: "책략",
    govern: "내정",
  },
  en: {
    assault: "Battle",
    stratagem: "Scheme",
    govern: "Govern",
  },
};

const COMMAND_PLAQUE_LABELS: Record<LocaleKey, Record<Command, string>> = {
  ko: {
    assault: "전투",
    stratagem: "책략",
    govern: "내정",
  },
  en: {
    assault: "BAT",
    stratagem: "SCH",
    govern: "GOV",
  },
};

const COMMAND_SEAL_LABELS: Record<LocaleKey, Record<Command, string>> = {
  ko: {
    assault: "戰",
    stratagem: "策",
    govern: "政",
  },
  en: {
    assault: "B",
    stratagem: "S",
    govern: "G",
  },
};

const COUNTER_LABELS: Record<LocaleKey, Record<CounterResult, string>> = {
  ko: { win: "카운터", lose: "역습", draw: "접전" },
  en: { win: "Counter", lose: "Riposte", draw: "Standoff" },
};

const COUNTER_EXPLAINS: Record<LocaleKey, Record<string, string>> = {
  ko: {
    "assault-govern": "전투가 내정을 압도",
    "govern-stratagem": "내정이 책략을 무력화",
    "stratagem-assault": "책략이 전투를 제압",
  },
  en: {
    "assault-govern": "Battle overwhelms govern",
    "govern-stratagem": "Govern nullifies scheme",
    "stratagem-assault": "Scheme suppresses battle",
  },
};

const COMMAND_DETAILS: Record<LocaleKey, Record<Command, BattleCommandInfo>> = {
  ko: {
    assault: {
      summary: "군사력으로 상대 국력을 직접 타격한다.",
      sections: [
        { label: "기본 효과", content: "상대 국력 -round(적성/2). 자국 민심 -3 (전쟁 피로, 상성과 무관하게 항상 차감)." },
        { label: "상성 승리 (vs 내정)", content: "타격 피해 ×1.5. 상대 내정의 회복 효과 차단." },
        { label: "상성 패배 (vs 책략)", content: "타격 피해 불발. 민심 -3과 카드 소모는 그대로 지불." },
        { label: "접전 (전투 vs 전투)", content: "적성이 높은 쪽만 타격 성공, 낮은 쪽은 불발. 동률 시 양쪽 ×0.5." },
      ],
      aptFormula: "(전략 + 사회) / 2 × (1 + 무력/100)",
      tip: "가장 직접적인 승리 수단. 민심 -3 비용이 매턴 누적되므로 내정과 병행 필수. 책략에 약하다.",
    },
    stratagem: {
      summary: "책략으로 상대 민심을 공격한다.",
      sections: [
        { label: "기본 효과", content: "상대 민심 -round(적성/2)." },
        { label: "상성 승리 (vs 전투)", content: "민심 피해 ×1.5. 상대 전투의 타격 피해 차단." },
        { label: "상성 패배 (vs 내정)", content: "민심 피해 불발. 카드만 소모." },
        { label: "접전 (책략 vs 책략)", content: "적성이 높은 쪽만 피해 성공, 낮은 쪽은 불발. 동률 시 양쪽 ×0.5." },
      ],
      aptFormula: "(정치 + 기술) / 2 × (1 + 지력/100)",
      tip: "민심 0 이하 시 반란(국력 -5, 민심 10 리셋)을 유발. 전투를 카운터한다. 내정에 약하다.",
    },
    govern: {
      summary: "내정으로 국력과 민심을 회복하고 버린패를 회수한다.",
      sections: [
        { label: "국력 회복", content: "round(적성/3). 소량이지만 유일한 국력 회복 수단." },
        { label: "민심 회복", content: "round(적성/2). 적성 10이면 민심 +5." },
        { label: "버린패 회수", content: "사용한 카드 중 1장을 손패로 회수. 선택 가능." },
        { label: "카드 유지", content: "다른 명령과 달리 사용한 카드가 소모되지 않고 손패에 남는다." },
        { label: "상성 승리 (vs 책략)", content: "회복량 ×1.5. 상대 책략의 민심 피해 차단." },
        { label: "상성 패배 (vs 전투)", content: "회복 불발. 단, 카드 유지와 버린패 회수는 상성과 무관하게 유지." },
      ],
      aptFormula: "(경제 + 문화) / 2 × (1 + 통솔/100)",
      tip: "공격 안 하는 턴이므로 상대에게 자유턴을 준다. 책략을 카운터한다. 전투에 약하다.",
    },
  },
  en: {
    assault: {
      summary: "Directly strikes the opponent's power with military force.",
      sections: [
        { label: "Base Effect", content: "Enemy power -round(aptitude/2). Your morale -3 every time, regardless of matchup." },
        { label: "Matchup Win (vs Govern)", content: "Damage ×1.5. Cancels the opponent's recovery." },
        { label: "Matchup Loss (vs Scheme)", content: "Damage fails. Morale -3 and card consumption still apply." },
        { label: "Mirror Clash (Battle vs Battle)", content: "Only the higher aptitude side lands the hit. On a tie, both resolve at ×0.5." },
      ],
      aptFormula: "(Strategy + Society) / 2 × (1 + Martial/100)",
      tip: "Your most direct win condition. Since morale -3 stacks every round, pair it with govern. Vulnerable to scheme.",
    },
    stratagem: {
      summary: "Attacks the opponent's morale with schemes and tactics.",
      sections: [
        { label: "Base Effect", content: "Enemy morale -round(aptitude/2)." },
        { label: "Matchup Win (vs Battle)", content: "Morale damage ×1.5. Cancels the opponent's battle damage." },
        { label: "Matchup Loss (vs Govern)", content: "Morale damage fails. The card is still consumed." },
        { label: "Mirror Clash (Scheme vs Scheme)", content: "Only the higher aptitude side deals damage. On a tie, both resolve at ×0.5." },
      ],
      aptFormula: "(Politics + Tech) / 2 × (1 + Intellect/100)",
      tip: "Can push morale to zero and trigger revolts. It counters battle, but govern shuts it down.",
    },
    govern: {
      summary: "Recovers power and morale while reclaiming a card from discard.",
      sections: [
        { label: "Power Recovery", content: "round(aptitude/3). Small, but the only direct power recovery." },
        { label: "Morale Recovery", content: "round(aptitude/2). At aptitude 10, morale +5." },
        { label: "Discard Recovery", content: "Return 1 used card from discard to hand." },
        { label: "Card Retention", content: "Unlike other orders, the used card stays in your hand." },
        { label: "Matchup Win (vs Scheme)", content: "Recovery ×1.5. Cancels the opponent's morale damage." },
        { label: "Matchup Loss (vs Battle)", content: "Recovery fails, but card retention and discard recovery still remain." },
      ],
      aptFormula: "(Economy + Culture) / 2 × (1 + Command/100)",
      tip: "You surrender initiative for a round, but it stabilizes your nation and counters scheme. Weak against battle.",
    },
  },
};

const CAPTAIN_INFO: Record<LocaleKey, BattleCaptainInfo> = {
  ko: {
    title: "주장",
    subtitle: "아군의 지휘관을 임명하여 전력을 강화한다.",
    sections: [
      { label: "아우라 효과", content: "주장이 손패에 남아있으면 아군 전원의 적성이 +15% 증가한다." },
      { label: "직접 출전", content: "주장이 직접 출전하면 본인의 적성이 ×1.5로 강화된다. 아우라 효과와 중복되지 않는다." },
      { label: "주장 소모", content: "주장이 전투/책략으로 소모되면 아우라 효과가 사라진다. 내정으로 회수하면 아우라가 복구된다." },
    ],
    tipTitle: "전략",
    tip: "약한 카드를 주장으로 지정하면 아우라가 오래 유지된다. 강한 카드를 지정하면 출전 시 폭발적이지만 소모 리스크가 크다.",
  },
  en: {
    title: "Captain",
    subtitle: "Appoint your commander to strengthen the entire force.",
    sections: [
      { label: "Aura Effect", content: "While the captain remains in hand, all allied deployments gain +15% aptitude." },
      { label: "Direct Deployment", content: "If the captain deploys directly, their own aptitude becomes ×1.5. This does not stack with the aura." },
      { label: "Captain Consumed", content: "If the captain is spent on battle or scheme, the aura disappears. Recovering them through govern restores it." },
    ],
    tipTitle: "Strategy",
    tip: "A weaker captain keeps the aura alive longer. A stronger captain creates explosive turns, but the risk of losing them is much higher.",
  },
};

function localeKey(locale: string): LocaleKey {
  return locale.startsWith("en") ? "en" : "ko";
}

export function getBattleText(locale: string): BattleText {
  return TEXT[localeKey(locale)];
}

export function getBattleCommandLabel(command: Command, locale: string): string {
  return COMMAND_LABELS_BY_LOCALE[localeKey(locale)][command];
}

export function getBattlePlaqueLabel(command: Command, locale: string): string {
  return COMMAND_PLAQUE_LABELS[localeKey(locale)][command];
}

export function getBattleSealLabel(command: Command, locale: string): string {
  return COMMAND_SEAL_LABELS[localeKey(locale)][command];
}

export function getBattleCounterLabel(result: CounterResult, locale: string, emphatic = false): string {
  const label = COUNTER_LABELS[localeKey(locale)][result];
  return emphatic && result !== "draw" ? `${label}!` : label;
}

export function getBattleCounterExplain(playerCommand: Command, aiCommand: Command, locale: string): string | null {
  const map = COUNTER_EXPLAINS[localeKey(locale)];
  return map[`${playerCommand}-${aiCommand}`] ?? map[`${aiCommand}-${playerCommand}`] ?? null;
}

export function getBattleMandateLabel(command: Command, locale: string): string {
  if (localeKey(locale) === "en") {
    switch (command) {
      case "assault":
        return "Fate of Storms";
      case "stratagem":
        return "Fate of Shadows";
      case "govern":
        return "Fate of Peace";
    }
  }

  switch (command) {
    case "assault":
      return "폭풍의 천명";
    case "stratagem":
      return "그림자의 천명";
    case "govern":
      return "태평의 천명";
  }
}

export function getBattleCommandInfo(command: Command, locale: string): BattleCommandInfo {
  return COMMAND_DETAILS[localeKey(locale)][command];
}

export function getBattleCaptainInfo(locale: string): BattleCaptainInfo {
  return CAPTAIN_INFO[localeKey(locale)];
}

export function getBattleCardEffect(command: Command, apt: number, locale: string): string {
  const l = localeKey(locale);
  const baseDamage = Math.round(apt / 2);
  if (l === "ko") {
    switch (command) {
      case "assault":
        return `국력 -${baseDamage}. 민심 -3 (항상)`;
      case "stratagem":
        return `민심 -${baseDamage}`;
      case "govern":
        return `국력 +${Math.round(apt / 3)}, 민심 +${baseDamage}. 카드 유지 + 1장 회수`;
    }
  }

  switch (command) {
    case "assault":
      return `Power -${baseDamage}. Morale -3 (always)`;
    case "stratagem":
      return `Morale -${baseDamage}`;
    case "govern":
      return `Power +${Math.round(apt / 3)}, Morale +${baseDamage}. Keep card + recover 1`;
  }
}

export function getBattleRoundsLabel(count: number, locale: string): string {
  const text = getBattleText(locale);
  return localeKey(locale) === "en" ? `${count}${text.result.roundsSuffix}` : `${count}${text.result.roundsSuffix}`;
}

export function translateBattleNarrative(text: string, locale: string): string {
  if (localeKey(locale) !== "en") return text;

  const applyFateTag = (value: string, hasFate: boolean) => hasFate ? `${value} [Fate]` : value;
  const base = text.replace(/\s*\[천명\]$/, "");
  const hasFate = /\[천명\]$/.test(text);

  let match = base.match(/^(.+?) 전투 무효! 민심 -3$/);
  if (match) return applyFateTag(`${match[1]} battle nullified! Morale -3`, hasFate);

  match = base.match(/^(.+?) 전투! 적 국력 -(\d+)( \(상성 승\))?$/);
  if (match) {
    return applyFateTag(`${match[1]} attacks! Enemy power -${match[2]}${match[3] ? " (matchup win)" : ""}`, hasFate);
  }

  match = base.match(/^(.+?) 책략 무효!$/);
  if (match) return applyFateTag(`${match[1]} scheme nullified!`, hasFate);

  match = base.match(/^(.+?) 책략! 적 민심 -(\d+)( \(상성 승\))?$/);
  if (match) {
    return applyFateTag(`${match[1]} schemes! Enemy morale -${match[2]}${match[3] ? " (matchup win)" : ""}`, hasFate);
  }

  match = base.match(/^(.+?) 내정 무효!$/);
  if (match) return applyFateTag(`${match[1]} govern nullified!`, hasFate);

  match = base.match(/^(.+?) 내정! 국력 \+(\d+), 민심 \+(\d+)( \(상성 승\))?$/);
  if (match) {
    return applyFateTag(`${match[1]} governs! Power +${match[2]}, morale +${match[3]}${match[4] ? " (matchup win)" : ""}`, hasFate);
  }

  match = base.match(/^(.+?) 회수$/);
  if (match) return `${match[1]} recovered`;

  match = base.match(/^아군 민심 붕괴! 초과분 국력 -(\d+)$/);
  if (match) return `Allied morale collapse! Overflow power -${match[1]}`;

  match = base.match(/^적군 민심 붕괴! 초과분 국력 -(\d+)$/);
  if (match) return `Enemy morale collapse! Overflow power -${match[1]}`;

  match = base.match(/^아군 반란 발생! 국력 -(\d+)$/);
  if (match) return `Allied revolt! Power -${match[1]}`;

  match = base.match(/^적군 반란 발생! 국력 -(\d+)$/);
  if (match) return `Enemy revolt! Power -${match[1]}`;

  return text;
}
