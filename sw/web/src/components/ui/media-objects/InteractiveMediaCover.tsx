'use client'

import { useEffect, useRef, useState, type HTMLAttributes, type PointerEvent } from 'react'
import { motion, useReducedMotion, useSpring, type MotionStyle } from 'framer-motion'
import { useLinkStatus } from 'next/link'
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import PendingMark from '@/components/ui/pending/PendingMark'
import useMediaQuery from '@/hooks/useMediaQuery'
import { MediaObject, type MediaKind } from './MediaObject'
import useMediaGeometry from './useMediaGeometry'
import './media-objects.css'
import './MediaCover.css'

type Props = { kind: MediaKind; image?: string; title: string; creator?: string; href?: string }

export default function InteractiveMediaCover({ kind, image, title, creator, href }: Props) {
  const t = useTranslations('celebPage')
  const [hovered, setHovered] = useState(false)
  const [focused, setFocused] = useState(false)
  const [pressed, setPressed] = useState(false)
  const reducedMotion = useReducedMotion()
  const active = hovered || focused
  const pointerStart = useRef<{ x: number; y: number } | null>(null)
  const dragged = useRef(false)
  const releaseTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const container = useRef<HTMLDivElement>(null)

  useEffect(() => () => { if (releaseTimer.current) clearTimeout(releaseTimer.current) }, [])
  useEffect(() => {
    const link = !href ? container.current?.closest('a') : null
    if (!link) return
    const focus = () => {
      if (!link.matches(':focus-visible')) return
      setFocused(true)
    }
    const blur = () => { setFocused(false); setPressed(false) }
    const keyDown = (event: KeyboardEvent) => { if (event.key === 'Enter') setPressed(true) }
    const keyUp = (event: KeyboardEvent) => { if (event.key === 'Enter') setPressed(false) }
    link.addEventListener('focus', focus); link.addEventListener('blur', blur)
    link.addEventListener('keydown', keyDown); link.addEventListener('keyup', keyUp)
    return () => {
      link.removeEventListener('focus', focus); link.removeEventListener('blur', blur)
      link.removeEventListener('keydown', keyDown); link.removeEventListener('keyup', keyUp)
    }
  }, [href])

  function isDrag({ clientX, clientY }: { clientX: number; clientY: number }) {
    const start = pointerStart.current
    return !!start && Math.hypot(clientX - start.x, clientY - start.y) > 8
  }

  function detectDrag(event: PointerEvent<HTMLElement>) {
    if (isDrag(event)) {
      dragged.current = true
      setPressed(false)
    }
  }

  const controlProps: HTMLAttributes<HTMLElement> & { 'data-pressed': string } = {
    className: `media-context-cover media-context-${kind} mo-interaction-control`,
    'aria-label': href ? `${title} — ${t('sourceWorkOpen')}` : undefined,
    draggable: false,
    'data-pressed': pressed ? 'true' : 'false',
    onPointerDown: event => {
      if (!event.isPrimary || event.button !== 0) return
      if (releaseTimer.current) clearTimeout(releaseTimer.current)
      pointerStart.current = { x: event.clientX, y: event.clientY }
      dragged.current = false
      setPressed(true)
    },
    onPointerUp: () => setPressed(false),
    onPointerCancel: () => { setPressed(false); pointerStart.current = null },
    onPointerEnter: event => {
      if (event.pointerType === 'mouse') setHovered(true)
    },
    onPointerMove: detectDrag,
    onPointerLeave: () => { setHovered(false); setPressed(false) },
    onFocus: event => {
      if (event.currentTarget.matches(':focus-visible')) setFocused(true)
    },
    onBlur: () => { setFocused(false); setPressed(false) },
    onKeyDown: event => { if (event.key === 'Enter') setPressed(true) },
    onKeyUp: event => { if (event.key === 'Enter') setPressed(false) },
    onClick: event => {
      if (href) event.stopPropagation()
      const moved = event.detail > 0 && (dragged.current || isDrag(event))
      pointerStart.current = null
      dragged.current = false
      if (moved) {
        event.preventDefault()
        event.stopPropagation()
        setPressed(false)
        return
      }
      if (event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) {
        setPressed(true)
        if (releaseTimer.current) clearTimeout(releaseTimer.current)
        releaseTimer.current = setTimeout(() => setPressed(false), 120)
      }
    },
  }
  const artwork = <NavigatingMediaArtwork kind={kind} image={image} title={title} creator={creator}
    active={active} reducedMotion={!!reducedMotion} />
  if (href) return <Link href={href} {...controlProps}>{artwork}</Link>
  return <div ref={container} {...controlProps}>{artwork}</div>
}

function NavigatingMediaArtwork({ kind, image, title, creator, active, reducedMotion }: Omit<Props, 'href'> & {
  active: boolean; reducedMotion: boolean
}) {
  const { pending } = useLinkStatus()
  const t = useTranslations('pending')
  // 모바일의 첫 렌더부터 표지 하나만 그린다. 터치 기기에서는 큰 화면이어도 같은 표현을 쓴다.
  const compact = !useMediaQuery('(min-width: 768px) and (hover: hover) and (pointer: fine)')
  const { ref: artworkRef, style: geometryStyle, onImageLoad, cropped } = useMediaGeometry(kind, image, compact)
  const progress = useSpring(0, { stiffness: 90, damping: 22 })
  const [settledFront, setSettledFront] = useState(false)
  useEffect(() => {
    if (kind !== 'book' || compact || reducedMotion) return
    const start = progress.on('animationStart', () => setSettledFront(false))
    const complete = progress.on('animationComplete', () => setSettledFront(progress.get() === 1))
    return () => { start(); complete() }
  }, [kind, compact, reducedMotion, progress])
  useEffect(() => {
    progress.set(active && !reducedMotion && !compact ? 1 : 0)
  }, [active, reducedMotion, compact, progress])

  return <motion.div ref={artworkRef} className="mo-interactive mo-interaction-art" data-loading={pending ? 'true' : 'false'}
    data-compact={compact ? 'true' : 'false'} data-hovered={active && !compact ? 'true' : 'false'}
    data-book-flat={kind === 'book' && active && settledFront && !compact && !reducedMotion ? 'true' : 'false'} aria-busy={pending}
    style={{ '--mo-hover-progress': reducedMotion || compact ? 0 : progress } as MotionStyle}>
    <MediaObject kind={kind} image={image} title={title} creator={creator} showCover angle="isometric" spinning={false}
      compact={compact} style={geometryStyle} onImageLoad={onImageLoad} cropped={cropped} />
    {pending && <span className="mo-navigation-status" role="status">
      <PendingMark size="sm" />
      <span className="sr-only">{title} — {t('loading')}</span>
    </span>}
  </motion.div>
}
