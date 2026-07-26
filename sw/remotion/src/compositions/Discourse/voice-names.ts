/**
 * 가상 담화(Discourse) 음성 파일명·경로 규칙 — **재export 만 한다.**
 *
 * 규칙 본체는 `packages/shared/src/lib/discourse-voice-names.ts` 로 올렸다(26.07.26).
 * 렌더와 BO 가 각자 복제하던 96줄을 한 벌로 합친 것이다 — 복제본은 어긋나고, 어긋남은 음원이
 * 다 만들어진 뒤에야 소리로 드러난다. 규칙을 고칠 일이 있으면 shared 쪽을 고쳐라.
 */

export {
  vnSafeSlug, vnTurn, vnCastEpithet, voiceRelPath, vnTimingKey,
  dbToLinear, clampRate, turnVoiceFile, vnVerify,
} from '@feelandnote/shared/lib/discourse-voice-names'
