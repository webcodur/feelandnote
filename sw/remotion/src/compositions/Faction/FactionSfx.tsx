import React from 'react'
import { Audio, Sequence, staticFile } from 'remotion'
import {
  factionSceneBeatSfxStartSec,
  factionSceneTiming,
} from '@feelandnote/shared/lib/faction-scene-timing'
import { f, ENTER_NAME_SEC, sceneBeatsOf, sceneTimingInputOf, type TimedCue } from './timing'

/**
 * 세력도감 효과음(SFX).
 * - 서사 항목·챕터 → 데이터에 지정한 음원만 재생한다(항상 켜짐).
 * - 세력 등장(group)·인물 등장(person) 기본 효과음은 `defaults`를 켤 때만 깐다.
 *   기본이 꺼진 이유: 이 컴포넌트가 오래 배선되지 않아 어느 편에도 그 소리가 없었고,
 *   배선하면서 켜면 모든 에피소드에 없던 chime·whoosh가 한꺼번에 생긴다.
 *   또 group 컷에는 `script.groupSfx`(Faction.tsx)라는 별도 경로가 이미 있어 겹친다.
 * 음량은 BGM을 덮지 않게 낮게 깐다. 음원은 common/sfx 공용 자산.
 */
const SFX_GROUP = 'common/sfx/chime.wav'
const SFX_PERSON = 'common/sfx/whoosh.wav'
const GROUP_VOL = 0.5
const PERSON_VOL = 0.32
/** 챕터 전환 효과음 음량 — 장 전환 임팩트라 세력 등장보다 살짝 크게 */
const CHAPTER_VOL = 0.6
/** 서사 항목은 선택한 환경음·효과음만 사용한다. */
const SCENE_VOL = 0.5

export const FactionSfx: React.FC<{ cues: TimedCue[]; defaults?: boolean; captionIdHoldSec?: number }> = ({ cues, defaults = false, captionIdHoldSec }) => (
  <>
    {cues.map((tc, i) => {
      if (tc.cue.kind === 'group' && defaults) {
        return (
          <Sequence key={`sfx-g-${i}`} from={tc.start} durationInFrames={f(2)}>
            <Audio src={staticFile(SFX_GROUP)} volume={GROUP_VOL} />
          </Sequence>
        )
      }
      if (tc.cue.kind === 'person' && defaults) {
        // 박스가 옆에서 슬라이드 인하는 시점(ENTER_NAME_SEC)에 맞춰 whoosh
        return (
          <Sequence key={`sfx-p-${i}`} from={tc.start + f(ENTER_NAME_SEC)} durationInFrames={f(1.2)}>
            <Audio src={staticFile(SFX_PERSON)} volume={PERSON_VOL} />
          </Sequence>
        )
      }
      if (tc.cue.kind === 'scene') {
        const scene = tc.cue.scene
        const beats = sceneBeatsOf(scene)
        const sceneTiming = factionSceneTiming(sceneTimingInputOf(scene, captionIdHoldSec))
        const timings = sceneTiming.beats
        return (
          <React.Fragment key={`sfx-s-${i}`}>
            {scene.sfx ? (
              <Sequence from={tc.start} durationInFrames={Math.min(tc.duration, f(8))}>
                <Audio src={staticFile(`common/sfx/${scene.sfx}`)} volume={SCENE_VOL} />
              </Sequence>
            ) : null}
            {beats.map((beat, beatIndex) => {
              if (!beat.sfx) return null
              const beatStartSec = timings[beatIndex]?.startSec ?? 0
              const beatEndSec = timings[beatIndex + 1]?.startSec ?? sceneTiming.durationSec
              const requestedFrom = tc.start + f(factionSceneBeatSfxStartSec(
                beatStartSec,
                beatEndSec,
                beat.sfxStartPercent,
              ))
              return (
                <Sequence key={`${beatIndex}-${beat.sfx}`} from={requestedFrom} durationInFrames={Math.min(tc.duration, f(8))}>
                  <Audio src={staticFile(`common/sfx/${beat.sfx}`)} volume={SCENE_VOL} />
                </Sequence>
              )
            })}
          </React.Fragment>
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
