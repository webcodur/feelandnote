/*
  천도 v2 — 성명록(星名錄). 합류 순서대로 받은 108성 칭호판과 전체 무장 표, 옥에 갇힌 포로.
*/
'use client'

import { useMemo, useState } from 'react'
import { STAR_COUNT, starLabel, HEAVENLY_COUNT } from '@/lib/game/suikoden/stars'
import { activeStars, heroMaxTroops, membersOf, PLAYER_ID, prisonersOf } from '@/lib/game/suikoden/query'
import type { GameState, Hero, HeroState } from '@/lib/game/suikoden/types'
import { prisonerRecruitChance } from '@/lib/game/suikoden/war'
import { makeNames, useCheondo } from '../context'
import { num } from '../i18n'
import { Chip, GameButton, Meter, PanelTitle } from '../ui/Frame'
import { ClassBadge, GradeBadge, Portrait } from '../ui/HeroBits'
import { Modal } from '../ui/Overlay'
import { INK } from '../ui/theme'

type Tab = 'stars' | 'list' | 'prisoners'
type SortKey = 'star' | 'grade' | 'troops' | 'loyalty' | 'command' | 'martial' | 'intellect' | 'charm'

interface RosterPanelProps {
  open: boolean
  game: GameState
  onClose: () => void
  onPrisoner: (heroId: string, action: 'recruit' | 'release') => string
}

export default function RosterPanel({ open, game, onClose, onPrisoner }: RosterPanelProps) {
  const { T } = useCheondo()
  const f = game.factions[PLAYER_ID]
  return (
    <Modal open={open} onClose={onClose} width={1040} label={T.roster.title}>
      <PanelTitle hanja="錄" title={`${T.roster.title} ${T.roster.hanja}`} sub={f ? T.roster.filled(activeStars(game, PLAYER_ID).length) : ''} />
      {open && f && <RosterBody game={game} onPrisoner={onPrisoner} />}
    </Modal>
  )
}

function RosterBody({ game, onPrisoner }: { game: GameState; onPrisoner: (heroId: string, action: 'recruit' | 'release') => string }) {
  const { T, roster, locale, openHero } = useCheondo()
  const [tab, setTab] = useState<Tab>('stars')
  const [sort, setSort] = useState<SortKey>('star')
  const [results, setResults] = useState<Record<string, string>>({})
  const names = useMemo(() => makeNames(roster, locale, T, game), [roster, locale, T, game])
  const f = game.factions[PLAYER_ID]
  const members = useMemo(() => membersOf(game, PLAYER_ID).map((hs) => ({ hs, hero: roster.byId.get(hs.id)! })).filter((x) => x.hero), [game, roster])
  const prisoners = useMemo(() => prisonersOf(game, PLAYER_ID).map((hs) => ({ hs, hero: roster.byId.get(hs.id)! })).filter((x) => x.hero), [game, roster])
  const sorted = useMemo(() => {
    const list = members.slice()
    list.sort((a, b) => {
      switch (sort) {
        case 'star': return (a.hs.star ?? 999) - (b.hs.star ?? 999)
        case 'grade': return b.hero.score - a.hero.score
        case 'troops': return b.hs.troops - a.hs.troops
        case 'loyalty': return a.hs.loyalty - b.hs.loyalty
        default: return b.hero.stats[sort] - a.hero.stats[sort]
      }
    })
    return list
  }, [members, sort])
  const starSlots = useMemo(() => Array.from({ length: STAR_COUNT }, (_, i) => {
    const id = f.stars[i]
    const hs = id ? game.heroes[id] : undefined
    const active = hs && hs.faction === PLAYER_ID && (hs.status === 'officer' || hs.status === 'lord')
    return { i, id: active ? id : null, gone: !!id && !active }
  }), [f.stars, game.heroes])

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center gap-1.5 border-b px-4 py-2" style={{ borderColor: INK.line }}>
        <Chip active={tab === 'stars'} onClick={() => setTab('stars')}>{T.roster.starsView}</Chip>
        <Chip active={tab === 'list'} onClick={() => setTab('list')}>{T.roster.listView} {members.length}</Chip>
        <Chip active={tab === 'prisoners'} onClick={() => setTab('prisoners')}>{T.roster.prisoners} {prisoners.length}</Chip>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-4">
        {tab === 'stars' && (
          <div className="flex flex-col gap-4">
            {[['天罡', 0, HEAVENLY_COUNT], ['地煞', HEAVENLY_COUNT, STAR_COUNT]].map(([label, from, to]) => (
              <section key={label as string}>
                <h3 className="mb-2 text-[12px] font-black tracking-[0.3em]" style={{ color: INK.gold }}>{label}</h3>
                <div className="grid grid-cols-6 gap-1.5 sm:grid-cols-9 lg:grid-cols-12">
                  {starSlots.slice(from as number, to as number).map((slot) => {
                    const hero = slot.id ? roster.byId.get(slot.id) : null
                    const star = starLabel(slot.i, locale)!
                    return (
                      <button
                        key={slot.i}
                        type="button"
                        disabled={!hero}
                        onClick={() => hero && openHero(hero.id)}
                        className={`flex flex-col items-center gap-1 border p-1 ${hero ? 'border-[#d4af37]/35 bg-[#d4af37]/[0.06] hover:border-[#f3d57a]' : 'border-white/[0.05] bg-black/20'}`}
                        title={hero ? `${star.hanja} ${hero.name}` : star.hanja}
                      >
                        {hero ? <Portrait hero={hero} size={52} /> : <span className="grid h-[52px] w-[52px] place-items-center text-[10px] font-black" style={{ color: slot.gone ? INK.seal : '#2a2b31' }}>{slot.gone ? '去' : '—'}</span>}
                        <span className="text-[9px] font-black leading-none" style={{ color: hero ? INK.goldBright : INK.mute }}>{star.hanja}</span>
                        <span className="w-full truncate text-center text-[10px] font-semibold leading-none" style={{ color: hero ? INK.text : INK.mute }}>{hero ? hero.name : star.text}</span>
                      </button>
                    )
                  })}
                </div>
              </section>
            ))}
          </div>
        )}
        {tab === 'list' && (
          <div className="flex flex-col gap-1 md:hidden">
            {/* 좁은 화면 — 옆으로 밀어 보는 표 대신 무장마다 두 줄. 정렬은 고르개로 */}
            <label className="mb-1 flex items-center gap-2 text-[11px] font-semibold" style={{ color: INK.mute }}>
              {T.roster.sortBy}
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as SortKey)}
                className="h-8 flex-1 border bg-transparent px-2 text-[12px]"
                style={{ borderColor: INK.line, color: INK.text }}
              >
                {SORT_OPTIONS.map((key) => <option key={key} value={key} style={{ background: '#111' }}>{sortLabel(T, key)}</option>)}
              </select>
            </label>
            {sorted.map(({ hs, hero }) => <CompactRow key={hs.id} hs={hs} hero={hero} names={names} />)}
          </div>
        )}
        {tab === 'list' && (
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[820px] border-collapse text-[12px]">
              <thead>
                <tr style={{ color: INK.mute }}>
                  {([['star', T.roster.col.star], ['grade', T.roster.col.name], ['grade', T.roster.col.cls], ['command', T.abilities.command], ['martial', T.abilities.martial], ['intellect', T.abilities.intellect], ['charm', T.abilities.charm], ['troops', T.roster.col.troops], ['loyalty', T.roster.col.loyalty]] as [SortKey, string][]).map(([key, label], i) => (
                    <th key={`${key}-${i}`} className="px-2 py-1.5 text-left font-semibold">
                      <button type="button" onClick={() => setSort(key)} className={sort === key ? 'text-[#f3d57a]' : 'hover:text-[#ece6d6]'}>{label}</button>
                    </th>
                  ))}
                  <th className="px-2 py-1.5 text-left font-semibold">{T.roster.col.loc}</th>
                  <th className="px-2 py-1.5 text-left font-semibold">{T.roster.col.task}</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map(({ hs, hero }) => <Row key={hs.id} hs={hs} hero={hero} game={game} names={names} />)}
              </tbody>
            </table>
          </div>
        )}
        {tab === 'prisoners' && (
          <div className="flex flex-col gap-1.5">
            {prisoners.length === 0 && <p className="text-[12px]" style={{ color: INK.mute }}>{T.roster.empty}</p>}
            {prisoners.map(({ hs, hero }) => {
              const done = results[hs.id]
              return (
                <div key={hs.id} className="flex items-center gap-3 border px-2 py-2" style={{ borderColor: 'rgba(236,230,214,0.07)' }}>
                  <button type="button" onClick={() => openHero(hero.id)}><Portrait hero={hero} size={40} /></button>
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-1.5"><span className="truncate text-[13px] font-bold" style={{ color: INK.text }}>{hero.name}</span><GradeBadge grade={hero.grade} /><ClassBadge cls={hero.cls} /></p>
                    <p className="truncate text-[11px]" style={{ color: INK.sub }}>{names.territory(hs.loc)} · {hs.formerFaction ? names.faction(hs.formerFaction) : T.neutral}</p>
                  </div>
                  {done ? (
                    <span className="text-[12px] font-bold" style={{ color: done === 'joined' ? INK.jade : INK.sub }}>{T.events[done as 'joined' | 'refused' | 'released' | 'kept']}</span>
                  ) : (
                    <div className="flex gap-1">
                      <GameButton size="sm" variant="primary" onClick={() => setResults((r) => ({ ...r, [hs.id]: onPrisoner(hs.id, 'recruit') }))}>{T.events.recruitTry(prisonerRecruitChance(game, roster, PLAYER_ID, hero, hs))}</GameButton>
                      <GameButton size="sm" onClick={() => setResults((r) => ({ ...r, [hs.id]: onPrisoner(hs.id, 'release') }))}>{T.events.free}</GameButton>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

const SORT_OPTIONS: SortKey[] = ['star', 'grade', 'command', 'martial', 'intellect', 'charm', 'troops', 'loyalty']

function sortLabel(T: ReturnType<typeof useCheondo>['T'], key: SortKey): string {
  if (key === 'star') return T.roster.col.star
  if (key === 'grade') return T.roster.col.grade
  if (key === 'troops') return T.roster.col.troops
  if (key === 'loyalty') return T.roster.col.loyalty
  return T.abilities[key]
}

/** 좁은 화면용 한 사람 — 이름·등급·병과 / 능력 넷 / 병력·충성·있는 곳·이번 달 */
function CompactRow({ hs, hero, names }: { hs: HeroState; hero: Hero; names: ReturnType<typeof makeNames> }) {
  const { T, locale, openHero } = useCheondo()
  const star = hs.star !== null ? starLabel(hs.star, locale) : null
  const s = hero.stats
  return (
    <button type="button" onClick={() => openHero(hero.id)} className="flex items-center gap-2 border px-2 py-1.5 text-left hover:border-[#d4af37]/50" style={{ borderColor: 'rgba(236,230,214,0.06)' }}>
      <Portrait hero={hero} size={40} ring={hs.status === 'lord'} />
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5">
          {star && <span className="shrink-0 text-[10px] font-black" style={{ color: INK.gold }}>{star.hanja}</span>}
          <span className="truncate text-[13px] font-bold" style={{ color: INK.text }}>{hero.name}</span>
          <GradeBadge grade={hero.grade} />
          <ClassBadge cls={hero.cls} />
        </span>
        <span className="block truncate text-[11px] tabular-nums" style={{ color: INK.sub }}>
          {T.abilityShort.command}{s.command} · {T.abilityShort.martial}{s.martial} · {T.abilityShort.intellect}{s.intellect} · {T.abilityShort.charm}{s.charm}
        </span>
        <span className="flex items-center gap-2 text-[11px] tabular-nums" style={{ color: INK.sub }}>
          <span>{T.officer.troops} {num(locale, hs.troops)}</span>
          {hs.status !== 'lord' && <span style={{ color: hs.loyalty < 40 ? INK.sealBright : INK.sub }}>{T.officer.loyalty} {hs.loyalty}</span>}
          <span className="truncate">{names.territory(hs.loc)}</span>
          <span className="ml-auto shrink-0 font-semibold" style={{ color: hs.acted ? INK.mute : INK.jade }}>{hs.acted ? (hs.task ? T.officer.tasks[hs.task] : '—') : T.officer.ready}</span>
        </span>
      </span>
    </button>
  )
}

function Row({ hs, hero, game, names }: { hs: HeroState; hero: Hero; game: GameState; names: ReturnType<typeof makeNames> }) {
  const { T, locale, openHero } = useCheondo()
  const star = hs.star !== null ? starLabel(hs.star, locale) : null
  const max = heroMaxTroops(hero, hs, game)
  return (
    <tr className="border-t hover:bg-white/[0.03]" style={{ borderColor: 'rgba(236,230,214,0.05)' }}>
      <td className="px-2 py-1.5 text-[11px] font-black" style={{ color: INK.gold }}>{star?.hanja ?? ''}</td>
      <td className="px-2 py-1.5">
        <button type="button" onClick={() => openHero(hero.id)} className="flex items-center gap-2 text-left hover:text-[#f3d57a]">
          <Portrait hero={hero} size={28} ring={hs.status === 'lord'} />
          <span className="font-bold" style={{ color: INK.text }}>{hero.name}</span>
          <GradeBadge grade={hero.grade} />
        </button>
      </td>
      <td className="px-2 py-1.5"><ClassBadge cls={hero.cls} label={T.classes[hero.cls]} /></td>
      <td className="px-2 py-1.5 tabular-nums" style={{ color: INK.text }}>{hero.stats.command}</td>
      <td className="px-2 py-1.5 tabular-nums" style={{ color: INK.text }}>{hero.stats.martial}</td>
      <td className="px-2 py-1.5 tabular-nums" style={{ color: INK.text }}>{hero.stats.intellect}</td>
      <td className="px-2 py-1.5 tabular-nums" style={{ color: INK.text }}>{hero.stats.charm}</td>
      <td className="w-32 px-2 py-1.5">
        <div className="tabular-nums" style={{ color: INK.text }}>{num(locale, hs.troops)}</div>
        <Meter value={hs.troops} max={max} color={INK.jade} height={3} />
      </td>
      <td className="px-2 py-1.5 tabular-nums" style={{ color: hs.loyalty < 40 ? INK.sealBright : INK.text }}>{hs.status === 'lord' ? '—' : hs.loyalty}</td>
      <td className="px-2 py-1.5" style={{ color: INK.sub }}>{names.territory(hs.loc)}</td>
      <td className="px-2 py-1.5" style={{ color: hs.acted ? INK.sub : INK.jade }}>{hs.acted ? (hs.task ? T.officer.tasks[hs.task] : '—') : T.officer.ready}</td>
    </tr>
  )
}
