import React from 'react'
import { createPortal } from 'react-dom'
import { Audio, getRemotionEnvironment, interpolate, Sequence, useVideoConfig } from 'remotion'
import { staticFile } from 'remotion'
import type { BgmTrack } from './types'
import { S, PANEL_BG, C_DIM, FONT_UI } from './studio/panel-const'

/** 모듈 레벨 BGM 뮤트 상태 — Remotion 재렌더와 무관하게 유지 */
let bgmMuted = false

/**
 * BGM 트랙 렌더러 — fade in/out + 볼륨 제어.
 * 롱폼·쇼츠 양쪽에서 사용.
 * voiceEndFrame: 대사 오디오가 끝나는 프레임. 이 이후로 BGM 볼륨을 1.0으로 ramp.
 */
export function BgmAudio({ tracks, totalFrames, voiceEndFrame }: {
  tracks: BgmTrack[]
  totalFrames: number
  voiceEndFrame?: number
}) {
  const { fps } = useVideoConfig()

  if (!tracks.length || bgmMuted) return null

  return (
    <>
      {tracks.map((t, i) => {
        const vol = t.volume ?? 0.15
        const fadeInF = Math.round((t.fadeIn ?? 2) * fps)
        const fadeOutF = Math.round((t.fadeOut ?? 3) * fps)
        const fromF = Math.round((t.from ?? 0) * fps)
        const toF = t.to != null ? Math.round(t.to * fps) : totalFrames
        const dur = toF - fromF

        if (dur <= 0) return null

        const startFromF = t.startFrom ? Math.round(t.startFrom * fps) : 0
        const loopEnabled = t.loop !== false
        const trackFramesTotal = t.trackDuration ? Math.round(t.trackDuration * fps) : 0
        // 루프 1회 주기(프레임). startFrom을 뺀 나머지가 실제 1회 재생 길이
        const loopCycleF = trackFramesTotal > startFromF ? trackFramesTotal - startFromF : 0
        const shouldLoop = loopEnabled && loopCycleF > 0 && dur > loopCycleF

        // 페이드 볼륨 — 구간 전체(dur) 기준으로 계산. 루프 회차별로 globalF 보정
        // voiceEndFrame 이후 0.5초 동안 vol → 1.0으로 ramp
        const rampF = Math.round(0.5 * fps)
        const makeVolume = (segStart: number) => (lf: number) => {
          const globalF = segStart + lf
          const targetVol = (voiceEndFrame != null && globalF > voiceEndFrame)
            ? interpolate(globalF, [voiceEndFrame, voiceEndFrame + rampF], [vol, 1.0], { extrapolateRight: 'clamp', extrapolateLeft: 'clamp' })
            : vol
          const fadeInMult = fadeInF > 0 ? interpolate(globalF, [0, fadeInF], [0, 1], { extrapolateRight: 'clamp' }) : 1
          const fadeOutMult = fadeOutF > 0 ? interpolate(globalF, [dur - fadeOutF, dur], [1, 0], { extrapolateLeft: 'clamp' }) : 1
          return targetVol * Math.min(fadeInMult, fadeOutMult)
        }

        // 루프: 필요한 횟수만큼 Sequence로 직접 배치 (fadeIn/fadeOut이 전역 기준으로 정확히 작동)
        if (shouldLoop) {
          const loopCount = Math.ceil(dur / loopCycleF)
          return (
            <Sequence key={`bgm-${i}`} from={fromF} durationInFrames={dur}>
              {Array.from({ length: loopCount }, (_, li) => {
                const segStart = li * loopCycleF
                const segDur = Math.min(loopCycleF, dur - segStart)
                return (
                  <Sequence key={`lp-${li}`} from={segStart} durationInFrames={segDur}>
                    <Audio
                      src={staticFile(t.file)}
                      volume={makeVolume(segStart)}
                      startFrom={startFromF}
                    />
                  </Sequence>
                )
              })}
            </Sequence>
          )
        }

        // 단일 재생
        return (
          <Sequence key={`bgm-${i}`} from={fromF} durationInFrames={dur}>
            <Audio
              src={staticFile(t.file)}
              volume={makeVolume(0)}
              startFrom={startFromF}
            />
          </Sequence>
        )
      })}
    </>
  )
}

/**
 * Studio 전용 BGM 토글 버튼 — 렌더링 시에는 표시하지 않는다.
 * SubEditor/PromptPanel과 동일한 viewport 좌표계(createPortal + position fixed).
 * 배치: SubEditor(16L) → Prompts(70L) → BGM(124L)
 */
const L = S / 2
const BGM_BTN_RIGHT = 16 * L
/** PromptPanel 버튼(top 70L) + 버튼 높이(~42L) + 간격(12L) */
const BGM_BTN_TOP = 124 * L

export function BgmToggle({ hasBgm }: { hasBgm: boolean }) {
  const [muted, setMuted] = React.useState(bgmMuted)

  if (getRemotionEnvironment().isRendering || !hasBgm) return null

  const toggle = () => {
    bgmMuted = !bgmMuted
    setMuted(bgmMuted)
  }

  return createPortal(
    <div style={{
      position: 'fixed', top: BGM_BTN_TOP, right: BGM_BTN_RIGHT,
      zIndex: 9997,
      display: 'flex', gap: 8 * L,
    }}>
      <button
        onClick={toggle}
        style={{
          background: PANEL_BG,
          border: `${Math.max(1, Math.round(L))}px solid ${muted ? 'rgba(255,100,100,0.4)' : 'rgba(255,255,255,0.08)'}`,
          borderRadius: 10 * L,
          padding: `${8 * L}px ${16 * L}px`,
          cursor: 'pointer',
          fontFamily: FONT_UI,
          fontSize: 14 * L,
          color: muted ? 'rgba(255,100,100,0.8)' : C_DIM,
          letterSpacing: 0.5,
          transition: 'all 0.15s',
        }}
      >
        BGM {muted ? 'OFF' : 'ON'}
      </button>
    </div>,
    document.body,
  )
}
