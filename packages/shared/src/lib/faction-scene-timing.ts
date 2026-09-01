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
export const FACTION_SCENE_SFX_START_PERCENT_MIN = 0;
export const FACTION_SCENE_SFX_START_PERCENT_MAX = 100;
export const FACTION_SCENE_SFX_START_PERCENT_STEP = 1;

/**
 * 장면 안에서 순서대로 흐르는 한 컷.
 * 화자(speaker)가 있으면 그 인물이 말하는 대사, 본문만 있으면 나레이터 해설이다.
 * 해설만·대사만·둘 다·여러 인물이 주고받기·말 없는 이미지 컷이 전부 이 배열 하나로 표현된다.
 */
export type FactionSceneBeatInput = {
  /** 화자 이름. 없으면 해설이며 장면 제목이 이름 자리를 지킨다. 셀럽 등록과 무관한 자유 문자열이다. */
  speaker?: string;
  /** 해설 컷의 제 라벨. 있으면 장면명 대신 이 문구가 이름 자리에 뜬다. */
  label?: string;
  /** true면 이 컷에서는 화자명·장면명을 이름 자리에 띄우지 않는다. */
  hideIdentity?: boolean;
  /** 화면에 뜨고 낭독되는 본문. 빈 줄로 나누면 같은 덩어리 안에서 화면이 넘어간다. */
  text?: string;
  /** 이 덩어리 음성의 재생 길이(초, 배속 반영 후). 있으면 글자 점등을 이 길이에 맞춘다. */
  voiceSec?: number;
  /** 말 없는 화면 컷 또는 구 장면 한 벌에서 승격된 항목의 최소 노출 시간. */
  minimumSec?: number;
};

export type FactionSceneTimingInput = {
  caption?: string;
  /** 자동 계산보다 더 오래 보여주고 싶을 때 지정하는 최소 노출 시간. */
  durationSec?: number;
  captionIdHoldSec?: number;
  /**
   * 해설 낭독 음원의 재생 길이(초, 배속 반영 후). 있으면 글자 점등을 글자 수 추정 대신
   * 이 길이에 맞춘다. 문단 사이 정지·교차 시간도 낭독 안에 이미 들어 있다고 보고 차감한다.
   * 덩어리(beats)를 쓰면 덩어리별 voiceSec 이 이 값을 대신한다.
   */
  voiceSec?: number;
  /**
   * 장면을 이루는 덩어리들. 비어 있으면 caption 한 벌을 해설 덩어리 하나로 본다(구 데이터 호환).
   * 장면 제목은 첫 덩어리 앞에서 한 번 뜨고, 화자가 바뀌는 덩어리마다 이름 자리가 새로 뜬다.
   */
  beats?: FactionSceneBeatInput[];
};

export type FactionSceneTiming = {
  captionCharCount: number;
  captionStartSec: number;
  captionRevealSec: number;
  captionCompleteSec: number;
  durationSec: number;
  /** 덩어리별 화면 시각. 구 데이터(caption 한 벌)도 덩어리 하나로 정규화돼 여기 들어온다. */
  beats: FactionSceneBeatTiming[];
};

/** 한 덩어리의 화면 시각. 모든 값은 장면 시작 기준 상대 초다. */
export type FactionSceneBeatTiming = {
  /** 이름 자리에 뜰 문구. 화자가 있으면 화자, 없으면 장면 제목이 그 자리를 지킨다(빈 문자열이면 제목 사용). */
  speaker: string;
  text: string;
  /**
   * 이름 자리를 새로 띄우는 덩어리인가. 첫 덩어리와, 앞 덩어리와 화자가 다른 대사 덩어리가 해당한다.
   * 첫 덩어리가 아닌 해설은 제 라벨이 있을 때만 해당한다(장면명을 다시 띄우지 않는다).
   * 같은 화자가 이어 말하면 이름을 다시 띄우지 않고 본문만 교체한다.
   */
  showsIdentity: boolean;
  /** 덩어리가 시작되는 시각(이름 등장 또는 본문 교차 시작). */
  startSec: number;
  /** 본문이 뜨기 시작하는 시각. */
  textStartSec: number;
  /** 본문 안의 문단별 시각 — textStartSec 기준 상대. */
  pages: FactionSceneCaptionPageTiming[];
  /** 본문 완독 시각. */
  completeSec: number;
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

/** 문단 사이에 들어가는 완독 정지 + 교차 전환의 합계(초). 문단이 하나면 0이다. */
function paragraphOverheadSec(pageCount: number): number {
  return pageCount > 1
    ? (pageCount - 1) *
        (FACTION_SCENE_PARAGRAPH_HOLD_SEC + FACTION_SCENE_PARAGRAPH_TRANSITION_SEC)
    : 0;
}

/**
 * 서사 항목의 문단별 화면 시각. 첫 문단은 바로 점등하고, 이후 문단은
 * 이전 문단 완독 정지 뒤 교차 전환한 다음 점등한다.
 *
 * 해설 낭독 음원 길이(voiceSec)를 주면 점등 속도를 글자 수 추정 대신 낭독에 맞춘다.
 * 낭독에는 문단 사이 쉼도 포함돼 있으므로 정지·교차 시간을 먼저 빼고, 남은 시간을
 * 문단별 글자 수에 비례해 나눈다. 마지막 문단 완독 시점이 낭독 끝과 거의 일치한다.
 */
export function factionSceneCaptionPageTimings(
  caption?: string,
  voiceSec?: number,
): FactionSceneCaptionPageTiming[] {
  const pages = factionSceneCaptionPages(caption);
  const charCounts = pages.map((text) => factionSceneCaptionCharCount(text));
  const totalChars = charCounts.reduce((sum, n) => sum + n, 0);
  const usesVoice =
    voiceSec != null && Number.isFinite(voiceSec) && voiceSec > 0 && pages.length > 0;
  // 낭독이 문단 사이 쉼보다도 짧으면 점등할 시간이 없어진다. 문단당 최소 점등 시간을 보장한다.
  const revealTotalSec = usesVoice
    ? Math.max(voiceSec - paragraphOverheadSec(pages.length), 0.3 * pages.length)
    : 0;
  let cursorSec = 0;

  return pages.map((text, index) => {
    const charCount = charCounts[index];
    const startSec = cursorSec;
    const revealStartSec =
      startSec + (index === 0 ? 0 : FACTION_SCENE_PARAGRAPH_TRANSITION_SEC);
    const revealSec = usesVoice
      ? revealTotalSec *
        (totalChars > 0 ? charCount / totalChars : 1 / pages.length)
      : charCount / FACTION_SCENE_CAPTION_CHARS_PER_SEC;
    const completeSec = revealStartSec + revealSec;
    cursorSec = completeSec + FACTION_SCENE_PARAGRAPH_HOLD_SEC;
    return { text, charCount, startSec, revealStartSec, revealSec, completeSec };
  });
}

/** 뺄셈으로 유도한 초 값의 부동소수점 찌꺼기를 정리한다. 마이크로초 미만은 화면·음성 어디에도 의미가 없다. */
function tidySec(sec: number): number {
  return Math.round(sec * 1e6) / 1e6;
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

export function normalizeFactionSceneSfxStartPercent(
  value?: number,
): number {
  if (value == null || !Number.isFinite(value)) {
    return FACTION_SCENE_SFX_START_PERCENT_MIN;
  }
  return Math.min(
    FACTION_SCENE_SFX_START_PERCENT_MAX,
    Math.max(FACTION_SCENE_SFX_START_PERCENT_MIN, Math.round(value)),
  );
}

// 현재 컷 구간 안에서 선택한 진행률을 장면 시작 기준 초로 바꾼다.
export function factionSceneBeatSfxStartSec(
  beatStartSec: number,
  beatEndSec: number,
  startPercent?: number,
): number {
  const start = finiteAtLeast(beatStartSec, 0, 0);
  const end = finiteAtLeast(beatEndSec, start, start);
  const percent = normalizeFactionSceneSfxStartPercent(startPercent);
  return tidySec(start + (end - start) * percent / 100);
}

/**
 * 장면을 이루는 덩어리 배열로 정규화한다.
 * `beats`가 있으면 내용이 있는 것만 추리고, 없으면 구 데이터의 `caption` 한 벌을 해설 덩어리 하나로 본다.
 * 그래서 덩어리를 쓰지 않는 기존 장면도 계산 경로가 완전히 같다.
 */
export function factionSceneBeatsOf(
  input: FactionSceneTimingInput,
): FactionSceneBeatInput[] {
  const beats = input.beats?.filter(
    // minimumSec가 있는 빈 항목은 말 없는 화면 컷이다. 본문이 없다는 이유로 버리면
    // 다음 대사의 사진·타이밍 인덱스가 당겨지고 컷 자체도 재생되지 않는다.
    (b) => !!b && (!!b.text?.trim() || !!b.speaker?.trim() || !!b.minimumSec),
  );
  if (beats?.length) return beats;
  if (!input.caption?.trim()) return [];
  return [{ text: input.caption, voiceSec: input.voiceSec }];
}

/**
 * 덩어리별 화면 시각. 이름 자리는 첫 덩어리와 화자가 바뀌는 덩어리에서만 새로 뜨고,
 * 같은 화자가 이어 말하면 본문만 교차로 교체된다. 첫 덩어리가 아닌 해설은 제 라벨이 있을 때만
 * 이름 자리를 띄운다 — 장면명은 장면 시작에 한 번만 뜬다.
 */
export function factionSceneBeatTimings(
  input: FactionSceneTimingInput,
): FactionSceneBeatTiming[] {
  const beats = factionSceneBeatsOf(input);
  const captionIdHoldSec = finiteAtLeast(
    input.captionIdHoldSec,
    0,
    FACTION_SCENE_CAPTION_ID_HOLD_SEC,
  );
  const identityLeadSec =
    FACTION_ENTER_NAME_SEC + FACTION_ENTER_FADE_SEC + captionIdHoldSec;

  let cursorSec = 0;
  let lastShownSpeaker: string | null = null;

  return beats.map((beat, index) => {
    const speaker = (beat.speaker ?? "").trim();
    const label = (beat.label ?? "").trim();
    // 대사는 화자가 바뀔 때 이름을 띄운다. 해설(화자 없음)은 제 이름이 없어 장면명을 띄우는데,
    // 장면 첫 덩어리에서 한 번이면 된다 — 대사 뒤에 해설이 이어진다고 장면명을 다시 띄우면
    // 이미 지나간 제목이 되돌아온 것처럼 보인다. 해설에 제 라벨이 있을 때만 그 라벨을 띄운다.
    const showsIdentity = beat.hideIdentity !== true
      && (index === 0 || (speaker ? speaker !== lastShownSpeaker : !!label));
    // 해설을 지나면 다음 화자는 같은 사람이라도 이름을 다시 띄운다 — 사이에 이름 없는 본문이 있었다.
    if (showsIdentity || !speaker) lastShownSpeaker = speaker;

    const startSec = cursorSec;
    const textStartSec =
      startSec +
      (showsIdentity ? identityLeadSec : FACTION_SCENE_PARAGRAPH_TRANSITION_SEC);
    const pages = factionSceneCaptionPageTimings(beat.text, beat.voiceSec);
    const completeSec = textStartSec + (pages.at(-1)?.completeSec ?? 0);
    cursorSec = Math.max(
      completeSec + FACTION_SCENE_PARAGRAPH_HOLD_SEC,
      startSec + finiteAtLeast(beat.minimumSec, FACTION_SCENE_MIN_SEC, 0),
    );

    return {
      speaker,
      text: beat.text ?? "",
      showsIdentity,
      startSec,
      textStartSec,
      pages,
      completeSec,
    };
  });
}

/**
 * 이름 표시 → 본문 점등 → 완독 정지 → 종료 페이드의 전체 시간을 계산한다.
 * 덩어리가 여럿이면 그 흐름을 모두 담는다. 자동 길이에는 상한을 두지 않아 긴 장면도 중간에서 잘리지 않는다.
 */
export function factionSceneTiming(
  input: FactionSceneTimingInput,
): FactionSceneTiming {
  const beats = factionSceneBeatsOf(input);
  const beatTimings = factionSceneBeatTimings(input);
  const captionCharCount = beats.reduce(
    (sum, beat) => sum + factionSceneCaptionCharCount(beat.text),
    0,
  );
  const captionIdHoldSec = finiteAtLeast(
    input.captionIdHoldSec,
    0,
    FACTION_SCENE_CAPTION_ID_HOLD_SEC,
  );
  const captionStartSec =
    beatTimings[0]?.textStartSec ??
    FACTION_ENTER_NAME_SEC + FACTION_ENTER_FADE_SEC + captionIdHoldSec;
  const captionCompleteSec = beatTimings.at(-1)?.completeSec ?? captionStartSec;
  const captionRevealSec = tidySec(captionCompleteSec - captionStartSec);
  const automaticSec =
    captionCharCount > 0
      ? captionCompleteSec +
        FACTION_SCENE_POST_CAPTION_HOLD_SEC +
        FACTION_SCENE_EXIT_FADE_SEC
      : FACTION_SCENE_DEFAULT_SEC;
  const minimumSec = finiteAtLeast(input.durationSec, FACTION_SCENE_MIN_SEC, 0);
  // 점등 하한 때문에 문단 계산이 음성보다 짧아질 수 있다. 어떤 덩어리의 음성도 잘리지 않도록 바닥을 깐다.
  const voiceEndSec = beatTimings.reduce((max, timing, index) => {
    const voiceSec = finiteAtLeast(beats[index]?.voiceSec, 0, 0);
    if (voiceSec <= 0) return max;
    const end =
      timing.textStartSec +
      voiceSec +
      FACTION_SCENE_POST_CAPTION_HOLD_SEC +
      FACTION_SCENE_EXIT_FADE_SEC;
    return Math.max(max, end);
  }, 0);

  return {
    captionCharCount,
    captionStartSec,
    captionRevealSec,
    captionCompleteSec,
    durationSec: Math.max(
      FACTION_SCENE_MIN_SEC,
      automaticSec,
      minimumSec,
      voiceEndSec,
    ),
    beats: beatTimings,
  };
}
