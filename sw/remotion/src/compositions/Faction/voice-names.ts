/**
 * 세력도감(Faction) 음성 파일명·경로 규칙 — **재export 만 한다.**
 *
 * 규칙 본체는 `packages/shared/src/lib/faction-voice-names.ts` 에 있다.
 * 렌더와 BO(src/lib/faction-voice.ts)가 각자 복제하던 것을 한 벌로 합쳤다 —
 * Discourse/voice-names.ts 와 같은 이전 방식이다. 규칙을 고칠 일이 있으면 shared 쪽을 고쳐라.
 */

export {
  vnPersonQuote, vnPersonEpithet,
  vnNarratorLogline, vnNarratorOutro, vnNarratorIntro,
  vnChapterTitle, vnSceneBeat, vnBeatTextKey, vnBeatVoiceFile,
  voiceRelPath, vnTimingKey, dbToLinear, clampRate,
} from '@feelandnote/shared/lib/faction-voice-names'
