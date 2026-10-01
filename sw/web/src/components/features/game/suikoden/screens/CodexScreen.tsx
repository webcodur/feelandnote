/*
  천도 v2 — 성도(星圖). 판을 넘어 쌓인 만남과 함께함을 한눈에.
  아직 모르는 사람은 실루엣으로 둔다 — 누가 있는지 궁금하게.
*/
'use client'

import { useDeferredValue, useMemo, useState } from 'react'
import { ArrowLeft, Search } from 'lucide-react'
import { readCodex } from '@/lib/game/suikoden/codex'
import { starLabel } from '@/lib/game/suikoden/stars'
import { useCheondo } from '../context'
import { num } from '../i18n'
import { useWide } from '../hooks/useWide'
import { Chip, GameButton, MusicSlot } from '../ui/Frame'
import { GradeBadge, Portrait } from '../ui/HeroBits'
import { INK } from '../ui/theme'
import { VirtualGrid } from '../ui/VirtualGrid'

type Filter = 'all' | 'met' | 'joined'

export default function CodexScreen({ onBack }: { onBack: () => void }) {
  const { roster, T, locale, openHero } = useCheondo()
  const [codex] = useState(() => readCodex())
  const [filter, setFilter] = useState<Filter>('all')
  const [query, setQuery] = useState('')
  const q = useDeferredValue(query).trim().toLowerCase()

  const counts = useMemo(() => {
    let met = 0
    let joined = 0
    for (const e of Object.values(codex)) {
      if (e.level >= 1) met++
      if (e.level >= 2) joined++
    }
    return { met, joined }
  }, [codex])

  const list = useMemo(() => {
    const items = roster.heroes.filter((h) => {
      const e = codex[h.id]
      if (filter === 'met' && !e) return false
      if (filter === 'joined' && (!e || e.level < 2)) return false
      if (q) {
        if (!e) return false
        if (!h.name.toLowerCase().includes(q) && !h.title.toLowerCase().includes(q)) return false
      }
      return true
    })
    return items.sort((a, b) => (codex[b.id]?.level ?? 0) - (codex[a.id]?.level ?? 0) || b.score - a.score)
  }, [roster, codex, filter, q])

  const progress = T.codex.progress(num(locale, counts.met), num(locale, counts.joined), num(locale, roster.heroes.length))
  // 5천 명 넘는 도감이라 휴대폰은 얼굴을 줄여 한 줄에 넷씩 담는다
  const wide = useWide()
  const face = wide ? 76 : 60

  return (
    <div className="absolute inset-0 flex flex-col" style={{ background: `radial-gradient(ellipse at 50% -10%, #17161f 0%, ${INK.bg} 60%)` }}>
      {/* 휴대폰은 설명 대신 모은 수를 제목 아래에 두고, 뒤로는 화살표만 둔다 */}
      <header className="flex shrink-0 items-center gap-2 border-b px-3 py-3 sm:gap-3 sm:px-6" style={{ borderColor: INK.line }}>
        <GameButton variant="quiet" size="sm" onClick={onBack} aria-label={T.back} className="max-sm:px-2"><ArrowLeft size={16} /><span className="max-sm:hidden">{T.back}</span></GameButton>
        <span className="hidden h-9 w-9 shrink-0 place-items-center border text-lg font-black sm:grid" style={{ borderColor: INK.lineStrong, color: INK.goldBright }} aria-hidden>{T.codex.hanja.slice(0, 1)}</span>
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-black" style={{ color: INK.text }}>{T.codex.title} <span className="text-sm font-bold" style={{ color: INK.gold }}>{T.codex.hanja}</span></h2>
          <p className="truncate text-[12px] max-sm:hidden" style={{ color: INK.sub }}>{T.codex.desc}</p>
          <p className="truncate text-[12px] font-bold tabular-nums sm:hidden" style={{ color: INK.text }}>{progress}</p>
        </div>
        <p className="hidden shrink-0 text-[13px] font-bold tabular-nums sm:block" style={{ color: INK.text }}>{progress}</p>
        <MusicSlot className="w-8 sm:w-9" />
      </header>
      <div className="flex shrink-0 flex-wrap items-center gap-2 px-4 py-3 sm:px-6">
        <Chip active={filter === 'all'} onClick={() => setFilter('all')}>{T.codex.filterAll}</Chip>
        <Chip active={filter === 'met'} onClick={() => setFilter('met')}>{T.codex.filterMet}</Chip>
        <Chip active={filter === 'joined'} onClick={() => setFilter('joined')}>{T.codex.filterJoined}</Chip>
        <label className="flex h-8 w-full items-center gap-2 border px-2.5 sm:ml-auto sm:w-56" style={{ borderColor: INK.line }}>
          <Search size={13} style={{ color: INK.sub }} aria-hidden />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={T.select.search} aria-label={T.select.search} className="h-full min-w-0 flex-1 bg-transparent text-[13px] outline-none" style={{ color: INK.text }} />
        </label>
      </div>
      <div className="relative mx-4 mb-4 h-1 overflow-hidden bg-white/[0.06] sm:mx-6" aria-hidden>
        <div className="absolute inset-y-0 left-0" style={{ width: `${(counts.met / roster.heroes.length) * 100}%`, background: 'rgba(243,213,122,0.35)' }} />
        <div className="absolute inset-y-0 left-0" style={{ width: `${(counts.joined / roster.heroes.length) * 100}%`, background: INK.goldBright }} />
      </div>
      <VirtualGrid
        className="min-h-0 flex-1 px-4 pb-6 sm:px-6"
        items={list}
        minWidth={wide ? 112 : 76}
        rowHeight={wide ? 150 : 122}
        gap={wide ? 10 : 6}
        resetKey={`${filter}|${q}`}
        getKey={(h) => h.id}
        render={(h) => {
          const e = codex[h.id]
          const known = !!e
          const star = e?.star !== undefined ? starLabel(e.star, locale) : null
          return (
            <button
              type="button"
              disabled={!known}
              onClick={() => openHero(h.id)}
              className={`flex h-full w-full flex-col items-center gap-1.5 border p-1.5 text-center md:p-2 ${known ? 'border-white/[0.08] bg-white/[0.03] hover:border-[#d4af37]/60' : 'border-white/[0.04] bg-black/20'}`}
            >
              <span className="relative">
                {known ? (
                  <Portrait hero={h} size={face} dim={e.level < 2} ring={e.level >= 2} />
                ) : (
                  <span className="grid place-items-center text-2xl font-black" style={{ width: face, height: face, background: '#0c0d10', color: '#23242a' }} aria-hidden>?</span>
                )}
                {e?.lord ? <span className="absolute -right-1 -top-1 grid h-5 w-5 place-items-center rounded-full text-[10px] font-black" style={{ background: INK.seal, color: '#fff' }} title={T.codex.lordTimes(e.lord)}>主</span> : null}
              </span>
              <span className="w-full truncate text-[12px] font-bold" style={{ color: known ? INK.text : INK.mute }}>{known ? h.name : T.codex.unknown}</span>
              {known ? (
                <span className="flex items-center gap-1">
                  <GradeBadge grade={h.grade} />
                  {star && <span className="text-[10px] font-bold" style={{ color: INK.gold }}>{star.hanja}</span>}
                </span>
              ) : <span className="h-[18px]" />}
            </button>
          )
        }}
      />
    </div>
  )
}
