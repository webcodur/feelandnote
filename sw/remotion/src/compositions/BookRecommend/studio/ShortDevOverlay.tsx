/**
 * ShortDevOverlay -- studio-only dev HUD for shorts
 *
 * 하단 SAFE_BOTTOM 영역에 표시:
 * - 현재 세그먼트 라벨 + duration + voice 파일명
 * - 프레임/시간 카운터
 * - 프로그레스 바
 * - 색상 코딩된 타임라인 블록 + 재생 위치
 */
import React from 'react'
import type { ShortSegment, VoiceTimingSegment } from '../types'
import { SHORT_LOGO_FRAMES, FPS } from '../timing'
import { vnShort, vnTimingKey } from '../voice-names'

const SAFE_BOTTOM = 400

interface Props {
  frame: number
  totalFrames: number
  logoStart: number
  logoFrames?: number
  currentSeg: number
  segments: ShortSegment[]
  segStarts: number[]
  segTimings: number[]
  voiceTimings?: Record<string, VoiceTimingSegment[]>
}

const BEAT_COLORS: Record<string, string> = {
  hook: '#c8a46e',
  intro: '#6ea4c8',
  book: '#8bc86e',
  cta: '#c8c86e',
  logo: '#c86ea4',
}

export const ShortDevOverlay: React.FC<Props> = ({
  frame, totalFrames, logoStart, logoFrames, currentSeg,
  segments, segStarts, segTimings, voiceTimings,
}) => {
  const _logoFrames = logoFrames ?? SHORT_LOGO_FRAMES
  const inLogo = frame >= logoStart && frame < logoStart + _logoFrames

  const seg = currentSeg >= 0 ? segments[currentSeg] : null
  const beatLabel = inLogo
    ? 'logo'
    : seg
      ? `Seg ${currentSeg + 1}: ${seg.id}`
      : 'gap'

  const dur = seg?.duration ? `${seg.duration.toFixed(2)}s` : '--'
  const vFile = seg ? vnShort(currentSeg, seg.id) : '--'
  const elapsed = (frame / FPS).toFixed(2)
  const total = (totalFrames / FPS).toFixed(2)

  const beatColor = inLogo
    ? BEAT_COLORS.logo
    : seg ? (BEAT_COLORS[seg.visual] ?? '#c8a46e') : '#888'

  // 타임라인 블록
  type Block = { label: string; start: number; end: number; color: string }
  const blocks: Block[] = segments.map((s, i) => ({
    label: s.visual,
    start: segStarts[i],
    end: segStarts[i] + segTimings[i],
    color: BEAT_COLORS[s.visual] ?? '#888',
  }))
  blocks.push({
    label: 'logo',
    start: logoStart,
    end: logoStart + _logoFrames,
    color: BEAT_COLORS.logo,
  })

  // 자막 미리보기
  let subText = ''
  if (seg && seg.text && seg.visual !== 'cta') {
    const vtKey = vnTimingKey(vnShort(currentSeg, seg.id))
    const vt = voiceTimings?.[vtKey]
    const elapsedFrames = frame - segStarts[currentSeg]
    if (vt && vt.length > 1 && vt.every(t => t.text && t.start != null && t.end != null)) {
      const cur = vt.find(t => {
        const s = Math.round(t.start * FPS)
        const e = Math.round(t.end * FPS)
        return elapsedFrames >= s && elapsedFrames < e
      })
      subText = cur?.text ?? ''
    }
  }

  return (
    <>
      {/* 자막 미리보기 — ShortCaption으로 이동하여 비활성화
      {subText && (
        <div style={{
          position: 'absolute', bottom: SAFE_BOTTOM + 16, left: 40, right: 40, zIndex: 999,
          backgroundColor: 'rgba(0,0,0,0.75)', borderRadius: 8,
          padding: '12px 20px', textAlign: 'center',
        }}>
          <div style={{ color: '#fff', fontSize: 32, fontFamily: 'sans-serif', lineHeight: 1.5 }}>
            {subText}
          </div>
        </div>
      )} */}

      {/* HUD 패널 — 하단 safe zone */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        height: SAFE_BOTTOM, zIndex: 100,
        display: 'flex', flexDirection: 'column',
        justifyContent: 'flex-end',
        padding: '16px 24px',
        pointerEvents: 'none',
      }}>
        <div style={{
          backgroundColor: 'rgba(0,0,0,0.8)',
          borderRadius: 12, padding: '24px 28px',
          display: 'flex', flexDirection: 'column', gap: 12,
          fontFamily: 'monospace', fontSize: 32,
          color: '#ccc',
        }}>
          {/* 세그먼트 정보 */}
          <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ color: beatColor, fontWeight: 700, fontSize: 36 }}>
              {beatLabel}
            </span>
            <span style={{ color: '#888' }}>|</span>
            <span>dur: {dur}</span>
            <span style={{ color: '#888' }}>|</span>
            <span style={{ fontSize: 26, color: '#999' }}>voice: {vFile}</span>
          </div>

          {/* 프레임/시간 */}
          <div style={{ display: 'flex', gap: 16, fontSize: 28, color: '#888' }}>
            <span>frame: {frame}/{totalFrames}</span>
            <span>{elapsed}s / {total}s</span>
          </div>

          {/* 프로그레스 바 */}
          <div style={{
            width: '100%', height: 12, borderRadius: 6,
            backgroundColor: 'rgba(255,255,255,0.1)', marginTop: 4,
          }}>
            <div style={{
              width: `${Math.min(100, (frame / totalFrames) * 100)}%`,
              height: '100%', borderRadius: 3,
              backgroundColor: 'rgba(200,164,110,0.6)',
            }} />
          </div>

          {/* 타임라인 블록 */}
          <div style={{
            position: 'relative', width: '100%', height: 28,
            borderRadius: 4, overflow: 'hidden',
            backgroundColor: 'rgba(255,255,255,0.05)', marginTop: 4,
          }}>
            {blocks.map((b, i) => {
              const pctStart = (b.start / totalFrames) * 100
              const pctWidth = ((b.end - b.start) / totalFrames) * 100
              return (
                <div key={i} style={{
                  position: 'absolute', top: 0, left: `${pctStart}%`,
                  width: `${pctWidth}%`, height: '100%',
                  backgroundColor: b.color, opacity: 0.5,
                  borderRadius: 2,
                }} />
              )
            })}
            <div style={{
              position: 'absolute', top: 0,
              left: `${Math.min(100, (frame / totalFrames) * 100)}%`,
              width: 2, height: '100%',
              backgroundColor: '#fff',
            }} />
          </div>
        </div>
      </div>
    </>
  )
}
