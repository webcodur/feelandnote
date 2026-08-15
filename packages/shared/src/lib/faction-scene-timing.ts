/** 팩션 개별장면의 해설 점등·체류·종료 시간을 렌더러와 BO가 함께 계산하는 SSoT. */

export const FACTION_SCENE_DEFAULT_SEC = 4.5;
export const FACTION_SCENE_MIN_SEC = 2;
/** BO에서 지정할 수 있는 수동 최소 노출 시간의 상한. 자동 계산 길이에는 상한이 없다. */
export const FACTION_SCENE_MAX_MINIMUM_SEC = 15;
export const FACTION_SCENE_CAPTION_CHARS_PER_SEC = 12;
/** 다음 문단으로 넘기기 전에 현재 문단을 완독 상태로 유지하는 시간. */
export const FACTION_SCENE_PARAGRAPH_HOLD_SEC = 0.65;
/** 이전 문단과 다음 문단을 같은 자막 슬롯에서 교차시키는 시간. */
export const FACTION_SCENE_PARAGRAPH_TRANSITION_SEC = 0.3;
export const FACTION_SCENE_POST_CAPTION_HOLD_SEC = 0.9;
export const FACTION_SCENE_EXIT_FADE_SEC = 0.7;
export const FACTION_ENTER_NAME_SEC = 0.2;
export const FACTION_ENTER_FADE_SEC = 0.35;
export const FACTION_SCENE_CAPTION_ID_HOLD_SEC = 1;

export type FactionSceneTimingInput = {
  caption?: string;
  /** 자동 계산보다 더 오래 보여주고 싶을 때 지정하는 최소 노출 시간. */
  durationSec?: number;
  captionIdHoldSec?: number;
};

export type FactionSceneTiming = {
  captionCharCount: number;
  captionStartSec: number;
  captionRevealSec: number;
  captionCompleteSec: number;
  durationSec: number;
};

export type FactionSceneCaptionPageTiming = {
  text: string;
  charCount: number;
  /** 첫 문단 기준 상대 시간. 이 시점부터 새 문단이 페이드인한다. */
  startSec: number;
  /** 글자 점등이 시작되는 첫 문단 기준 상대 시간. */
  revealStartSec: number;
  revealSec: number;
  completeSec: number;
};

/** 빈 줄은 다음 화면, 단일 개행은 같은 화면 안의 줄바꿈으로 해석한다. */
export function factionSceneCaptionPages(caption?: string): string[] {
  if (!caption?.trim()) return [];
  return caption
    .replace(/\r\n?/g, "\n")
    .split(/\n[\t ]*\n+/)
    .map((page) => page.trim())
    .filter(Boolean);
}

/** 화면에는 보이지만 발화·점등 시간을 소비하지 않는 수동 개행을 제외한 글자 수. */
export function factionSceneCaptionCharCount(caption?: string): number {
  if (!caption?.trim()) return 0;
  return Array.from(caption.replace(/\r\n?/g, "\n")).filter(
    (char) => char !== "\n",
  ).length;
}

/**
 * 개별 장면의 문단별 화면 시각. 첫 문단은 바로 점등하고, 이후 문단은
 * 이전 문단 완독 정지 뒤 교차 전환한 다음 점등한다.
 */
export function factionSceneCaptionPageTimings(
  caption?: string,
): FactionSceneCaptionPageTiming[] {
  const pages = factionSceneCaptionPages(caption);
  let cursorSec = 0;

  return pages.map((text, index) => {
    const charCount = factionSceneCaptionCharCount(text);
    const startSec = cursorSec;
    const revealStartSec =
      startSec + (index === 0 ? 0 : FACTION_SCENE_PARAGRAPH_TRANSITION_SEC);
    const revealSec = charCount / FACTION_SCENE_CAPTION_CHARS_PER_SEC;
    const completeSec = revealStartSec + revealSec;
    cursorSec = completeSec + FACTION_SCENE_PARAGRAPH_HOLD_SEC;
    return { text, charCount, startSec, revealStartSec, revealSec, completeSec };
  });
}

function finiteAtLeast(
  value: number | undefined,
  minimum: number,
  fallback: number,
): number {
  return value != null && Number.isFinite(value) && value >= minimum
    ? value
    : fallback;
}

/**
 * 제목 표시 → 해설 점등 → 완독 정지 → 종료 페이드의 전체 시간을 계산한다.
 * 자동 길이에는 상한을 두지 않아 긴 해설도 중간에서 잘리지 않는다.
 */
export function factionSceneTiming(
  input: FactionSceneTimingInput,
): FactionSceneTiming {
  const captionCharCount = factionSceneCaptionCharCount(input.caption);
  const captionPages = factionSceneCaptionPageTimings(input.caption);
  const captionIdHoldSec = finiteAtLeast(
    input.captionIdHoldSec,
    0,
    FACTION_SCENE_CAPTION_ID_HOLD_SEC,
  );
  const captionStartSec =
    FACTION_ENTER_NAME_SEC + FACTION_ENTER_FADE_SEC + captionIdHoldSec;
  const captionRevealSec = captionPages.at(-1)?.completeSec ?? 0;
  const captionCompleteSec = captionStartSec + captionRevealSec;
  const automaticSec =
    captionCharCount > 0
      ? captionCompleteSec +
        FACTION_SCENE_POST_CAPTION_HOLD_SEC +
        FACTION_SCENE_EXIT_FADE_SEC
      : FACTION_SCENE_DEFAULT_SEC;
  const minimumSec = finiteAtLeast(input.durationSec, FACTION_SCENE_MIN_SEC, 0);

  return {
    captionCharCount,
    captionStartSec,
    captionRevealSec,
    captionCompleteSec,
    durationSec: Math.max(FACTION_SCENE_MIN_SEC, automaticSec, minimumSec),
  };
}
