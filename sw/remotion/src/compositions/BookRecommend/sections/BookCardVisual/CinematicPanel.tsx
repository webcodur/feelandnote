/** CinematicPanel — 시네마틱 이미지 크로스페이드 + Studio placeholder
 *
 * book.images 텍스트 앵커 기반 N장 전환
 */
import React, { useEffect, useMemo, useState } from 'react'
import { Img, interpolate, useCurrentFrame, staticFile, getRemotionEnvironment } from 'remotion'
import type { BookEntry, ImageTransition } from '../../types'
import { FONT } from '../../fonts'
import { f } from '../../timing'
import { DARK } from '../../../theme'
import { episodeDir } from '../../script'

const CL = { extrapolateLeft: 'clamp' as const, extrapolateRight: 'clamp' as const }

/** 페이지 로드(HMR) 시마다 갱신 — 동일 파일명 교체 시 캐시 무효화 */
const CACHE_BUST = Date.now()

/** 크로스페이드 지속 시간 (프레임) */
const CROSSFADE_F = f(0.67)

// ── 이미지 경로 헬퍼 ──

function cinemImgByFile(episodeName: string, file: string): string {
  const dir = episodeDir[episodeName] ?? `todo/${episodeName}`
  return `${staticFile(`episodes/${dir}/images/${file}`)}?v=${CACHE_BUST}`
}

// ── 이미지 로드 훅 ──

/** 파일 경로 배열로 이미지 로드 — 각 파일 로드 완료 시 즉시 반영 */
function useImageSources(episodeName: string, files: string[]): Record<string, string> {
  const [sources, setSources] = useState<Record<string, string>>({})
  const key = files.join(',')
  useEffect(() => {
    if (files.length === 0) return
    let cancelled = false
    for (const file of files) {
      const url = cinemImgByFile(episodeName, file)
      const img = new Image()
      img.src = url
      img.onload = () => {
        if (!cancelled) setSources(prev => ({ ...prev, [file]: url }))
      }
    }
    return () => { cancelled = true }
  }, [episodeName, key])
  return sources
}

// ── Studio 플레이스홀더 ──

function getPromptText(book: BookEntry, slot: 'summary' | 'context'): string {
  if (!book.images?.length) return `"${book.title}" — 프롬프트 미작성`
  const idx = slot === 'summary' ? 0 : Math.min(1, book.images.length - 1)
  const img = book.images[idx]
  const text = img.ko ?? img.prompt
  return text ? `[${idx + 1}] ${img.keyword ?? book.title}\n${text}` : `[${idx + 1}] "${book.title}" — 프롬프트 미작성`
}

// ── 컴포넌트 ──

type Props = {
  episodeName: string
  book: BookEntry
  /** 경위 라벨 시작 프레임 (Studio placeholder summary/context 판별용) */
  sLabelContext: number
  /** 텍스트 앵커 기반 이미지 전환 — book.images 사용 시 BookCardVisual이 계산하여 전달 */
  imageTransitions?: ImageTransition[]
}

export const CinematicPanel: React.FC<Props> = ({ episodeName, book, sLabelContext, imageTransitions }) => {
  const frame = useCurrentFrame()
  const isStudio = !getRemotionEnvironment().isRendering

  const baseName = episodeName.replace(/-en$/, '').replace(/-\d+$/, '')
  const useNewMode = !!(imageTransitions && imageTransitions.length > 0)

  // --- 파일 경로 기반 로드 ---
  const newFiles = useMemo(() => imageTransitions?.map(t => t.file) ?? [], [imageTransitions])
  const newSources = useImageSources(baseName, newFiles)

  const imgStyle: React.CSSProperties = { width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center center' }

  // --- 렌더링 결정 ---
  let imageLayer: React.ReactNode = null
  let hasAnyImage = false

  if (useNewMode) {
    const transitions = imageTransitions!
    const currentIdx = transitions.reduce<number>((acc, t, i) => frame >= t.frame ? i : acc, 0)
    const currentFile = transitions[currentIdx].file
    const prevIdx = currentIdx > 0 ? currentIdx - 1 : -1
    const prevFile = prevIdx >= 0 ? transitions[prevIdx].file : null
    const transitionFrame = transitions[currentIdx].frame
    const isCrossfading = currentIdx > 0 && frame < transitionFrame + CROSSFADE_F
    const crossfadeOp = currentIdx > 0
      ? interpolate(frame, [transitionFrame, transitionFrame + CROSSFADE_F], [0, 1], CL)
      : 1

    hasAnyImage = Object.keys(newSources).length > 0

    imageLayer = (
      <>
        {isCrossfading && prevFile && newSources[prevFile] && (
          <div style={{ position: 'absolute', inset: 0 }}>
            <Img src={newSources[prevFile]} style={imgStyle} />
          </div>
        )}
        {newSources[currentFile] && (
          <div style={{ position: 'absolute', inset: 0, opacity: crossfadeOp }}>
            <Img src={newSources[currentFile]} style={imgStyle} />
          </div>
        )}
      </>
    )
  }

  return (
    <div style={{
      position: 'absolute', inset: 0,
      borderRadius: 12, overflow: 'hidden',
      background: DARK.mid,
    }}>
      {imageLayer}
      {hasAnyImage && (
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 50% 50%, transparent 40%, rgba(10,10,10,0.5) 100%)' }} />
      )}
      {isStudio && !useNewMode && (
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
