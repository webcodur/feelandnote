import React from 'react'
import { Audio, Sequence, staticFile } from 'remotion'
import { f, ENTER_NAME_SEC, type TimedCue } from './timing'

/**
 * 세력도감 효과음(SFX).
 * - 세력 등장(로고 카드, group 컷) → chime: 새 진영 등장 강조.
 * - 인물 등장(person 컷, 박스 슬라이드 인 시점) → whoosh: 전환 리듬.
 * 음량은 BGM을 덮지 않게 낮게 깐다. 음원은 common/sfx 공용 자산.
 */
const SFX_GROUP = 'common/sfx/chime.wav'
const SFX_PERSON = 'common/sfx/whoosh.wav'
const GROUP_VOL = 0.5
const PERSON_VOL = 0.32
/** 챕터 전환 효과음 음량 — 장 전환 임팩트라 세력 등장보다 살짝 크게 */
const CHAPTER_VOL = 0.6

export const FactionSfx: React.FC<{ cues: TimedCue[] }> = ({ cues }) => (
  <>
    {cues.map((tc, i) => {
      if (tc.cue.kind === 'group') {
        return (
          <Sequence key={`sfx-g-${i}`} from={tc.start} durationInFrames={f(2)}>
            <Audio src={staticFile(SFX_GROUP)} volume={GROUP_VOL} />
          </Sequence>
        )
      }
      if (tc.cue.kind === 'person') {
        // 박스가 옆에서 슬라이드 인하는 시점(ENTER_NAME_SEC)에 맞춰 whoosh
        return (
          <Sequence key={`sfx-p-${i}`} from={tc.start + f(ENTER_NAME_SEC)} durationInFrames={f(1.2)}>
            <Audio src={staticFile(SFX_PERSON)} volume={PERSON_VOL} />
          </Sequence>
        )
      }
      // 챕터 전환 효과음 — 그 챕터의 첫 컷(검정 브릿지, 없으면 표지)에서 1회. 사용자 지정 파일만.
      if (tc.cue.kind === 'chapterBlack' && tc.cue.chapter.sfx) {
        return (
          <Sequence key={`sfx-a-${i}`} from={tc.start} durationInFrames={f(4)}>
            <Audio src={staticFile(`common/sfx/${tc.cue.chapter.sfx}`)} volume={CHAPTER_VOL} />
          </Sequence>
        )
      }
      if (tc.cue.kind === 'chapter' && tc.cue.chapter.sfx && tc.cue.chapter.blackBefore === false) {
        return (
          <Sequence key={`sfx-a-${i}`} from={tc.start} durationInFrames={f(4)}>
            <Audio src={staticFile(`common/sfx/${tc.cue.chapter.sfx}`)} volume={CHAPTER_VOL} />
          </Sequence>
        )
      }
      return null
    })}
  </>
)
