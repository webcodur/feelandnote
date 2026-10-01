/*
  천도 v2 — 제목 화면. 양산박 물가를 그린 캔버스 위에 붓글씨 같은 제호와 차림표.
*/
'use client'

import { History, Plus, Star, BookOpen, LogOut, type LucideIcon } from 'lucide-react'

import { useEffect, useRef, useState } from 'react'
import WindsOfLiangshanBackground from '@/components/lab/WindsOfLiangshanBackground'
import { calendarOf } from '@/lib/game/suikoden/constants'
import type { SaveMeta } from '@/lib/game/suikoden/save'
import { useCheondo } from '../context'
import { num } from '../i18n'
import { MusicSlot } from '../ui/Frame'
import { Portrait } from '../ui/HeroBits'
import { INK } from '../ui/theme'

interface TitleScreenProps {
  saveMeta: SaveMeta | null
  onContinue: () => void
  onNew: () => void
  onCodex: () => void
  onHowTo: () => void
  onExit: () => void
}

interface MenuItem {
  key: string
  icon: LucideIcon
  label: string
  sub: string
  onClick: () => void
  primary?: boolean
  lordId?: string
}

export default function TitleScreen({ saveMeta, onContinue, onNew, onCodex, onHowTo, onExit }: TitleScreenProps) {
  const { T, roster, locale, sfx } = useCheondo()
  const [shown, setShown] = useState(false)
  const listRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const id = requestAnimationFrame(() => setShown(true))
    return () => cancelAnimationFrame(id)
  }, [])

  const items: MenuItem[] = []
  if (saveMeta) {
    const lord = roster.byId.get(saveMeta.lordId)
    const { year, month } = calendarOf(saveMeta.turn)
    items.push({
      key: 'continue', icon: History, label: T.title.continue, primary: true, lordId: saveMeta.lordId,
      sub: T.title.continueSub(lord?.name ?? '—', T.date(year, month), saveMeta.phase === 'wander' ? 0 : saveMeta.territories),
      onClick: onContinue,
    })
  }
  items.push(
    { key: 'new', icon: Plus, label: T.title.newGame, sub: T.title.newGameSub, onClick: onNew, primary: !saveMeta },
    { key: 'codex', icon: Star, label: T.title.codex, sub: T.title.codexSub, onClick: onCodex },
    { key: 'howto', icon: BookOpen, label: T.title.howTo, sub: T.title.howToSub, onClick: onHowTo },
    { key: 'exit', icon: LogOut, label: T.exit, sub: T.title.exitSub, onClick: onExit },
  )

  // 위아래 화살표로 차림표를 오간다
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return
      const buttons = Array.from(listRef.current?.querySelectorAll('button') ?? [])
      if (buttons.length === 0) return
      e.preventDefault()
      const i = buttons.indexOf(document.activeElement as HTMLButtonElement)
      const next = e.key === 'ArrowDown' ? (i + 1) % buttons.length : (i - 1 + buttons.length) % buttons.length
      buttons[i < 0 ? 0 : next].focus()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <div className="absolute inset-0 overflow-hidden">
      <div className="absolute inset-0"><WindsOfLiangshanBackground /></div>
      <div className="pointer-events-none absolute inset-0" style={{ background: 'linear-gradient(90deg, rgba(5,7,9,0.88) 0%, rgba(5,7,9,0.55) 38%, rgba(5,7,9,0.15) 62%, rgba(5,7,9,0.55) 100%)' }} />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40" style={{ background: 'linear-gradient(0deg, rgba(5,7,9,0.85), transparent)' }} />
      <MusicSlot className="absolute right-3 top-3 z-10" />

      <div className="relative flex h-full flex-col justify-between gap-8 overflow-y-auto px-6 py-8 sm:px-12 sm:py-12 lg:flex-row lg:items-center lg:px-20">
        {/* 제호 */}
        <div
          className="flex items-start gap-5"
          style={{ opacity: shown ? 1 : 0, transform: shown ? 'none' : 'translateY(8px)', transition: 'opacity 900ms ease-out, transform 900ms ease-out' }}
        >
          <div className="flex flex-col gap-3 pt-3 sm:pt-6">
            <h1 className="text-5xl font-black leading-tight sm:text-7xl" style={{ color: INK.text }}>{T.appName}</h1>
            <p className="text-[11px] font-bold tracking-[0.5em]" style={{ color: INK.gold }}>{T.appEn}</p>
            <p className="max-w-[15rem] text-sm leading-relaxed sm:text-base" style={{ color: INK.text }}>{T.tagline}</p>
            <p className="mt-2 inline-flex w-fit items-center gap-2 border px-2.5 py-1 text-[11px] font-semibold" style={{ borderColor: INK.line, color: INK.sub, background: 'rgba(8,9,12,0.6)' }}>
              <span aria-hidden style={{ color: INK.goldBright }}>✦</span>
              {T.rosterCount(num(locale, roster.heroes.length))}
            </p>
          </div>
        </div>

        {/* 차림표 */}
        <div
          ref={listRef}
          className="flex w-full max-w-md flex-col gap-2 self-end lg:self-center"
          style={{ opacity: shown ? 1 : 0, transition: 'opacity 900ms ease-out 250ms' }}
        >
          {items.map((item) => {
            const Icon = item.icon
            const lord = item.lordId ? roster.byId.get(item.lordId) ?? null : null
            return (
              <button
                key={item.key}
                type="button"
                autoFocus={item.primary}
                onClick={() => { sfx(item.key === 'exit' ? 'click' : 'confirm'); item.onClick() }}
                className={`group flex items-center gap-4 border px-4 py-3 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#f3d57a] ${item.primary ? 'border-[#d4af37]/70 bg-[#d4af37]/[0.12] hover:bg-[#d4af37]/25 hover:border-[#f3d57a]' : 'border-white/10 bg-black/35 hover:border-[#d4af37]/60 hover:bg-black/55'}`}
              >
                <span
                  aria-hidden
                  className={`grid h-10 w-10 shrink-0 place-items-center border text-lg font-black ${item.primary ? 'border-[#f3d57a] text-[#f3d57a]' : 'border-white/15 text-[#a8a293] group-hover:border-[#d4af37]/70 group-hover:text-[#f3d57a]'}`}
                >
                  <Icon size={22} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className={`block text-[15px] font-extrabold ${item.primary ? 'text-[#f3d57a]' : 'text-[#ece6d6] group-hover:text-[#f3d57a]'}`}>{item.label}</span>
                  <span className="block truncate text-[12px]" style={{ color: INK.sub }}>{item.sub}</span>
                </span>
                {lord && <Portrait hero={lord} size={40} ring priority />}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
