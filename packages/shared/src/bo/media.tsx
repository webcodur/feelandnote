'use client'

/**
 * 사진·영상 화면 부품 한 벌 — 세력도·가상 담화·책과 사람·랭킹이 함께 쓴다.
 *
 * 두 시리즈는 같은 부품을 각자 복제해 두고 있었다(썸네일·드롭·크게 보기·맞춤 편집기·
 * 고르기 창·목록·칸). 그러다 보니 한쪽에만 기능이 붙고 문구가 갈라졌다.
 * 이 파일이 그 전부의 단일 원천이다. 부품별로 파일을 쪼개지 않는다 — 여기 한 곳만 보면 된다.
 *
 * 시리즈 차이는 두 가지 방식으로 흡수한다.
 *  1) 끌어다 놓기 데이터 종류(dnd)는 시리즈별로 다르게 넘긴다 — 세력도 목록에서 끌어와
 *     담화 칸에 놓이는 사고를 막는다.
 *  2) 필터 효과·다가갈 지점 같은 시리즈 전용 기능은 그 콜백을 넘길 때만 화면에 나온다.
 *
 * 서버 창구는 이미 하나다: /api/{series}/media(목록·올리기·지우기),
 * /api/{series}/media/folder(폴더 만들기·이름바꾸기·지우기·옮기기·탐색기로 열기),
 * imageSrc(series, ep, path)(표시 주소, 같은 폴더의 media-src).
 */

import {
  useCallback, useEffect, useMemo, useRef, useState,
  type CSSProperties, type DragEvent, type PointerEvent as ReactPointerEvent, type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'
import type { MediaTree, MediaTreeFile } from './episode-store'
import { imageSrc } from './media-src'
import {
  ChevronDown, ChevronLeft, ChevronRight, FolderOpen, Pencil, Plus, Search, Trash2, X,
} from './icons'

export { imageSrc }

// ─────────────────────────────────────────────────────────────────────────────
// 값 타입·순수 계산
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 사진 맞춤 — 화면 비율과 안 맞는 사진을 채울(cover) 때 잘릴 위치와 확대 정도.
 * 세력도(FactionImageCrop)·담화(DiscourseImageCrop)와 구조가 같아 그대로 오간다.
 */
export interface ImageCrop {
  /** 가로 초점 % (0=왼쪽, 50=가운데 기본, 100=오른쪽) */
  x?: number
  /** 세로 초점 % (0=위, 50=가운데 기본, 100=아래) */
  y?: number
  /** 확대 배율 (1=화면에 꼭 맞게 채움 기본) */
  scale?: number
}

/** 다가갈 지점 — 줌인 효과가 화면 중앙 쪽으로 끌어당길 자리(0~100%) */
export interface ImageFocus {
  x?: number
  y?: number
}

/** 끌어다 놓기 데이터 종류 — 시리즈끼리 섞이지 않게 갈라 둔다 */
export const FACTION_IMAGE_DND = 'application/x-faction-image'
export const DISCOURSE_IMAGE_DND = 'application/x-discourse-image'
export const BOOK_PERSON_IMAGE_DND = 'application/x-book-person-image'
export const RANKING_IMAGE_DND = 'application/x-ranking-image'

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v))

/** 영상 파일 여부 — 확장자 기준(주소 뒤 물음표·우물정 무시) */
export function isVideoSrc(src?: string): boolean {
  return !!src && /\.(mp4|webm|mov|m4v)(\?|#|$)/i.test(src)
}

/**
 * 사진 맞춤을 썸네일·미리보기 CSS 로 변환 — 렌더(PersonCard styleFor)와 같은 규칙.
 * 채움(cover) 위에서 보일 자리(objectPosition)와 확대(scale, 그 지점 중심)를 만든다.
 */
export function cropToStyle(crop?: ImageCrop): CSSProperties {
  if (!crop) return {}
  const x = crop.x ?? 50
  const y = crop.y ?? 50
  const sc = crop.scale ?? 1
  const style: CSSProperties = { objectPosition: `${x}% ${y}%` }
  if (sc !== 1) {
    style.transform = `scale(${sc})`
    style.transformOrigin = `${x}% ${y}%`
  }
  return style
}

/** 맞춤값 정리 — 가운데·1배뿐이면 비워서 쓸데없는 값이 파일에 남지 않게 한다 */
export function normalizeCrop(crop: ImageCrop): ImageCrop | undefined {
  const x = Math.round(crop.x ?? 50)
  const y = Math.round(crop.y ?? 50)
  const scale = Math.round((crop.scale ?? 1) * 100) / 100
  if (x === 50 && y === 50 && scale === 1) return undefined
  const out: ImageCrop = {}
  if (x !== 50) out.x = x
  if (y !== 50) out.y = y
  if (scale !== 1) out.scale = scale
  return out
}

/** src 에서 확장자만 뽑는다(주소 뒤 물음표·우물정 무시). 못 찾으면 영상/이미지 기본값. */
function srcExt(src: string, video: boolean): string {
  const m = src.match(/\.([a-zA-Z0-9]+)(?:[?#]|$)/)
  return (m?.[1] ?? (video ? 'mp4' : 'img')).toLowerCase()
}

/** 필터 효과 — 영상에 입히는 색감. 세력도만 쓰지만 부품은 공용이다. */
const FILTER_OPTIONS = [
  { value: '', label: '원본' },
  { value: 'vintage', label: '옛날 필름' },
  { value: 'sepia', label: '세피아' },
  { value: 'grayscale', label: '흑백' },
  { value: 'duotone', label: '투톤' },
  { value: 'fade', label: '페이드' },
]

// ─────────────────────────────────────────────────────────────────────────────
// 썸네일
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 사진·영상 공용 썸네일 — 영상이면 무음 video(첫 프레임만 미리 받아 표시), 아니면 img.
 * className·style 을 그대로 전달해 기존 <img> 자리와 호환된다.
 *
 * showExt 를 켜면 위에 확장자 배지(mp4·jpg 등)를 얹어 영상/사진을 한눈에 구분한다.
 * 이때 className·style 은 바깥 래퍼가 받고, 미디어는 래퍼를 가득 채운다(fit 으로 맞춤).
 */
export function MediaThumb({
  src, alt = '', className, style, mediaStyle, autoPlay = false, showExt = false, fit = 'cover',
}: {
  src: string
  alt?: string
  className?: string
  style?: CSSProperties
  /** showExt 래퍼 안의 실제 img/video에 적용할 맞춤·확대 스타일. */
  mediaStyle?: CSSProperties
  autoPlay?: boolean
  /** 확장자 배지 + 영상 표식 노출 */
  showExt?: boolean
  /** showExt 일 때 미디어 채움 방식 */
  fit?: 'cover' | 'contain'
}) {
  const video = isVideoSrc(src)

  if (!showExt) {
    if (video) {
      return <video src={src} className={className} style={style} muted loop playsInline autoPlay={autoPlay} preload="metadata" />
    }
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={alt} className={className} style={style} />
  }

  const ext = srcExt(src, video)
  const fitCls = fit === 'contain' ? 'object-contain' : 'object-cover'
  return (
    <span className={`relative block overflow-hidden ${className ?? ''}`} style={style}>
      {video ? (
        <video src={src} className={`h-full w-full ${fitCls}`} style={mediaStyle} muted loop playsInline autoPlay={autoPlay} preload="metadata" />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={alt} className={`h-full w-full ${fitCls}`} style={mediaStyle} />
      )}
      {/* 확장자 배지 — 영상은 강조색, 사진은 무채색 */}
      <span
        className={`pointer-events-none absolute bottom-0 right-0 rounded-tl px-1 py-px text-[9px] font-bold uppercase leading-none text-white ${
          video ? 'bg-rose-600/90' : 'bg-black/70'
        }`}
      >
        {video ? `▶ ${ext}` : ext}
      </span>
    </span>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// 끌어다 놓기
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 사진 목록에서 끌어온 사진을 받는 칸의 공통 동작.
 * dnd 는 시리즈별 데이터 종류(FACTION_IMAGE_DND / DISCOURSE_IMAGE_DND).
 * onDropImage(path) 로 놓인 사진의 경로(에피소드 폴더 기준)를 받아 연결한다.
 * dropProps 를 받을 요소에 펼쳐 붙이고, dragOver 로 「여기 놓으면 됩니다」 표시를 낸다.
 */
export function useImageDrop(dnd: string, onDropImage: (path: string) => void) {
  const [dragOver, setDragOver] = useState(false)
  const dropProps = {
    onDragOver: (e: DragEvent) => {
      if (!e.dataTransfer.types.includes(dnd)) return
      e.preventDefault()
      e.dataTransfer.dropEffect = 'copy'
      if (!dragOver) setDragOver(true)
    },
    onDragLeave: () => setDragOver(false),
    onDrop: (e: DragEvent) => {
      const path = e.dataTransfer.getData(dnd)
      setDragOver(false)
      if (!path) return
      e.preventDefault()
      e.stopPropagation()
      onDropImage(path)
    },
  }
  return { dragOver, dropProps }
}

// ─────────────────────────────────────────────────────────────────────────────
// 크게 보기
// ─────────────────────────────────────────────────────────────────────────────

export type LightboxShot = {
  src: string
  /** 파일 경로 — 어느 사진인지 식별 */
  path: string
  /** 이 사진이 떠 있는 동안 나오는 대사 */
  caption?: string
  /** 언제 나오는지 (예: 발언 시작 / 3번째 덩어리부터) */
  when?: string
}

/**
 * 사진 원본 크게 보기 — 작은 미리보기로는 얼굴·손·소품이 제대로 잡혔는지 판단할 수 없어
 * 원본 크기로 확인하는 통로를 둔다. 좌우 화살표·키보드로 넘겨 가며 대조할 수 있고 Esc 로 닫는다.
 */
export function ImageLightbox({
  shots, index, onClose, onIndex,
}: {
  shots: LightboxShot[]
  /** null 이면 닫힌 상태 */
  index: number | null
  onClose: () => void
  onIndex: (next: number) => void
}) {
  const open = index != null && shots.length > 0
  const move = useCallback((delta: number) => {
    if (index == null || shots.length === 0) return
    onIndex((index + delta + shots.length) % shots.length)
  }, [index, shots.length, onIndex])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      else if (e.key === 'ArrowLeft') move(-1)
      else if (e.key === 'ArrowRight') move(1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose, move])

  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  if (!open || !mounted) return null
  const shot = shots[index]
  if (!shot) return null

  const content = (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-3 bg-black/85 p-6"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <button
        onClick={onClose}
        className="absolute end-4 top-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/25"
        title="닫기 (Esc)"
      >
        <X size={20} />
      </button>

      {shots.length > 1 && (
        <>
          <button
            onClick={e => { e.stopPropagation(); move(-1) }}
            className="absolute start-4 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-3 text-white hover:bg-white/25"
            title="이전 사진 (←)"
          >
            <ChevronLeft size={24} />
          </button>
          <button
            onClick={e => { e.stopPropagation(); move(1) }}
            className="absolute end-4 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-3 text-white hover:bg-white/25"
            title="다음 사진 (→)"
          >
            <ChevronRight size={24} />
          </button>
        </>
      )}

      {/* 영상도 함께 볼 수 있게 공용 썸네일을 쓴다. 미디어를 눌러도 창이 닫히지 않는다 */}
      <span onClick={e => e.stopPropagation()} className="contents">
        <MediaThumb
          src={shot.src}
          alt=""
          autoPlay
          className="max-h-[78vh] max-w-[78vw] rounded-lg object-contain shadow-2xl"
        />
      </span>

      <div className="max-w-[78vw] space-y-1 text-center" onClick={e => e.stopPropagation()}>
        {shot.caption && <p className="text-sm leading-relaxed text-white/90">{shot.caption}</p>}
        <p className="font-mono text-[11px] text-white/50">
          {shot.when ? `${shot.when} · ` : ''}{shot.path}
          {shots.length > 1 && ` · ${index + 1}/${shots.length}`}
        </p>
      </div>
    </div>
  )

  return createPortal(content, document.body)
}

// ─────────────────────────────────────────────────────────────────────────────
// 맞춤 편집기 (보일 자리·확대)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 사진 맞춤 편집기 — 실제 영상 화면 비율(기본 9:16) 틀 위에 사진을 얹고,
 * 사진을 끌어 보일 자리를 잡고 슬라이더로 확대를 조절한다.
 * 이 틀이 곧 영상에서 보이는 범위다(켄번스 확대 모션만 영상에서 추가로 더해진다).
 */
export function ImageCropEditor({
  src, crop, onChange, aspect = 9 / 16, fit = 'cover', captionArea = false,
}: {
  src: string
  crop?: ImageCrop
  onChange: (crop: ImageCrop | undefined) => void
  /** 미리보기 비율 (가로/세로). 기본 9/16 세로 */
  aspect?: number
  /**
   * 채움 방식 — 인물 컷은 'cover'(꽉 채우고 잘림), 로고·화보는 'contain'(통째로 보이고 여백은 흐린 배경).
   * 실제 영상 렌더 방식과 일치시킨다. 기본 'cover'.
   */
  fit?: 'cover' | 'contain'
  /** 아래쪽에 자막·이름이 덮는 자리를 표시한다 */
  captionArea?: boolean
}) {
  const boxRef = useRef<HTMLDivElement | null>(null)
  const drag = useRef<{ px: number; py: number; x: number; y: number } | null>(null)
  const [grabbing, setGrabbing] = useState(false)

  const x = crop?.x ?? 50
  const y = crop?.y ?? 50
  const scale = crop?.scale ?? 1
  const video = isVideoSrc(src)

  const onPointerDown = (e: ReactPointerEvent) => {
    e.preventDefault()
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    drag.current = { px: e.clientX, py: e.clientY, x, y }
    setGrabbing(true)
  }
  const onPointerMove = (e: ReactPointerEvent) => {
    const d = drag.current
    const box = boxRef.current
    if (!d || !box) return
    const r = box.getBoundingClientRect()
    // 사진을 끄는 방향과 반대로 보일 자리가 움직인다(오른쪽으로 끌면 왼쪽이 보인다)
    const dx = ((e.clientX - d.px) / r.width) * 100
    const dy = ((e.clientY - d.py) / r.height) * 100
    onChange(normalizeCrop({ x: clamp(d.x - dx, 0, 100), y: clamp(d.y - dy, 0, 100), scale }))
  }
  const onPointerUp = (e: ReactPointerEvent) => {
    drag.current = null
    setGrabbing(false)
    try { (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId) } catch { /* noop */ }
  }

  const mediaStyle: CSSProperties = {
    width: '100%',
    height: '100%',
    objectFit: fit,
    objectPosition: `${x}% ${y}%`,
    transform: scale !== 1 ? `scale(${scale})` : undefined,
    transformOrigin: `${x}% ${y}%`,
  }
  // 3분할 가이드선 — 자리 잡기 보조
  const gridBg: CSSProperties = {
    backgroundImage:
      'linear-gradient(to right, rgba(255,255,255,.28) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,.28) 1px, transparent 1px)',
    backgroundSize: '33.333% 33.333%',
    backgroundPosition: '-1px -1px',
  }

  return (
    <div className="space-y-2">
      <div
        ref={boxRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        className={`relative mx-auto select-none overflow-hidden rounded-md border border-border bg-black ${grabbing ? 'cursor-grabbing' : 'cursor-grab'}`}
        style={{ width: 168, aspectRatio: String(aspect), touchAction: 'none' }}
        title="사진을 끌어 보일 자리를 잡으세요"
      >

        {video ? (
          <video src={src} className="pointer-events-none relative h-full w-full" style={mediaStyle} muted loop playsInline autoPlay preload="metadata" />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt="" className="pointer-events-none relative h-full w-full" style={mediaStyle} draggable={false} />
        )}
        <div className="pointer-events-none absolute inset-0 opacity-50" style={gridBg} />
        {captionArea && (
          <>
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[38%] bg-gradient-to-t from-black/70 to-transparent" />
            <span className="pointer-events-none absolute inset-x-0 bottom-1 text-center text-[9px] text-white/60">자막이 덮는 자리</span>
          </>
        )}
      </div>
      <p className="text-center text-[10px] text-text-dim">이 틀이 영상에서 실제로 보이는 범위입니다</p>
      <div className="flex items-center gap-2">
        <span className="shrink-0 text-[11px] text-text-dim">확대</span>
        <input
          type="range" min={1} max={3} step={0.05} value={scale}
          onChange={e => onChange(normalizeCrop({ x, y, scale: Number(e.target.value) }))}
          className="min-w-0 flex-1 accent-accent"
        />
        <span className="w-9 shrink-0 text-right text-[11px] tabular-nums text-text-secondary">{scale.toFixed(2)}x</span>
        <button
          type="button"
          onClick={() => onChange(undefined)}
          className="shrink-0 rounded border border-border px-1.5 py-0.5 text-[10px] text-text-secondary hover:bg-bg-hover"
        >
          되돌리기
        </button>
      </div>
      <p className="text-center text-[10px] text-text-dim">영상에선 자동 확대 모션이 위에 더해집니다</p>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// 다가갈 지점 찍기
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 다가갈 지점 찍기 — 화면 비율 틀 위에 사진을 얹고, 누른 자리를 목표점(x·y %)으로 저장한다.
 * 줌인 지속 효과가 이 지점을 화면 가운데로 끌어당기며 확대한다. 안 찍으면 가운데(50·50).
 */
export function ImageFocusPicker({
  src, focus, onChange, aspect = 9 / 16,
}: {
  src: string
  focus?: ImageFocus
  onChange: (focus: ImageFocus | undefined) => void
  /** 미리보기 비율 (가로/세로). 기본 9/16 세로 */
  aspect?: number
}) {
  const boxRef = useRef<HTMLDivElement | null>(null)
  const fx = focus?.x ?? 50
  const fy = focus?.y ?? 50
  const has = focus?.x != null || focus?.y != null

  const pick = (e: ReactPointerEvent) => {
    const box = boxRef.current
    if (!box) return
    const r = box.getBoundingClientRect()
    const x = Math.round(clamp(((e.clientX - r.left) / r.width) * 100, 0, 100))
    const y = Math.round(clamp(((e.clientY - r.top) / r.height) * 100, 0, 100))
    onChange({ x, y })
  }

  return (
    <div className="space-y-1">
      <div
        ref={boxRef}
        onPointerDown={pick}
        className="relative mx-auto cursor-crosshair select-none overflow-hidden rounded-md border border-border bg-black"
        style={{ width: 168, aspectRatio: String(aspect), touchAction: 'none' }}
        title="다가갈 지점을 누르세요"
      >
        <MediaThumb src={src} alt="" autoPlay className="pointer-events-none h-full w-full object-cover" />
        {/* 목표점 표식 — 십자 + 점 */}
        {has && (
          <div className="pointer-events-none absolute -ml-3 -mt-3 h-6 w-6" style={{ left: `${fx}%`, top: `${fy}%` }}>
            <div className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-amber-400/80" />
            <div className="absolute top-1/2 left-0 h-px w-full -translate-y-1/2 bg-amber-400/80" />
            <div className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-black/60 bg-amber-400" />
          </div>
        )}
      </div>
      <div className="flex items-center justify-center gap-2 text-[10px] text-text-dim">
        <span>{has ? `목표점 ${fx}·${fy}%` : '가운데(기본)'}</span>
        {has && (
          <button type="button" onClick={() => onChange(undefined)} className="rounded border border-border px-1.5 py-0.5 text-text-secondary hover:bg-bg-hover">
            되돌리기
          </button>
        )}
      </div>
      <p className="text-center text-[10px] text-text-dim">줌 종류가 「줌 인」일 때 이 지점으로 다가갑니다</p>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// 사진 고르기 창
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 사진 고르기 창 — 사진 칸을 누르면 뜬다.
 *
 * 이 편 폴더 전체(하위 폴더 포함)를 훑어 보여주고, 새 파일을 올리거나 바깥 주소를 붙여넣거나
 * 바깥 주소 사진을 이 편 폴더로 받아 둘 수 있다. 세로 화면에서 어디가 보일지도 여기서 잡는다.
 *
 * 맞춤·다가갈 지점·필터 효과·아바타 저장은 해당 콜백(또는 slug)을 넘길 때만 화면에 나온다.
 */
export function ImagePicker({
  value, onChange, series, episodeName, onClose,
  crop, onCropChange, cropFit = 'cover', captionArea = false,
  focus, onFocusChange, filter, onFilterChange,
  slug, onUploaded, title = '사진 고르기',
}: {
  value?: string
  onChange: (next: string | undefined) => void
  series: string
  episodeName: string
  onClose: () => void
  /** 맞춤(보일 자리·확대) — 넘기면 세로 틀 편집기를 함께 띄운다 */
  crop?: ImageCrop
  onCropChange?: (crop: ImageCrop | undefined) => void
  /** 편집기 채움 방식 — 인물 컷 'cover', 로고·화보 'contain'. 기본 'cover' */
  cropFit?: 'cover' | 'contain'
  /** 맞춤 틀에 자막이 덮는 자리를 표시한다 */
  captionArea?: boolean
  /** 다가갈 지점(줌) — 넘기면 맞춤 편집기 옆에 목표점 찍기를 띄운다 */
  focus?: ImageFocus
  onFocusChange?: (focus: ImageFocus | undefined) => void
  /** 필터 효과 — 넘기면 고르기 창에 색감 선택을 띄운다 */
  filter?: string
  onFilterChange?: (filter: string | undefined) => void
  /** 인물 슬러그 — 넘기고 값이 바깥 주소면 「아바타로 저장」이 나온다 */
  slug?: string
  /** 파일을 올리거나 지운 뒤 — 사진 목록을 새로 읽게 한다 */
  onUploaded?: () => void
  title?: string
}) {
  const [images, setImages] = useState<string[]>([])
  const [urlInput, setUrlInput] = useState('')
  const [query, setQuery] = useState('')
  const [busy, setBusy] = useState(false)
  const fileRef = useRef<HTMLInputElement | null>(null)

  const q = query.trim().toLowerCase()
  const shown = q ? images.filter(f => f.toLowerCase().includes(q)) : images

  /**
   * 이 편 폴더의 사진 전부.
   * 세력도는 images/ 한 곳에 몰아 두지만 담화는 인물 폴더(cast/<인물>/)에 나눠 두므로
   * images/ 직속만 읽으면 목록이 비어 보인다. 폴더 전체를 훑어 온다.
   */
  const loadImages = useCallback(() => {
    fetch(`/api/${series}/media?ep=${encodeURIComponent(episodeName)}&tree=1`)
      .then(r => r.json())
      .then((d: { files?: { path: string; folder: string }[] }) =>
        setImages((d.files ?? []).map(f => f.path).filter(p => !p.startsWith('_'))))
      .catch(() => setImages([]))
  }, [series, episodeName])

  useEffect(() => { loadImages() }, [loadImages])

  // 이 창을 열어 둔 채 탐색기에서 사진을 넣고 돌아오는 흐름 — 돌아온 순간 목록을 다시 읽는다
  useEffect(() => {
    const onFocus = () => loadImages()
    const onVisible = () => { if (document.visibilityState === 'visible') loadImages() }
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [loadImages])

  const handleUpload = async (file: File) => {
    setBusy(true)
    try {
      const form = new FormData()
      form.append('ep', episodeName)
      form.append('file', file)
      const res = await fetch(`/api/${series}/media`, { method: 'POST', body: form })
      const data = await res.json()
      if (res.ok && data.file) {
        onChange(data.file)
        loadImages()
        onUploaded?.()
      } else {
        alert('올리지 못했습니다: ' + (data.error ?? ''))
      }
    } catch {
      alert('올리는 중 문제가 생겼습니다.')
    } finally {
      setBusy(false)
    }
  }

  const handleDeleteImage = async (file: string) => {
    if (!confirm(`${file} 파일을 지울까요?`)) return
    setBusy(true)
    try {
      await fetch(`/api/${series}/media?ep=${encodeURIComponent(episodeName)}&file=${encodeURIComponent(file)}`, { method: 'DELETE' })
      if (value === file) onChange(undefined)
      loadImages()
      onUploaded?.()
    } finally {
      setBusy(false)
    }
  }

  /** 바깥 주소 사진을 이 편의 폴더로 받아 둔다 — 주소가 죽어도 영상이 깨지지 않게 */
  const handleFetchUrl = async () => {
    const url = urlInput.trim()
    if (!url) return
    setBusy(true)
    try {
      const res = await fetch(`/api/${series}/media`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ep: episodeName, url, basename: 'web' }),
      })
      const data = await res.json()
      if (res.ok && data.file) {
        onChange(data.file)
        setUrlInput('')
        loadImages()
        onUploaded?.()
      } else {
        alert('받아오지 못했습니다: ' + (data.error ?? ''))
      }
    } finally {
      setBusy(false)
    }
  }

  /** 바깥 주소 사진을 셀럽 아바타로 내려받아 등록한다(세력도 인물 전용) */
  const handleSaveAvatar = async () => {
    if (!value || !value.startsWith('http') || !slug) return
    setBusy(true)
    try {
      const res = await fetch(`/api/${series}/faction-avatar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ep: episodeName, url: value, slug }),
      })
      const data = await res.json()
      if (res.ok && data.file) {
        onChange(data.file)
        loadImages()
        onUploaded?.()
      } else {
        alert('저장하지 못했습니다: ' + (data.error ?? ''))
      }
    } finally {
      setBusy(false)
    }
  }

  const canSaveAvatar = !!slug && !!value && value.startsWith('http')

  const filterSelect = onFilterChange && (
    <select
      value={filter ?? ''}
      onChange={e => onFilterChange(e.target.value || undefined)}
      className="shrink-0 rounded-md border border-border bg-bg-main px-2 py-1 text-xs text-text-secondary hover:border-accent focus:border-accent focus:outline-none"
      title="색감 효과"
    >
      {FILTER_OPTIONS.map(opt => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  )

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 p-4 pt-20" onClick={onClose}>
      <div
        className="flex max-h-[calc(100vh-6rem)] w-full max-w-lg flex-col overflow-hidden rounded-lg border border-border bg-bg-card shadow-xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-border p-3">
          <span className="font-semibold text-text-primary">{title}</span>
          <button onClick={onClose} className="rounded-md border border-border px-3 py-1.5 text-sm text-text-secondary hover:bg-bg-hover">
            닫기
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          {/* 지금 고른 사진 — 맞춤 편집이 가능하면 세로 틀로, 아니면 작은 썸네일 */}
          {value && onCropChange ? (
            <div className="space-y-2 rounded-md border border-border bg-bg-secondary p-2">
              <div className="flex flex-wrap justify-center gap-4">
                <div>
                  <p className="mb-1 text-center text-[10px] font-semibold text-text-secondary">보일 자리</p>
                  <ImageCropEditor
                    src={imageSrc(series, episodeName, value)!}
                    crop={crop}
                    onChange={onCropChange}
                    fit={cropFit}
                    captionArea={captionArea}
                  />
                </div>
                {onFocusChange && (
                  <div>
                    <p className="mb-1 text-center text-[10px] font-semibold text-text-secondary">다가갈 지점(줌)</p>
                    <ImageFocusPicker src={imageSrc(series, episodeName, value)!} focus={focus} onChange={onFocusChange} />
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="min-w-0 flex-1 truncate text-xs text-text-secondary">{value}</span>
                {filterSelect}
                <button onClick={() => onChange(undefined)} className="shrink-0 rounded-md border border-border px-2 py-1 text-xs text-danger-text hover:bg-danger">
                  연결 끊기
                </button>
              </div>
            </div>
          ) : value ? (
            <div className="flex items-center gap-3 rounded-md border border-border bg-bg-secondary p-2">
              <MediaThumb src={imageSrc(series, episodeName, value)!} alt="" className="h-14 w-14 rounded-md object-cover" />
              <span className="min-w-0 flex-1 truncate text-xs text-text-secondary">{value}</span>
              {filterSelect}
              <button onClick={() => onChange(undefined)} className="rounded-md border border-border px-2 py-1 text-xs text-danger-text hover:bg-danger">
                연결 끊기
              </button>
            </div>
          ) : null}

          {/* 새 파일 올리기 */}
          <div className="flex items-center gap-2">
            <input
              ref={fileRef}
              type="file"
              accept="image/*,video/*"
              className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) handleUpload(f); e.target.value = '' }}
            />
            <button
              onClick={() => fileRef.current?.click()}
              disabled={busy}
              className="rounded-md bg-accent px-3 py-2 text-sm font-semibold text-bg-main hover:bg-accent-hover disabled:opacity-50"
            >
              파일 올리기
            </button>
            {canSaveAvatar && (
              <button
                onClick={handleSaveAvatar}
                disabled={busy}
                className="rounded-md border border-border px-3 py-2 text-sm font-semibold text-text-secondary hover:bg-bg-hover disabled:opacity-50"
              >
                아바타로 저장
              </button>
            )}
            <span className="text-xs text-text-dim">올린 파일은 이 편의 images 폴더에 들어갑니다</span>
          </div>

          {/* 바깥 주소 */}
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="사진 주소 붙여넣기"
              value={urlInput}
              onChange={e => setUrlInput(e.target.value)}
              className="flex-1 rounded-md border border-border bg-bg-main px-3 py-2 text-sm focus:border-accent focus:outline-none"
            />
            <button
              onClick={handleFetchUrl}
              disabled={busy || !urlInput.trim()}
              title="주소의 사진을 이 편의 폴더로 받아 둡니다"
              className="shrink-0 rounded-md border border-border px-3 py-2 text-sm font-semibold text-text-secondary hover:bg-bg-hover disabled:opacity-50"
            >
              받아두기
            </button>
            <button
              onClick={() => { if (urlInput.trim()) { onChange(urlInput.trim()); setUrlInput('') } }}
              title="주소를 그대로 씁니다 (주소가 죽으면 영상에서 사진이 빠집니다)"
              className="shrink-0 rounded-md border border-border px-3 py-2 text-sm font-semibold text-text-secondary hover:bg-bg-hover"
            >
              주소 그대로
            </button>
          </div>

          {/* 이 편의 사진 */}
          <div>
            <div className="mb-2 flex items-center gap-2">
              <p className="shrink-0 text-xs font-semibold text-text-secondary">이 편의 사진 {images.length}장</p>
              <input
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="폴더·파일 이름으로 좁히기"
                className="min-w-0 flex-1 rounded-md border border-border bg-bg-main px-2 py-1 text-xs focus:border-accent focus:outline-none"
              />
            </div>
            {shown.length === 0 ? (
              <p className="text-xs text-text-dim">
                {images.length === 0 ? '이 편 폴더에 사진이 없습니다.' : '찾는 이름의 사진이 없습니다.'}
              </p>
            ) : (
              <div className="grid grid-cols-4 gap-2">
                {shown.map(f => {
                  const isCurrent = value === f
                  return (
                    <div key={f} className="group relative">
                      <button
                        onClick={() => onChange(f)}
                        title={`${f}${isCurrent ? ' · 쓰는 중' : ''}`}
                        aria-pressed={isCurrent}
                        className={`block w-full overflow-hidden rounded-md border hover:border-accent hover:bg-bg-hover ${isCurrent ? 'border-accent bg-accent/10 ring-2 ring-accent/30' : 'border-border'}`}
                      >
                        <MediaThumb src={imageSrc(series, episodeName, f)!} alt="" showExt className="aspect-square w-full" />
                        <span className="block truncate bg-bg-main/85 px-1 py-0.5 text-[9px] text-text-secondary">
                          {f.split('/').pop()}
                        </span>
                      </button>
                      {isCurrent ? (
                        <span className="pointer-events-none absolute start-1 top-1 z-10 rounded bg-accent/95 px-1.5 py-0.5 text-[10px] font-black text-bg-main shadow-sm">
                          쓰는 중
                        </span>
                      ) : null}
                      <button
                        onClick={() => handleDeleteImage(f)}
                        className="absolute end-1 top-1 rounded bg-danger px-1.5 py-px text-[11px] text-danger-text opacity-0 group-hover:opacity-100"
                      >
                        지우기
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// 사진 목록(폴더 트리)
// ─────────────────────────────────────────────────────────────────────────────

const ROOT_LABEL = '(맨 위)'

/**
 * 사진 목록 — 이 편의 폴더에 있는 사진을 전부 펼쳐 보고 정리하는 자리.
 *
 * 폴더 만들기·이름 바꾸기·지우기, 사진을 폴더로 끌어 옮기기, 탐색기로 열기까지 한 곳에서.
 * 사진을 끌어 인물·화보·로고·발언 칸에 놓으면 연결된다(옮긴 뒤 대본 경로 따라가기는 부모가 맡는다).
 * 사진을 누르면 크게 보기가 뜨고 좌우로 넘겨 볼 수 있다. 빈 폴더도 보인다.
 */
export function ImagePool({
  series,
  episodeName,
  usedImages,
  dnd,
  reloadKey = 0,
  onMoveFile,
  onCreateFolder,
  onRenameFolder,
  onDeleteFolder,
  onDeleteFile,
}: {
  series: string
  episodeName: string
  /** 영상에 연결된 사진 경로 — 쓰는 것/안 쓰는 것을 가른다 */
  usedImages: Set<string>
  /** 끌어다 놓기 데이터 종류 — 시리즈별 상수 */
  dnd: string
  /** 값이 바뀌면 목록을 다시 불러온다 */
  reloadKey?: number
  /** 파일 옮기기 — from(파일 경로) → toFolder(폴더 경로, ''=맨 위). 성공하면 true */
  onMoveFile?: (from: string, toFolder: string) => Promise<boolean>
  /** 폴더 만들기 (아래 단계는 a/b 형식) */
  onCreateFolder?: (folder: string) => Promise<boolean>
  onRenameFolder?: (folder: string, newName: string) => Promise<boolean>
  onDeleteFolder?: (folder: string) => Promise<boolean>
  onDeleteFile?: (file: string) => Promise<boolean>
}) {
  const [tree, setTree] = useState<MediaTree | null>(null)
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [opened, setOpened] = useState<Set<string>>(new Set())
  const [lightbox, setLightbox] = useState<number | null>(null)
  const [dragFolder, setDragFolder] = useState<string | null>(null)
  const [editingFolder, setEditingFolder] = useState<string | null>(null)
  const [editName, setEditName] = useState('')

  /** 마지막으로 목록을 읽어 온 시각 — 잇달아 들어오는 자동 재조회를 걸러낸다 */
  const lastLoadAt = useRef(0)

  /**
   * 목록 읽기. quiet 면 「불러오는 중」 문구를 띄우지 않는다 —
   * 자동 재조회는 사용자가 부른 게 아니라 화면이 흔들리면 안 된다.
   */
  const load = useCallback((quiet = false) => {
    if (!quiet) setLoading(true)
    lastLoadAt.current = Date.now()
    fetch(`/api/${series}/media?ep=${encodeURIComponent(episodeName)}&tree=1`)
      .then(r => r.json())
      .then((data: MediaTree) => setTree(data))
      .catch(() => setTree({ files: [], folders: [] }))
      .finally(() => { if (!quiet) setLoading(false) })
  }, [series, episodeName])

  useEffect(() => { load() }, [load, reloadKey])

  /** 조용한 재조회 — 방금 읽었으면 건너뛴다(연달아 들어오는 신호 흡수) */
  const refresh = useCallback((minGapMs = 800) => {
    if (Date.now() - lastLoadAt.current < minGapMs) return
    load(true)
  }, [load])

  /**
   * 탐색기에서 사진을 넣거나 뺀 뒤 이 창으로 돌아오면 목록을 다시 읽는다.
   * 브라우저는 폴더 변화를 알 수 없으니 「창으로 돌아온 순간」이 유일한 신호다.
   */
  useEffect(() => {
    const onFocus = () => refresh()
    const onVisible = () => { if (document.visibilityState === 'visible') refresh() }
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [refresh])

  /** 이 편의 사진 폴더를 탐색기로 연다. folder 를 주면 그 아래 폴더를 연다. */
  const openFolder = useCallback((folder?: string) => {
    fetch(`/api/${series}/media/folder`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ep: episodeName, action: 'open', folder }),
    })
      .then(r => r.json())
      .then((data: { ok?: boolean; error?: string }) => {
        if (!data.ok) alert(`폴더를 열 수 없습니다: ${data.error ?? '알 수 없는 문제'}`)
      })
      .catch(() => alert('폴더를 열 수 없습니다.'))
  }, [series, episodeName])

  const q = query.trim().toLowerCase()
  const files = useMemo(() => tree?.files ?? [], [tree])
  const allFolders = useMemo(() => tree?.folders ?? [], [tree])

  const filesByFolder = useMemo(() => {
    const map = new Map<string, MediaTreeFile[]>()
    for (const f of files) {
      if (q && !f.path.toLowerCase().includes(q)) continue
      const k = f.folder || ''
      const list = map.get(k) ?? []
      list.push(f)
      map.set(k, list)
    }
    return map
  }, [files, q])

  /** 크게 보기 대상 — 목록 순서 그대로라 좌우로 넘겨 볼 수 있다 */
  const visibleFiles = useMemo(
    () => files.filter(f => !q || f.path.toLowerCase().includes(q)),
    [files, q],
  )
  const shots: LightboxShot[] = useMemo(
    () => visibleFiles.map(f => ({
      src: imageSrc(series, episodeName, f.path)!,
      path: f.path,
      when: usedImages.has(f.path) ? '영상에 쓰는 중' : '아직 안 쓰는 사진',
    })),
    [visibleFiles, series, episodeName, usedImages],
  )

  const folderSet = useMemo(() => new Set(allFolders), [allFolders])
  const parentOf = (f: string) => { const i = f.lastIndexOf('/'); return i >= 0 ? f.slice(0, i) : '' }

  // 검색 중이면 일치 파일이 있는 폴더(와 그 위 폴더)만 보인다
  const folderHasMatch = useCallback((folder: string): boolean => {
    if (!q) return true
    if (filesByFolder.get(folder)?.length) return true
    for (const k of filesByFolder.keys()) if (k.startsWith(folder + '/')) return true
    return false
  }, [q, filesByFolder])

  const childrenOf = (parent: string) =>
    allFolders.filter(f => parentOf(f) === parent && folderHasMatch(f)).sort((a, b) => a.localeCompare(b))
  // 맨 위 = 부모 없음 또는 부모가 목록에 없는 외톨이
  const topFolders = allFolders
    .filter(f => { const p = parentOf(f); return (p === '' || !folderSet.has(p)) && folderHasMatch(f) })
    .sort((a, b) => a.localeCompare(b))

  const total = files.length
  const usedCount = useMemo(() => files.filter(f => usedImages.has(f.path)).length, [files, usedImages])

  const allOpen = allFolders.length > 0 && allFolders.every(k => opened.has(k))
  // 폴더를 펼치는 순간은 그 안을 보려는 순간이다 — 그때 목록을 다시 읽어 최신 사진을 보여준다
  const toggleOpen = (key: string) => {
    if (!opened.has(key)) refresh()
    setOpened(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }
  const toggleAll = () => {
    if (!allOpen) refresh()
    setOpened(allOpen ? new Set() : new Set(allFolders))
  }

  // 검색 중에는 결과가 든 폴더를 자동으로 펼친다
  useEffect(() => {
    if (q) setOpened(new Set(allFolders))
  }, [q, allFolders])

  // ── 폴더 정리 ──
  const handleCreate = async () => {
    if (!onCreateFolder) return
    const raw = window.prompt('새 폴더 이름 (아래 단계는 a/b 처럼)')
    const folder = raw?.trim().replace(/^\/+|\/+$/g, '')
    if (!folder) return
    if (await onCreateFolder(folder)) load()
  }
  const startRename = (folder: string) => {
    setEditingFolder(folder)
    setEditName(folder.split('/').pop() ?? folder)
  }
  const submitRename = async (folder: string) => {
    const newName = editName.trim()
    setEditingFolder(null)
    if (!onRenameFolder) return
    const cur = folder.split('/').pop() ?? folder
    if (!newName || newName === cur) return
    if (await onRenameFolder(folder, newName)) load()
  }
  const handleDelete = async (folder: string) => {
    if (!onDeleteFolder) return
    if (!window.confirm(`"${folder}" 폴더를 지울까요? (안이 비어 있어야 합니다)`)) return
    if (await onDeleteFolder(folder)) load()
  }

  // 사진을 폴더로 끌어 옮기기
  const onFolderDragOver = (folder: string) => (e: DragEvent) => {
    if (!e.dataTransfer.types.includes(dnd)) return
    e.preventDefault()
    e.stopPropagation()
    e.dataTransfer.dropEffect = 'move'
    if (dragFolder !== folder) setDragFolder(folder)
  }
  const onFolderDrop = (folder: string) => async (e: DragEvent) => {
    const from = e.dataTransfer.getData(dnd)
    setDragFolder(null)
    if (!from || !onMoveFile) return
    e.preventDefault()
    e.stopPropagation()
    const curFolder = from.includes('/') ? from.slice(0, from.lastIndexOf('/')) : ''
    if (curFolder === folder) return // 같은 폴더면 무시
    if (await onMoveFile(from, folder)) load()
  }

  // 사진 한 칸 — 누르면 크게 보기 / 끌면 연결·옮기기
  const renderThumb = (f: MediaTreeFile) => {
    const isUsed = usedImages.has(f.path)
    const at = visibleFiles.findIndex(v => v.path === f.path)
    return (
      <div
        key={f.path}
        role="button"
        tabIndex={0}
        onClick={() => setLightbox(at >= 0 ? at : 0)}
        onKeyDown={e => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            setLightbox(at >= 0 ? at : 0)
          }
        }}
        draggable
        onDragStart={e => {
          e.dataTransfer.setData(dnd, f.path)
          e.dataTransfer.setData('text/plain', f.path)
          e.dataTransfer.effectAllowed = 'copyMove'
        }}
        className="group relative flex aspect-square cursor-pointer flex-col overflow-hidden rounded border border-border bg-bg-main focus:outline-none focus:ring-2 focus:ring-accent"
        title={`${f.path}\n누르면 크게 보기 · 끌어다 사진 칸에 놓으면 연결, 폴더에 놓으면 옮김`}
      >
        {onDeleteFile && (
          <button
            onClick={async (e) => {
              e.stopPropagation()
              if (!window.confirm(`"${f.name}" 사진을 삭제하시겠습니까?`)) return
              if (await onDeleteFile(f.path)) load()
            }}
            title="이 사진 삭제"
            className="absolute right-1 top-1 z-10 hidden rounded bg-black/60 p-1 text-white hover:bg-danger-text group-hover:flex"
          >
            <X size={12} />
          </button>
        )}
        <MediaThumb src={imageSrc(series, episodeName, f.path)!} alt={f.name} showExt className="h-full w-full" />
        {isUsed && (
          <span className="absolute start-1 top-1 rounded bg-accent/90 px-1 py-0.5 text-[10px] font-bold text-bg-main">
            쓰는 중
          </span>
        )}
        <span className="absolute inset-x-0 bottom-0 truncate bg-bg-main/85 px-1 py-0.5 text-[10px] text-text-secondary">
          {f.name}
        </span>
      </div>
    )
  }

  // 폴더 한 칸 (재귀). folder='' = 맨 위
  const renderFolder = (folder: string): ReactNode => {
    const isRoot = folder === ''
    const isOpen = isRoot || opened.has(folder)
    const dirFiles = filesByFolder.get(folder) ?? []
    // 맨 위의 아래 폴더는 따로 그리므로 여기선 비운다(중복 방지)
    const subs = isRoot ? [] : childrenOf(folder)
    const label = isRoot ? ROOT_LABEL : (folder.split('/').pop() || folder)
    const dropActive = dragFolder === folder
    return (
      <div
        key={folder || '(root)'}
        className={`overflow-hidden rounded-md border ${dropActive ? 'border-accent ring-2 ring-accent' : 'border-border'}`}
        onDragOver={onFolderDragOver(folder)}
        onDragLeave={() => setDragFolder(null)}
        onDrop={onFolderDrop(folder)}
      >
        <div className="group flex w-full items-center bg-bg-card hover:bg-bg-hover">
          <div
            onClick={() => { if (!isRoot && editingFolder !== folder) toggleOpen(folder) }}
            className={`flex min-w-0 flex-1 items-center gap-1.5 px-2 py-1.5 text-start ${isRoot || editingFolder === folder ? '' : 'cursor-pointer'}`}
          >
            {!isRoot && <ChevronDown size={15} className={`shrink-0 text-text-secondary ${isOpen ? '' : '-rotate-90'}`} />}
            {editingFolder === folder && !isRoot ? (
              <input
                autoFocus
                value={editName}
                onChange={e => setEditName(e.target.value)}
                onBlur={() => submitRename(folder)}
                onKeyDown={e => {
                  if (e.key === 'Enter') submitRename(folder)
                  if (e.key === 'Escape') setEditingFolder(null)
                }}
                onClick={e => e.stopPropagation()}
                className="w-full min-w-0 rounded border border-accent bg-bg-main px-1 py-0.5 text-sm font-semibold text-text-primary focus:outline-none"
              />
            ) : (
              <span className="truncate font-semibold text-text-primary">{isRoot ? '📂 ' : '📁 '}{label}</span>
            )}
            <span className="ms-auto shrink-0 ps-2 text-xs text-text-secondary">
              {dirFiles.length}{subs.length ? ` · 📁${subs.length}` : ''}
            </span>
          </div>
          <button
            onClick={() => openFolder(folder || undefined)}
            title="이 폴더를 탐색기로 열기"
            className="flex h-8 w-8 shrink-0 items-center justify-center border-s border-border text-text-secondary hover:!bg-accent/10 hover:!text-accent"
          >
            <FolderOpen size={14} />
          </button>
          {!isRoot && onRenameFolder && (
            <button
              onClick={() => startRename(folder)}
              title="폴더 이름 바꾸기"
              className="flex h-8 w-8 shrink-0 items-center justify-center border-s border-border text-text-secondary hover:!bg-accent/10 hover:!text-accent"
            >
              <Pencil size={14} />
            </button>
          )}
          {!isRoot && onDeleteFolder && (
            <button
              onClick={() => handleDelete(folder)}
              title="폴더 지우기 (안이 비어 있어야 합니다)"
              className="flex h-8 w-8 shrink-0 items-center justify-center border-s border-border text-danger-text hover:!bg-danger/15"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
        {isOpen && (
          <div className="space-y-2 border-t border-border p-2">
            {subs.length > 0 && <div className="space-y-1.5">{subs.map(renderFolder)}</div>}
            {dirFiles.length > 0 ? (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">{dirFiles.map(renderThumb)}</div>
            ) : subs.length === 0 ? (
              <p className="px-1 py-1 text-[10px] text-text-dim">
                {isRoot ? '맨 위에는 사진이 없습니다' : '비어 있습니다 — 사진을 여기로 끌어다 놓으면 옮겨집니다'}
              </p>
            ) : null}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2 text-sm">
      <div className="flex items-center justify-between gap-2">
        <span className="font-bold text-text-primary">
          사진 {total}장
          <span className="ml-1.5 font-normal text-text-secondary">
            (쓰는 중 {usedCount} · 아직 안 씀 {total - usedCount})
          </span>
        </span>
        <div className="flex shrink-0 items-center gap-1.5">
          {onCreateFolder && (
            <button
              onClick={handleCreate}
              title="새 폴더 만들기"
              className="flex items-center gap-1 rounded-md border border-border bg-bg-card px-2 py-1 text-xs font-semibold text-text-secondary hover:bg-bg-hover"
            >
              <Plus size={13} /> 새 폴더
            </button>
          )}
          <button
            onClick={() => openFolder()}
            title="이 편의 사진 폴더를 탐색기로 열기"
            className="flex items-center gap-1 rounded-md border border-border bg-bg-card px-2 py-1 text-xs font-semibold text-text-secondary hover:bg-bg-hover"
          >
            <FolderOpen size={13} /> 폴더 열기
          </button>
          <button
            onClick={() => load()}
            title="목록을 지금 다시 읽는다 (탐색기를 다녀오면 저절로도 갱신된다)"
            className="rounded-md border border-border bg-bg-card px-2 py-1 text-xs font-semibold text-text-secondary hover:bg-bg-hover"
          >
            새로고침
          </button>
        </div>
      </div>

      {/* 찾기 */}
      <div className="relative">
        <span className="pointer-events-none absolute inset-y-0 start-2 flex items-center text-text-dim">
          <Search size={14} />
        </span>
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="파일 이름·폴더로 찾기"
          className="w-full rounded-md border border-border bg-bg-card py-1.5 ps-7 pe-2 text-sm focus:border-accent focus:outline-none"
        />
      </div>

      {allFolders.length > 0 && (
        <button
          onClick={toggleAll}
          className="self-start rounded-md border border-border bg-bg-card px-2 py-1 text-xs font-semibold text-text-secondary hover:bg-bg-hover"
        >
          {allOpen ? '폴더 모두 접기' : '폴더 모두 펼치기'}
        </button>
      )}

      {loading && <p className="text-text-dim">불러오는 중...</p>}
      {!loading && total === 0 && allFolders.length === 0 && <p className="text-text-dim">사진이 없습니다.</p>}

      {/* 폴더 트리 — 맨 위 폴더의 사진부터, 그 아래 폴더들 */}
      <div className="flex flex-col gap-1.5">
        {renderFolder('')}
        {topFolders.map(renderFolder)}
      </div>

      <ImageLightbox shots={shots} index={lightbox} onClose={() => setLightbox(null)} onIndex={setLightbox} />
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// 사진 칸
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 사진 한 칸 — 인물 소개 사진, 발언 시작 사진, 발언 도중 교체 사진, 시작·마지막 화면이 이 칸을 쓴다.
 *
 * 누르면 사진 고르기 창이 뜨고, 사진 목록에서 끌어다 놓아도 연결된다.
 * 비어 있으면 무엇으로 대신 나가는지(예: 인물 기본 사진) 안내를 띄운다.
 */
// ─────────────────────────────────────────────────────────────────────────────
// 사진 카드 — 대사 구절에 걸린 사진 한 장 (팩션 인물 대사 · 담화 발언 공용)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 대사 구절 ↔ 그 구절에 걸린 사진 카드를 같은 색으로 묶는 색 묶음.
 *
 * 대사 쪽 색칠·표식과 사진 카드의 테두리·머리띠가 이 한 벌을 공유한다.
 * 어느 사진이 어디부터 화면에 뜨는지 눈으로 바로 대조된다.
 *
 * bg 는 대사칸 위에 얹는 옅은 색칠이라 진하게(/25) 잡아야 구획이 눈에 든다.
 * badge* 는 카드 머리띠·표식용 밝은 색 — 어두운 바탕에서 도드라지도록 밝은 쪽을 유지한다.
 */
export type AnchorTheme = {
  name: string
  bg: string
  text: string
  border: string
  badgeBg: string
  badgeText: string
}

export const ANCHOR_THEMES: AnchorTheme[] = [
  { name: 'amber', bg: 'bg-amber-400/25', text: 'text-amber-600', border: 'border-amber-400', badgeBg: 'bg-amber-100', badgeText: 'text-amber-800' },
  { name: 'blue', bg: 'bg-blue-400/25', text: 'text-blue-600', border: 'border-blue-400', badgeBg: 'bg-blue-100', badgeText: 'text-blue-800' },
  { name: 'emerald', bg: 'bg-emerald-400/25', text: 'text-emerald-600', border: 'border-emerald-400', badgeBg: 'bg-emerald-100', badgeText: 'text-emerald-800' },
  { name: 'violet', bg: 'bg-violet-400/25', text: 'text-violet-600', border: 'border-violet-400', badgeBg: 'bg-violet-100', badgeText: 'text-violet-800' },
  { name: 'rose', bg: 'bg-rose-400/25', text: 'text-rose-600', border: 'border-rose-400', badgeBg: 'bg-rose-100', badgeText: 'text-rose-800' },
  { name: 'cyan', bg: 'bg-cyan-400/25', text: 'text-cyan-600', border: 'border-cyan-400', badgeBg: 'bg-cyan-100', badgeText: 'text-cyan-800' },
]

/** 순번을 색으로 — 색 수를 넘어가면 처음부터 돌아간다 */
export const themeAt = (index: number): AnchorTheme => ANCHOR_THEMES[index % ANCHOR_THEMES.length]

/** 사진 색감 — 렌더가 지원하는 값만 둔다 */
export const IMAGE_FILTER_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: '원본' },
  { value: 'vintage', label: '필름' },
  { value: 'sepia', label: '세피아' },
  { value: 'grayscale', label: '흑백' },
  { value: 'duotone', label: '투톤' },
  { value: 'fade', label: '페이드' },
]

/**
 * 사진 카드 — 왼쪽에 큼직한 사진, 오른쪽에 머리띠(이름표·색감·지우기)와 본문(걸리는 구절).
 *
 * 팩션 인물 대사와 담화 발언이 같은 부품을 쓴다. 사진 고르는 창은 부르는 쪽이 띄운다 —
 * 대사 글에서 표식을 눌러도 같은 창이 열려야 해서 여닫는 권한을 부품이 쥐면 안 된다.
 */
export function ImageCard({
  src, crop, inheritedSrc, inheritedCrop, inheritedLabel = '물려받음',
  dnd, onDropImage, onOpenPicker,
  label, theme, filter, onFilterChange, onClearImage, onRemove,
  caption, captionEmpty = '빈 줄', children, width = 280,
}: {
  /** 이 카드에 걸린 사진 주소 (imageSrc 를 거친 값) */
  src?: string
  crop?: ImageCrop
  /** 비었을 때 흐리게 깔아 보여줄 사진 — 어차피 이게 나간다는 표시 */
  inheritedSrc?: string
  inheritedCrop?: ImageCrop
  inheritedLabel?: string
  /** 끌어다 놓기 데이터 종류 — 시리즈별 상수 */
  dnd: string
  onDropImage: (path: string) => void
  onOpenPicker: () => void
  /** 머리띠 이름표 — '#1 시작' 같은 것 */
  label: string
  theme?: AnchorTheme
  /** 색감 — 넘기면 머리띠에 고르는 칸이 뜬다 */
  filter?: string
  onFilterChange?: (filter: string | undefined) => void
  /** 사진만 비우기(자리는 남김) */
  onClearImage?: () => void
  /** 이 자리를 아예 없애기 */
  onRemove?: () => void
  /** 이 사진이 걸리는 대사 구절 */
  caption?: string
  captionEmpty?: string
  /** 본문 아랫단 — 구절 고르기 같은 것 */
  children?: ReactNode
  width?: number
}) {
  const { dragOver, dropProps } = useImageDrop(dnd, onDropImage)
  const borderCls = theme ? theme.border : 'border-border'

  return (
    <div className={`flex shrink-0 flex-row overflow-hidden rounded border bg-bg-card shadow-sm ${borderCls}`} style={{ width }}>
      <button
        type="button"
        onClick={e => { e.stopPropagation(); onOpenPicker() }}
        {...dropProps}
        title="누르면 사진을 고릅니다 · 사진 목록에서 끌어다 놓아도 됩니다"
        className={`relative flex aspect-[4/3] w-28 shrink-0 items-center justify-center overflow-hidden border-e bg-black/5 ${borderCls} ${dragOver ? 'border-accent ring-2 ring-accent' : ''}`}
      >
        {src ? (
          <MediaThumb src={src} alt="" className="h-full w-full object-cover" style={cropToStyle(crop)} />
        ) : inheritedSrc ? (
          <>
            <MediaThumb src={inheritedSrc} alt="" className="h-full w-full object-cover opacity-40 grayscale-[0.5]" style={cropToStyle(inheritedCrop)} />
            <span className="pointer-events-none absolute rounded bg-black/60 px-1.5 py-0.5 text-center text-[10px] font-bold leading-tight text-white shadow-sm">
              {dragOver ? '놓기' : inheritedLabel}
            </span>
          </>
        ) : (
          <span className="text-[10px] text-text-dim">{dragOver ? '놓기' : '사진 고르기'}</span>
        )}
      </button>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className={`flex items-center justify-between border-b px-1.5 py-1 ${theme ? `${theme.badgeBg} ${theme.border}` : 'border-border bg-bg-hover'}`}>
          <span className={`text-[10px] font-black ${theme ? theme.badgeText : 'text-text-secondary'}`}>{label}</span>
          <div className="flex items-center gap-1">
            {onFilterChange && src && (
              <select
                value={filter ?? ''}
                onChange={e => onFilterChange(e.target.value || undefined)}
                onClick={e => e.stopPropagation()}
                className="rounded border border-border bg-bg-main px-1 py-0.5 text-[9px] text-text-secondary hover:border-accent focus:border-accent focus:outline-none"
                title="사진 색감"
              >
                {IMAGE_FILTER_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            )}
            {onClearImage && src && (
              <button
                type="button"
                onClick={e => { e.stopPropagation(); onClearImage() }}
                className="ms-0.5 rounded bg-black/5 px-1.5 py-0.5 text-[10px] text-text-dim hover:bg-amber-100 hover:text-amber-600"
                title="사진만 비웁니다 (자리는 남습니다)"
              >
                △
              </button>
            )}
            {onRemove && (
              <button
                type="button"
                onClick={e => { e.stopPropagation(); onRemove() }}
                className="ms-0.5 p-0.5 text-text-dim hover:text-danger-text"
                title="이 자리를 없앱니다"
              >
                <Trash2 size={12} />
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-1 flex-col justify-center gap-1 bg-bg-main p-1.5">
          {caption !== undefined && (
            <div className="truncate px-1 text-[10px] font-bold text-yellow-600" title={caption || captionEmpty}>
              &quot;{caption || captionEmpty}&quot;
            </div>
          )}
          {children}
        </div>
      </div>
    </div>
  )
}

export function ImageSlot({
  value, onChange, crop, onCropChange, series, episodeName, dnd,
  label, emptyText, inheritedSrc, size = 72, pickerTitle, onUploaded,
  cropFit, captionArea, focus, onFocusChange, filter, onFilterChange, slug,
}: {
  value?: string
  onChange: (next: string | undefined) => void
  crop?: ImageCrop
  onCropChange?: (crop: ImageCrop | undefined) => void
  series: string
  episodeName: string
  /** 끌어다 놓기 데이터 종류 — 시리즈별 상수 */
  dnd: string
  /** 칸 아래 띠에 적히는 이름 */
  label?: string
  /** 비었을 때 안내 문구 */
  emptyText?: string
  /** 비었을 때 대신 나가는 사진 — 흐리게 깔아 보여준다 */
  inheritedSrc?: string
  size?: number
  pickerTitle?: string
  onUploaded?: () => void
  cropFit?: 'cover' | 'contain'
  captionArea?: boolean
  focus?: ImageFocus
  onFocusChange?: (focus: ImageFocus | undefined) => void
  filter?: string
  onFilterChange?: (filter: string | undefined) => void
  slug?: string
}) {
  const [open, setOpen] = useState(false)
  const { dragOver, dropProps } = useImageDrop(dnd, onChange)
  const src = imageSrc(series, episodeName, value)

  return (
    <>
      <div className="inline-flex flex-col items-stretch" style={{ width: size }}>
        <button
          type="button"
          onClick={() => setOpen(true)}
          {...dropProps}
          title={value ? `${value}\n누르면 바꾸기 · 끌어다 놓아도 됩니다` : '누르면 사진 고르기 · 사진 목록에서 끌어다 놓아도 됩니다'}
          className={`relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-md border bg-bg-main ${
            dragOver ? 'border-accent ring-2 ring-accent' : value ? 'border-border hover:border-accent' : 'border-dashed border-border hover:border-accent'
          }`}
        >
          {src ? (
            <MediaThumb src={src} alt="" className="h-full w-full object-cover" style={cropToStyle(crop)} />
          ) : inheritedSrc ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={inheritedSrc} alt="" className="h-full w-full object-cover opacity-30 grayscale" />
              <span className="absolute inset-x-0 bottom-0 bg-bg-main/80 px-1 py-0.5 text-[9px] text-text-dim">물려받음</span>
            </>
          ) : (
            <span className="px-1 text-center text-[10px] leading-tight text-text-dim">사진 없음</span>
          )}
          {dragOver && (
            <span className="absolute inset-0 flex items-center justify-center bg-accent/25 text-[11px] font-bold text-accent">
              연결
            </span>
          )}
        </button>
        {label && <span className="mt-0.5 truncate text-center text-[10px] text-text-secondary">{label}</span>}
        {!value && emptyText && <span className="truncate text-center text-[10px] text-text-dim">{emptyText}</span>}
      </div>

      {open && (
        <ImagePicker
          value={value}
          onChange={onChange}
          crop={crop}
          onCropChange={onCropChange}
          cropFit={cropFit}
          captionArea={captionArea}
          focus={focus}
          onFocusChange={onFocusChange}
          filter={filter}
          onFilterChange={onFilterChange}
          slug={slug}
          series={series}
          episodeName={episodeName}
          onClose={() => setOpen(false)}
          onUploaded={onUploaded}
          title={pickerTitle}
        />
      )}
    </>
  )
}
