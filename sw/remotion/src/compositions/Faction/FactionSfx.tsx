import React from 'react'
import { Audio, Sequence, staticFile } from 'remotion'
import {
  factionSceneBeatSfxStartSec,
  factionSceneTiming,
} from '@feelandnote/shared/lib/faction-scene-timing'
import { beatSfxsOf, f, ENTER_NAME_SEC, sceneBeatsOf, sceneTimingInputOf, type TimedCue } from './timing'
import { dbToLinear } from './voice-names'
import type { FactionSceneSfx } from './types'

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

/**
 * 효과음 한 개의 최종 음량. 기본 음량(SCENE_VOL)에 그 효과음의 dB 게인을 곱한다.
 * 게인이 없으면 기본 음량 그대로다. Remotion Audio는 1을 넘는 volume도 받으므로
 * 백오피스에서 올린 +dB가 렌더에서도 그대로 커진다.
 */
export function sceneSfxVolume(gainDb?: number): number {
  return SCENE_VOL * dbToLinear(gainDb)
}

/**
 * 같은 장면에 속해 이어지는 컷들의 마지막 끝 프레임. 장면을 여는 효과음은 여는 화면이 2~3초로 짧아도
 * 뒤 컷까지 이어져야 한다 — 그 화면 길이로 자르면 소리가 툭 끊긴다.
 */
function sceneRunEnd(cues: TimedCue[], index: number): number {
  const head = cues[index].cue as { groupIndex?: number; clusterIndex?: number }
  let last = index
  for (let j = index + 1; j < cues.length; j++) {
    const next = cues[j].cue as { groupIndex?: number; clusterIndex?: number }
    if (next.groupIndex !== head.groupIndex || next.clusterIndex !== head.clusterIndex) break
    last = j
  }
  return cues[last].start + cues[last].duration
}

/**
 * 효과음 한 벌을 한 화면에 깐다. 시작 위치(%)는 그 화면(span)의 길이를 기준으로 잡고,
 * 재생은 runEnd(장면 끝)까지 최대 8초 이어진다. 장면 시작 효과음과 인물 대사 컷 효과음이 같은 규칙을 쓴다.
 */
const SfxRun: React.FC<{ items: FactionSceneSfx[]; from: number; span: number; runEnd: number; keyPrefix: string }> = ({ items, from, span, runEnd, keyPrefix }) => (
  <>
    {items.map((sfx, i) => {
      if (!sfx.file) return null
      const startSec = factionSceneBeatSfxStartSec(0, span / f(1), sfx.startPercent)
      const start = from + f(startSec)
      return (
        <Sequence key={`${keyPrefix}-${i}-${sfx.file}`} from={start} durationInFrames={Math.max(1, Math.min(runEnd - start, f(8)))}>
          <Audio src={staticFile(`common/sfx/${sfx.file}`)} volume={sceneSfxVolume(sfx.gainDb)} />
        </Sequence>
      )
    })}
  </>
)

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
      // 그룹샷 카드로 열리는 장면 — 카드가 뜨는 순간 장면 효과음을 낸다.
      if (tc.cue.kind === 'cluster') {
        const opening = tc.cue.openingSfxs ?? []
        return opening.length
          ? <SfxRun key={`sfx-c-${i}`} items={opening} from={tc.start} span={tc.duration} runEnd={sceneRunEnd(cues, i)} keyPrefix={`c${i}`} />
          : null
      }
      if (tc.cue.kind === 'person') {
        // 인물 대사 컷은 컷 하나가 곧 이 cue다. 컷 효과음과 (이 컷이 장면을 여는 경우) 장면 효과음을 함께 낸다.
        const opening = tc.cue.openingSfxs ?? []
        const own = tc.cue.beatSfxs ?? []
        return (
          <React.Fragment key={`sfx-p-${i}`}>
            {opening.length ? <SfxRun items={opening} from={tc.start} span={tc.duration} runEnd={sceneRunEnd(cues, i)} keyPrefix={`po${i}`} /> : null}
            {own.length ? <SfxRun items={own} from={tc.start} span={tc.duration} runEnd={sceneRunEnd(cues, i)} keyPrefix={`pb${i}`} /> : null}
            {defaults ? (
              // 박스가 옆에서 슬라이드 인하는 시점(ENTER_NAME_SEC)에 맞춰 whoosh
              <Sequence from={tc.start + f(ENTER_NAME_SEC)} durationInFrames={f(1.2)}>
                <Audio src={staticFile(SFX_PERSON)} volume={PERSON_VOL} />
              </Sequence>
            ) : null}
          </React.Fragment>
        )
      }
      if (tc.cue.kind === 'scene') {
        const scene = tc.cue.scene
        const beats = sceneBeatsOf(scene)
        const sceneTiming = factionSceneTiming(sceneTimingInputOf(scene, captionIdHoldSec))
        const timings = sceneTiming.beats
        const opening = tc.cue.openingSfxs ?? []
        // 여는 화면은 이 장면의 첫 컷이다. 장면 전체 길이를 기준으로 잡으면 「장면 시작」 효과음이 한참 뒤에 난다.
        const openingSpan = f(timings[1]?.startSec ?? sceneTiming.durationSec)
        return (
          <React.Fragment key={`sfx-s-${i}`}>
            {opening.length ? <SfxRun items={opening} from={tc.start} span={openingSpan} runEnd={sceneRunEnd(cues, i)} keyPrefix={`so${i}`} /> : null}
            {scene.sfx ? (
              <Sequence from={tc.start} durationInFrames={Math.min(tc.duration, f(8))}>
                <Audio src={staticFile(`common/sfx/${scene.sfx}`)} volume={SCENE_VOL} />
              </Sequence>
            ) : null}
            {beats.flatMap((beat, beatIndex) => beatSfxsOf(beat).map((sfx, sfxIndex) => {
              if (!sfx.file) return null
              const beatStartSec = timings[beatIndex]?.startSec ?? 0
              const beatEndSec = timings[beatIndex + 1]?.startSec ?? sceneTiming.durationSec
              const requestedFrom = tc.start + f(factionSceneBeatSfxStartSec(
                beatStartSec,
                beatEndSec,
                sfx.startPercent,
              ))
              return (
                <Sequence key={`${beatIndex}-${sfxIndex}-${sfx.file}`} from={requestedFrom} durationInFrames={Math.min(tc.duration, f(8))}>
                  <Audio src={staticFile(`common/sfx/${sfx.file}`)} volume={sceneSfxVolume(sfx.gainDb)} />
                </Sequence>
              )
            }))}
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
