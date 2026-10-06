'use client'

import { useEffect, useRef, useState, type HTMLAttributes, type PointerEvent } from 'react'
import { motion, useMotionValue, useReducedMotion, useSpring, useTransform, type MotionStyle, type MotionValue } from 'framer-motion'
import { useLinkStatus } from 'next/link'
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import PendingMark from '@/components/ui/pending/PendingMark'
import { MediaObject, type MediaKind } from './MediaObject'
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
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const pointerStart = useRef<{ x: number; y: number } | null>(null)
  const dragged = useRef(false)
  const releaseTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const container = useRef<HTMLDivElement>(null)
  const smoothX = useSpring(x, { stiffness: 180, damping: 22 })
  const smoothY = useSpring(y, { stiffness: 180, damping: 22 })
  const tiltX = useTransform(smoothX, value => `${value}deg`)
  const tiltY = useTransform(smoothY, value => `${value}deg`)

  useEffect(() => () => { if (releaseTimer.current) clearTimeout(releaseTimer.current) }, [])
  useEffect(() => {
    const link = !href ? container.current?.closest('a') : null
    if (!link) return
    const focus = () => {
      if (!link.matches(':focus-visible')) return
      setFocused(true)
      if (kind === 'book' && !reducedMotion) { x.set(-2); y.set(-6) }
    }
    const blur = () => { setFocused(false); setPressed(false); x.set(0); y.set(0) }
    const keyDown = (event: KeyboardEvent) => { if (event.key === 'Enter') setPressed(true) }
    const keyUp = (event: KeyboardEvent) => { if (event.key === 'Enter') setPressed(false) }
    link.addEventListener('focus', focus); link.addEventListener('blur', blur)
    link.addEventListener('keydown', keyDown); link.addEventListener('keyup', keyUp)
    return () => {
      link.removeEventListener('focus', focus); link.removeEventListener('blur', blur)
      link.removeEventListener('keydown', keyDown); link.removeEventListener('keyup', keyUp)
    }
  }, [href, kind, reducedMotion, x, y])

  function followPointer(event: PointerEvent<HTMLElement>) {
    if (pointerStart.current && Math.hypot(event.clientX - pointerStart.current.x, event.clientY - pointerStart.current.y) > 8) {
      dragged.current = true
      setPressed(false)
    }
    if (event.pointerType !== 'mouse' || reducedMotion) return
    if (kind !== 'book' && kind !== 'video') return
    const bounds = event.currentTarget.getBoundingClientRect()
    if (kind === 'video') {
      x.set((.5 - (event.clientY - bounds.top) / bounds.height) * 1.6)
      y.set(((event.clientX - bounds.left) / bounds.width - .5) * 1.5)
      return
    }
    x.set(-2 + (.5 - (event.clientY - bounds.top) / bounds.height) * 6)
    y.set(-6 + ((event.clientX - bounds.left) / bounds.width - .5) * 8)
  }

  const controlProps: HTMLAttributes<HTMLElement> & { 'data-pressed': string } = {
        className: `media-context-cover media-context-${kind} mo-interaction-control`,
        'aria-label': href ? `${title} — ${t('sourceWorkOpen')}` : undefined,
        draggable: false, 'data-pressed': pressed ? 'true' : 'false',
        onPointerDown: event => {
          if (!event.isPrimary || event.button !== 0) return
          if (releaseTimer.current) clearTimeout(releaseTimer.current)
          pointerStart.current = { x: event.clientX, y: event.clientY }; dragged.current = false
          setPressed(true)
        },
        onPointerUp: () => setPressed(false),
        onPointerCancel: () => { setPressed(false); pointerStart.current = null },
        onPointerEnter: event => {
          if (event.pointerType === 'mouse') {
            setHovered(true)
            if (kind === 'book' && !reducedMotion) { x.set(-2); y.set(-6) }
          }
        },
        onPointerMove: followPointer, onPointerLeave: () => {
          setHovered(false); setPressed(false); x.set(0); y.set(0)
        },
        onFocus: event => {
          if (event.currentTarget.matches(':focus-visible')) {
            setFocused(true)
            if (kind === 'book' && !reducedMotion) { x.set(-2); y.set(-6) }
          }
        },
        onBlur: () => { setFocused(false); setPressed(false); x.set(0); y.set(0) },
        onKeyDown: event => { if (event.key === 'Enter') setPressed(true) },
        onKeyUp: event => { if (event.key === 'Enter') setPressed(false) },
        onClick: event => {
          if (href) event.stopPropagation()
          const moved = event.detail > 0 && pointerStart.current && Math.hypot(event.clientX - pointerStart.current.x, event.clientY - pointerStart.current.y) > 8
          pointerStart.current = null
          if (event.detail > 0 && (dragged.current || moved)) { event.preventDefault(); event.stopPropagation(); dragged.current = false; setPressed(false); return }
          dragged.current = false
          if (event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) {
            setPressed(true)
            if (releaseTimer.current) clearTimeout(releaseTimer.current)
            releaseTimer.current = setTimeout(() => setPressed(false), 120)
          }
        },
  }
  const artwork = <NavigatingMediaArtwork kind={kind} image={image} title={title} creator={creator}
    active={active} reducedMotion={!!reducedMotion} tiltX={tiltX} tiltY={tiltY} />
  if (href) return <Link href={href} {...controlProps}>{artwork}</Link>
  return <div ref={container} {...controlProps}>{artwork}</div>
}

function NavigatingMediaArtwork({ kind, image, title, creator, active, reducedMotion, tiltX, tiltY }: Omit<Props, 'href'> & {
  active: boolean; reducedMotion: boolean; tiltX: MotionValue<string>; tiltY: MotionValue<string>
}) {
  const { pending } = useLinkStatus()
  const t = useTranslations('pending')
  const progressTarget = useMotionValue(0)
  const progress = useSpring(progressTarget, { stiffness: 90, damping: 22 })
  useEffect(() => {
    progressTarget.set(active && !reducedMotion ? 1 : 0)
  }, [active, reducedMotion, progressTarget])

  return <motion.div className="mo-interactive mo-interaction-art" data-loading={pending ? 'true' : 'false'}
    data-hovered={active ? 'true' : 'false'} aria-busy={pending}
    style={{ '--mo-tilt-x': tiltX, '--mo-tilt-y': tiltY,
      '--mo-hover-progress': reducedMotion ? 0 : progress } as MotionStyle}>
    <MediaObject kind={kind} image={image} title={title} creator={creator} showCover angle="isometric" spinning={false} />
    {pending && <span className="mo-navigation-status" role="status">
      <PendingMark size="sm" />
      <span className="sr-only">{title} — {t('loading')}</span>
    </span>}
  </motion.div>
}
