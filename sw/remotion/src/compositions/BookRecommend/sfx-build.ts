import type { SfxItem, VoiceTimingSegment } from './types'
import { resolveAnchorTime } from './anchor-resolve'
import type { SfxRenderItem } from './sections/SfxAudioLayer'

/** SFX 큐 리졸브에 필요한 한 음성 구간 정보. */
export interface SfxSection {
  /** voiceTimings 키 (확장자 제외, 예: 'A1-service-greeting' / 'D01b-summary'). */
  timingsKey: string
  /** 자막·발화 텍스트(앵커 매칭 폴백용) */
  text: string
  /** 이 구간의 절대 시작 프레임. */
  startFrame: number
  /** 이 구간의 총 프레임 길이(앵커 위치 비율 폴백 계산용). */
  durationFrames: number
  /** 사용자 지정 SFX 큐 목록. */
  sfx?: SfxItem[]
  /** 큐 key 접두사 (충돌 방지) */
  keyPrefix: string
}

/** 모든 구간의 SFX를 렌더용 형태로 변환. timings 키가 없거나 sfx가 없으면 자동 skip. */
export function buildSfxRenderItems(opts: {
  sections: SfxSection[]
  voiceTimings?: Record<string, VoiceTimingSegment[]>
  fps: number
  /** SFX 파일 경로 해석기 — sx.file이 'episodes/'로 시작하면 그대로, 아니면 sfxBase prefix를 붙인다.
   *  반환값은 staticFile()로 감싼 최종 src. */
  resolveSrc: (file: string) => string
}): SfxRenderItem[] {
  const items: SfxRenderItem[] = []
  for (const section of opts.sections) {
    const list = section.sfx ?? []
    if (list.length === 0) continue
    const timings = opts.voiceTimings?.[section.timingsKey]
    const segDurSec = section.durationFrames / opts.fps
    list.forEach((sx, sIdx) => {
      const offset = Number.isFinite(sx.offset) ? (sx.offset as number) : 0
      let baseSec = 0
      if (sx.text) {
        const resolved = resolveAnchorTime({
          anchorText: sx.text, segText: section.text,
          segDurSec, timings,
        })
        if (resolved != null) baseSec = resolved
      }
      const tSec = baseSec + offset
      const startFrame = Math.max(0, section.startFrame + Math.round(tSec * opts.fps))
      const src = opts.resolveSrc(sx.file)
      const durSec = (Number.isFinite(sx.duration) && (sx.duration as number) > 0) ? (sx.duration as number) : null
      const fadeInSec = (Number.isFinite(sx.fadeIn) && (sx.fadeIn as number) > 0) ? (sx.fadeIn as number) : 0
      const fadeOutSec = (Number.isFinite(sx.fadeOut) && (sx.fadeOut as number) > 0) ? (sx.fadeOut as number) : 0
      const durationFrames = durSec != null ? Math.max(1, Math.round(durSec * opts.fps)) : null
      const fadeInFrames = durationFrames != null
        ? Math.min(Math.round(fadeInSec * opts.fps), durationFrames)
        : Math.round(fadeInSec * opts.fps)
      const fadeOutFrames = durationFrames != null
        ? Math.min(Math.round(fadeOutSec * opts.fps), durationFrames)
        : 0
      items.push({
        src, startFrame,
        volume: sx.volume ?? 0.7,
        durationFrames, fadeInFrames, fadeOutFrames,
        key: `${section.keyPrefix}-${sIdx}`,
      })
    })
  }
  return items
}
