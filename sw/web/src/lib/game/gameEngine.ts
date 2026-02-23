/*
  파일명: lib/game/gameEngine.ts
  기능: 패권 v6 동시 행동 게임 엔진
  책임: 적성 계산, 상성 판정, 라운드 결산(executeRound)을 담당한다.
*/

import type {
  BattleCard, Command, NationState, RoundRecord, RoundAction,
  Domain, CounterResult,
} from "./types";
import { MAX_POWER, MAX_MORALE, CAPTAIN_AURA_BONUS, CAPTAIN_PLAY_BONUS } from "./types";

// ─── 적성 계산 ───

/** 카드 1장의 특정 명령 적성 (0-20 범위) */
export function calcAptitude(card: BattleCard, command: Command): number {
  const inf = card.influence;
  const ab = card.ability;

  switch (command) {
    case "assault":
      return (inf.strategic + inf.social) / 2 * (1 + ab.martial / 100);
    case "stratagem":
      return (inf.political + inf.tech) / 2 * (1 + ab.intellect / 100);
    case "govern":
      return (inf.economic + inf.cultural) / 2 * (1 + ab.command / 100);
  }
}

/**
 * 주장 오라 적용된 적성 계산.
 * - 주장이 손패에 있고, 다른 카드가 출전 → +15%
 * - 주장 본인이 출전 → ×1.5
 * - 주장이 소모(버린패)된 상태 → 보너스 없음
 */
export function calcAptitudeWithCaptain(
  card: BattleCard,
  command: Command,
  captainId: string | null,
  captainInHand: boolean,
): number {
  const base = calcAptitude(card, command);
  if (!captainId || !captainInHand) return base;
  if (card.id === captainId) return base * CAPTAIN_PLAY_BONUS;
  return base * (1 + CAPTAIN_AURA_BONUS);
}

// ─── 유틸리티 ───

/** 적성 → 별점 변환 (0-20 → 1-5) */
export function aptitudeToStars(value: number): number {
  if (value >= 17) return 5;
  if (value >= 13) return 4;
  if (value >= 9) return 3;
  if (value >= 5) return 2;
  return 1;
}

/** 영역 순서 랜덤 셔플 */
export function shuffleDomains(domains: Domain[]): Domain[] {
  const arr = [...domains];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// ─── 상성 매트릭스 (3×3 RPS) ───
// 전투 > 내정 > 책략 > 전투

const COUNTER_MATRIX: Record<Command, Record<Command, CounterResult>> = {
  assault:   { assault: "draw", stratagem: "lose",  govern: "win" },
  stratagem: { assault: "win",  stratagem: "draw",  govern: "lose" },
  govern:    { assault: "lose", stratagem: "win",   govern: "draw" },
};

/** 상성 판정 (플레이어 관점) */
export function getCounterResult(myCmd: Command, oppCmd: Command): CounterResult {
  return COUNTER_MATRIX[myCmd][oppCmd];
}

/**
 * 이진 상성 효과 배수 계산
 * @returns { myMul, oppMul } — 각 측의 효과 배수
 */
export function applyCounter(
  result: CounterResult,
  myApt: number,
  oppApt: number,
): { myMul: number; oppMul: number } {
  switch (result) {
    case "win":
      return { myMul: 1.5, oppMul: 0 };
    case "lose":
      return { myMul: 0, oppMul: 1.5 };
    case "draw":
      // 적성 높은 쪽만 ×1.0, 낮은 쪽 무효. 동률 시 양쪽 ×0.5
      if (myApt > oppApt) return { myMul: 1.0, oppMul: 0 };
      if (myApt < oppApt) return { myMul: 0, oppMul: 1.0 };
      return { myMul: 0.5, oppMul: 0.5 };
  }
}

// ─── 라운드 결산 ───

export interface ExecuteRoundParams {
  round: number;
  playerCard: BattleCard;
  playerCommand: Command;
  playerRecoverId?: string;
  aiCard: BattleCard;
  aiCommand: Command;
  aiRecoverId?: string;
  playerNation: NationState;
  aiNation: NationState;
  playerHand: BattleCard[];
  aiHand: BattleCard[];
  playerDiscard: BattleCard[];
  aiDiscard: BattleCard[];
  mandateCommand?: Command;
  playerCaptainId?: string | null;
  aiCaptainId?: string | null;
}

export interface ExecuteRoundResult {
  record: RoundRecord;
  newPlayerHand: BattleCard[];
  newAiHand: BattleCard[];
  newPlayerDiscard: BattleCard[];
  newAiDiscard: BattleCard[];
  newPlayerNation: NationState;
  newAiNation: NationState;
}

/** 동시 행동 라운드 결산 */
export function executeRound(params: ExecuteRoundParams): ExecuteRoundResult {
  const { round, mandateCommand } = params;

  let playerHand = [...params.playerHand];
  let aiHand = [...params.aiHand];
  let playerDiscard = [...params.playerDiscard];
  let aiDiscard = [...params.aiDiscard];

  const narratives: string[] = [];

  let pPowerDelta = 0;
  let aPowerDelta = 0;
  let pMoraleDelta = 0;
  let aMoraleDelta = 0;

  // 1. 적성 계산 (주장 오라 + 천명 보너스)
  const pCaptainInHand = !!params.playerCaptainId && playerHand.some(c => c.id === params.playerCaptainId);
  const aCaptainInHand = !!params.aiCaptainId && aiHand.some(c => c.id === params.aiCaptainId);
  const pRawApt = calcAptitudeWithCaptain(params.playerCard, params.playerCommand, params.playerCaptainId ?? null, pCaptainInHand);
  const aRawApt = calcAptitudeWithCaptain(params.aiCard, params.aiCommand, params.aiCaptainId ?? null, aCaptainInHand);
  const pMandateBonus = mandateCommand === params.playerCommand;
  const aMandateBonus = mandateCommand === params.aiCommand;
  const pApt = pMandateBonus ? pRawApt * 1.5 : pRawApt;
  const aApt = aMandateBonus ? aRawApt * 1.5 : aRawApt;

  // 2. 상성 판정 + 이진 효과 배수
  const counterResult = getCounterResult(params.playerCommand, params.aiCommand);
  const { myMul: pMul, oppMul: aMul } = applyCounter(counterResult, pApt, aApt);

  // 3. 양쪽 명령 동시 결산
  const pResult = resolveCommand({
    card: params.playerCard,
    command: params.playerCommand,
    apt: pApt,
    mul: pMul,
    mandateBonus: pMandateBonus,
    myDiscard: playerDiscard,
    recoverId: params.playerRecoverId,
    round,
  });

  const aResult = resolveCommand({
    card: params.aiCard,
    command: params.aiCommand,
    apt: aApt,
    mul: aMul,
    mandateBonus: aMandateBonus,
    myDiscard: aiDiscard,
    recoverId: params.aiRecoverId,
    round,
  });

  // 4. 델타 합산
  pPowerDelta += pResult.myPowerDelta + aResult.oppPowerDelta;
  aPowerDelta += aResult.myPowerDelta + pResult.oppPowerDelta;
  pMoraleDelta += pResult.myMoraleDelta + aResult.oppMoraleDelta;
  aMoraleDelta += aResult.myMoraleDelta + pResult.oppMoraleDelta;

  narratives.push(...pResult.narratives.map(n => `[아군] ${n}`));
  narratives.push(...aResult.narratives.map(n => `[적군] ${n}`));

  // 5. 카드 소모 + 후처리
  if (pResult.consumeCard) {
    playerHand = playerHand.filter(c => c.id !== params.playerCard.id);
    playerDiscard.push(params.playerCard);
  }
  if (aResult.consumeCard) {
    aiHand = aiHand.filter(c => c.id !== params.aiCard.id);
    aiDiscard.push(params.aiCard);
  }

  // 내정 회수
  if (pResult.recoveredCards.length > 0) {
    for (const rc of pResult.recoveredCards) {
      playerDiscard = playerDiscard.filter(c => c.id !== rc.id);
      playerHand.push(rc);
    }
  }
  if (aResult.recoveredCards.length > 0) {
    for (const rc of aResult.recoveredCards) {
      aiDiscard = aiDiscard.filter(c => c.id !== rc.id);
      aiHand.push(rc);
    }
  }

  // 국력/민심 적용
  let newPlayerPower = params.playerNation.power + pPowerDelta;
  let newAiPower = params.aiNation.power + aPowerDelta;
  let newPlayerMorale = params.playerNation.morale + pMoraleDelta;
  let newAiMorale = params.aiNation.morale + aMoraleDelta;

  // 5-1. 민심 0 이하 초과분 → 국력 피해로 전환
  if (newPlayerMorale < 0) {
    const overflow = -newPlayerMorale;
    newPlayerPower -= overflow;
    pPowerDelta -= overflow;
    newPlayerMorale = 0;
    narratives.push(`아군 민심 붕괴! 초과분 국력 -${overflow}`);
  }
  if (newAiMorale < 0) {
    const overflow = -newAiMorale;
    newAiPower -= overflow;
    aPowerDelta -= overflow;
    newAiMorale = 0;
    narratives.push(`적군 민심 붕괴! 초과분 국력 -${overflow}`);
  }

  // 6. 반란 판정 (민심 0 도달 시 발동, 라운드에 비례하는 국력 피해)
  let playerRebellion = false;
  let aiRebellion = false;
  const rebellionDmg = 3 + round; // R1=4, R5=8, R10=13

  if (newPlayerMorale <= 0) {
    playerRebellion = true;
    newPlayerPower -= rebellionDmg;
    pPowerDelta -= rebellionDmg;
    newPlayerMorale = 0;
    narratives.push(`아군 반란 발생! 국력 -${rebellionDmg}`);
  }
  if (newAiMorale <= 0) {
    aiRebellion = true;
    newAiPower -= rebellionDmg;
    aPowerDelta -= rebellionDmg;
    newAiMorale = 0;
    narratives.push(`적군 반란 발생! 국력 -${rebellionDmg}`);
  }

  // 7. 상한 클램프
  newPlayerPower = Math.min(newPlayerPower, MAX_POWER);
  newAiPower = Math.min(newAiPower, MAX_POWER);
  newPlayerMorale = Math.min(newPlayerMorale, MAX_MORALE);
  newAiMorale = Math.min(newAiMorale, MAX_MORALE);

  // 8. RoundRecord 생성
  const playerAction: RoundAction = {
    cardId: params.playerCard.id,
    command: params.playerCommand,
    recoverId: params.playerRecoverId,
    card: params.playerCard,
    aptitude: pApt,
    mandateBonus: pMandateBonus,
    effectiveAptitude: pApt * pMul,
  };

  const aiAction: RoundAction = {
    cardId: params.aiCard.id,
    command: params.aiCommand,
    recoverId: params.aiRecoverId,
    card: params.aiCard,
    aptitude: aApt,
    mandateBonus: aMandateBonus,
    effectiveAptitude: aApt * aMul,
  };

  const record: RoundRecord = {
    round,
    player: playerAction,
    ai: aiAction,
    counterResult,
    result: narratives.join(" / "),
    powerDelta: { player: pPowerDelta, ai: aPowerDelta },
    moraleDelta: { player: pMoraleDelta, ai: aMoraleDelta },
    rebellion: { player: playerRebellion, ai: aiRebellion },
    nationAfter: {
      player: { power: newPlayerPower, morale: newPlayerMorale },
      ai: { power: newAiPower, morale: newAiMorale },
    },
  };

  return {
    record,
    newPlayerHand: playerHand,
    newAiHand: aiHand,
    newPlayerDiscard: playerDiscard,
    newAiDiscard: aiDiscard,
    newPlayerNation: { power: newPlayerPower, morale: newPlayerMorale },
    newAiNation: { power: newAiPower, morale: newAiMorale },
  };
}

// ─── 라운드 에스컬레이션 ───

/**
 * 라운드 진행에 따른 효과 배수.
 * 1~4라운드: x1.0 (안정기)
 * 5라운드~: 공격 +15%/라운드, 회복 고정 x1.0
 * → 공격만 단방향 증가하여 자연스럽게 8~12라운드에 결판.
 */
export function getEscalation(round: number, type: "offense" | "recovery"): number {
  if (type === "recovery") return 1;
  const base = Math.max(0, round - 4);
  return 1 + base * 0.15;   // R5=1.15, R7=1.45, R10=1.90, R12=2.20
}

// ─── 단일 측면 명령 효과 계산 ───

interface ResolveCommandParams {
  card: BattleCard;
  command: Command;
  apt: number;         // 천명 보정 적용된 적성
  mul: number;         // 상성 효과 배수 (0, 0.5, 1.0, 1.5)
  mandateBonus: boolean;
  myDiscard: BattleCard[];
  recoverId?: string;
  round: number;       // 에스컬레이션 계산용
}

interface ResolveCommandResult {
  myPowerDelta: number;
  oppPowerDelta: number;
  myMoraleDelta: number;
  oppMoraleDelta: number;
  consumeCard: boolean;
  recoveredCards: BattleCard[];
  narratives: string[];
}

function resolveCommand(params: ResolveCommandParams): ResolveCommandResult {
  const { card, command, apt, mul, mandateBonus, myDiscard, round } = params;

  let myPowerDelta = 0;
  let oppPowerDelta = 0;
  let myMoraleDelta = 0;
  let oppMoraleDelta = 0;
  let consumeCard = false;
  const recoveredCards: BattleCard[] = [];
  const narratives: string[] = [];

  const offEsc = getEscalation(round, "offense");
  const recEsc = getEscalation(round, "recovery");

  switch (command) {
    case "assault": {
      // 민심 -3 항상 지불 (상성 무관, 에스컬레이션 미적용)
      myMoraleDelta -= 3;

      if (mul === 0) {
        narratives.push(`${card.nickname} 전투 무효! 민심 -3${mandateBonus ? " [천명]" : ""}`);
      } else {
        const dmg = Math.round(Math.round(apt / 2) * mul * offEsc);
        oppPowerDelta -= dmg;
        narratives.push(`${card.nickname} 전투! 적 국력 -${dmg}${mul > 1 ? " (상성 승)" : ""}${mandateBonus ? " [천명]" : ""}`);
      }
      consumeCard = true;
      break;
    }

    case "stratagem": {
      if (mul === 0) {
        narratives.push(`${card.nickname} 책략 무효!${mandateBonus ? " [천명]" : ""}`);
      } else {
        const dmg = Math.round(Math.round(apt / 2) * mul * offEsc);
        oppMoraleDelta -= dmg;
        narratives.push(`${card.nickname} 책략! 적 민심 -${dmg}${mul > 1 ? " (상성 승)" : ""}${mandateBonus ? " [천명]" : ""}`);
      }
      consumeCard = true;
      break;
    }

    case "govern": {
      if (mul === 0) {
        narratives.push(`${card.nickname} 내정 무효!${mandateBonus ? " [천명]" : ""}`);
      } else {
        const powerRec = Math.round(Math.round(apt / 3) * mul * recEsc);
        const moraleRec = Math.round(Math.round(apt / 2) * mul * recEsc);
        myPowerDelta += powerRec;
        myMoraleDelta += moraleRec;
        narratives.push(`${card.nickname} 내정! 국력 +${powerRec}, 민심 +${moraleRec}${mul > 1 ? " (상성 승)" : ""}${mandateBonus ? " [천명]" : ""}`);
      }

      // 카드 유지 (소모 안 됨) + 버린패 1장 회수 (상성 무관)
      const recoveredNames: string[] = [];
      if (myDiscard.length > 0) {
        const rid = params.recoverId;
        const recoverCard = rid
          ? myDiscard.find(c => c.id === rid) ?? myDiscard[0]
          : myDiscard[0];
        if (recoverCard) {
          recoveredCards.push(recoverCard);
          recoveredNames.push(recoverCard.nickname);
        }
      }
      if (recoveredNames.length > 0) {
        narratives.push(`${recoveredNames.join(", ")} 회수`);
      }
      break; // consumeCard = false (카드 유지)
    }
  }

  return {
    myPowerDelta,
    oppPowerDelta,
    myMoraleDelta,
    oppMoraleDelta,
    consumeCard,
    recoveredCards,
    narratives,
  };
}
