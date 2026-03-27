/** CinematicPanel — 시네마틱 이미지 크로스페이드 + Studio placeholder */
import React from 'react'
import { Img, interpolate, useCurrentFrame, staticFile, getRemotionEnvironment } from 'remotion'
import type { BookEntry } from '../../types'
import { FONT } from '../../fonts'
import { f } from '../../timing'
import { DARK } from '../../../theme'

const CL = { extrapolateLeft: 'clamp' as const, extrapolateRight: 'clamp' as const }

const R2_IMAGE_BASE = 'https://pub-048f29057fc54fa5b2927db8f167b305.r2.dev/remotion/images'

/** 시네마틱 이미지가 있는 에피소드 목록 (로컬 파일 기반, imageId 없는 레거시용) */
export const CINEMATIC_EPISODES = new Set(['elon-musk', 'marcus-aurelius', 'dario-amodei', 'abraham-lincoln', 'alexander-the-great'])

function cinemImg(episodeName: string, bookIdx: number, slot: 's' | 'c', imageId?: string): string {
  if (imageId) return `${R2_IMAGE_BASE}/${imageId}.jpg`
  return staticFile(`images/episodes/${episodeName}/${bookIdx + 1}-${slot}.jpg`)
}

function getPromptText(book: BookEntry, slot: 'summary' | 'context'): string {
  const key = slot === 'summary' ? 's' : 'c'
  const ip = book.imagePrompts?.[key]
  const text = ip?.ko ?? ip?.prompt
  if (text) return `[${key.toUpperCase()}] ${ip.keyword ?? book.title}\n${text}`
  const title = book.title
  if (slot === 'summary') {
    return `[S] "${title}" — 프롬프트 미작성`
  }
  return `[C] "${title}" — 프롬프트 미작성`
}

type Props = {
  episodeName: string
  bookIndex: number
  book: BookEntry
  /** 경위 라벨 시작 프레임 (크로스페이드 기준) */
  sLabelContext: number
}

export const CinematicPanel: React.FC<Props> = ({ episodeName, bookIndex, book, sLabelContext }) => {
  const frame = useCurrentFrame()
  const isStudio = !getRemotionEnvironment().isRendering

  const baseName = episodeName.replace(/-en$/, '').replace(/-\d+$/, '')
  const hasImageId = !!(book.imagePrompts?.s?.imageId || book.imagePrompts?.c?.imageId)
  const hasCinematic = hasImageId || CINEMATIC_EPISODES.has(baseName)

  const cinemSlot = hasCinematic ? (frame < sLabelContext ? 's' : 'c') : null
  const cinemPrevSlot = hasCinematic ? (frame < sLabelContext ? null : 's') : null
  const cinemCrossfade = interpolate(frame, [sLabelContext, sLabelContext + f(0.67)], [0, 1], CL)

  return (
    <div style={{
      height: '100%', aspectRatio: '16 / 9', position: 'relative',
      borderRadius: 12, overflow: 'hidden',
      background: hasCinematic ? undefined : DARK.mid,
    }}>
      {hasCinematic && cinemPrevSlot && cinemSlot !== cinemPrevSlot && (
        <div style={{ position: 'absolute', inset: 0 }}>
          <Img src={cinemImg(baseName, bookIndex, cinemPrevSlot, book.imagePrompts?.[cinemPrevSlot]?.imageId)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>
      )}
      {hasCinematic && cinemSlot && (
        <div style={{
          position: 'absolute', inset: 0,
          opacity: cinemPrevSlot && cinemSlot !== cinemPrevSlot ? cinemCrossfade : 1,
        }}>
          <Img src={cinemImg(baseName, bookIndex, cinemSlot, book.imagePrompts?.[cinemSlot]?.imageId)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>
      )}
      {hasCinematic && (
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 50% 50%, transparent 40%, rgba(10,10,10,0.5) 100%)' }} />
      )}
      {!hasCinematic && isStudio && (
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 24, border: '2px dashed rgba(200,164,110,0.3)', borderRadius: 12,
        }}>
          <div style={{
            color: '#c8a46e', fontSize: 36, fontFamily: FONT.sans,
            textAlign: 'left', lineHeight: 1.5, opacity: 0.7, whiteSpace: 'pre-wrap',
          }}>
            {getPromptText(book, frame < sLabelContext ? 'summary' : 'context')}
          </div>
        </div>
      )}
    </div>
  )
}
