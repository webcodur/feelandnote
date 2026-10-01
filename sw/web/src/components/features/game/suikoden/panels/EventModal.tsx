/*
  천도 v2 — 사건 두루마리. 달을 넘기기 전에 답해야 하는 일과 알림을 하나씩 띄운다.
*/
'use client'

import { useMemo, useState } from 'react'
import { Swords, Handshake } from 'lucide-react'
import { LOYALTY } from '@/lib/game/suikoden/constants'
import type { EventChoice } from '@/lib/game/suikoden/events'
import { officersAt, PLAYER_ID } from '@/lib/game/suikoden/query'
import type { GameEvent, GameState } from '@/lib/game/suikoden/types'
import { prisonerRecruitChance } from '@/lib/game/suikoden/war'
import { sortieRatio } from '@/lib/game/suikoden/ai'
import { pickDefenders } from '@/lib/game/suikoden/battle'
import { makeNames, useCheondo } from '../context'
import { pickLine, useLines } from '../hooks/useCheondoData'
import { GameButton, PanelTitle, Seal } from '../ui/Frame'
import { ClassBadge, GradeBadge, Portrait } from '../ui/HeroBits'
import { Modal } from '../ui/Overlay'
import { INK } from '../ui/theme'

const SHOWN = new Set(['invaded', 'visitor', 'discontent', 'proposal', 'prisoners', 'defected', 'faction_fell', 'stars108'])

export function nextEvent(game: GameState): GameEvent | null {
  return game.events.find((e) => !e.resolved && SHOWN.has(e.kind)) ?? null
}

interface EventModalProps {
  game: GameState
  event: GameEvent | null
  onResolve: (eventId: number, choice: EventChoice) => void
  onPrisoner: (heroId: string, action: 'recruit' | 'release' | 'keep') => string
}

export default function EventModal({ game, event, onResolve, onPrisoner }: EventModalProps) {
  return (
    <Modal open={!!event} locked width={560}>
      {event && <EventBody key={event.id} game={game} event={event} onResolve={onResolve} onPrisoner={onPrisoner} />}
    </Modal>
  )
}

function HeroCard({ id }: { id: string }) {
  const { roster, T, openHero } = useCheondo()
  const hero = roster.byId.get(id)
  const lines = useLines([id])
  const greet = pickLine(lines[id], 'greeting', id.charCodeAt(1))
  if (!hero) return null
  return (
    <div className="flex gap-3">
      <button type="button" onClick={() => openHero(id)} className="shrink-0"><Portrait hero={hero} size={88} ring /></button>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5"><GradeBadge grade={hero.grade} /><ClassBadge cls={hero.cls} label={T.classes[hero.cls]} /></div>
        <p className="mt-1 text-lg font-black" style={{ color: INK.text }}>{hero.name}</p>
        <p className="text-[12px]" style={{ color: INK.sub }}>{hero.title}</p>
        {greet && <p className="mt-2 text-[13px] leading-relaxed" style={{ color: INK.text }}>「{greet.text}」</p>}
      </div>
    </div>
  )
}

function EventBody({ game, event, onResolve, onPrisoner }: Omit<EventModalProps, 'event'> & { event: GameEvent }) {
  const { T, roster, locale, openHero } = useCheondo()
  const names = useMemo(() => makeNames(roster, locale, T, game), [roster, locale, T, game])
  const [results, setResults] = useState<Record<string, string>>({})
  const resolve = (choice: EventChoice) => onResolve(event.id, choice)
  const settle = (id: string, action: 'recruit' | 'release') => {
    const result = onPrisoner(id, action)
    setResults((r) => ({ ...r, [id]: result }))
  }

  switch (event.kind) {
    case 'invaded': {
      const attackers = (event.attackers ?? []).map((id) => roster.byId.get(id)).filter(Boolean)
      const defenders = event.territory ? officersAt(game, event.territory, PLAYER_ID).map((hs) => roster.byId.get(hs.id)).filter(Boolean) : []
      const faction = event.factionId ? game.factions[event.factionId] : null
      const fighters = event.territory ? pickDefenders(game, roster, event.territory, PLAYER_ID) : []
      // 적의 승산 비로 본 수비 형세
      const threat = event.territory && fighters.length > 0
        ? sortieRatio(game, roster, (event.attackers ?? []).map((id) => game.heroes[id]).filter(Boolean), event.territory)
        : null
      const outlook = threat === null ? 3 : threat < 0.85 ? 0 : threat < 1.05 ? 1 : threat < 1.5 ? 2 : 3
      return (
        <>
          <PanelTitle hanja="急" title={T.events.invadedTitle} sub={event.territory ? names.territory(event.territory) : ''} />
          <div className="flex flex-col gap-4 p-5">
            <div className="flex items-center gap-3">
              {faction && <Seal color={faction.color} text={roster.byId.get(faction.lordId)?.name ?? ''} size={40} />}
              <p className="text-[15px] font-bold leading-snug" style={{ color: INK.text }}>{T.events.invaded(names.faction(event.factionId ?? ''), names.territory(event.territory ?? ''))}</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="mb-1.5 text-[11px] font-bold" style={{ color: INK.sealBright }}>{T.events.invadedCount(attackers.length)}</p>
                <div className="flex flex-wrap gap-1">{attackers.map((h) => <button key={h!.id} type="button" onClick={() => openHero(h!.id)} title={h!.name}><Portrait hero={h!} size={40} /></button>)}</div>
              </div>
              <div>
                <p className="mb-1.5 text-[11px] font-bold" style={{ color: INK.jade }}>{T.battle.ours} {defenders.length}</p>
                <div className="flex flex-wrap gap-1">{defenders.slice(0, 12).map((h) => <button key={h!.id} type="button" onClick={() => openHero(h!.id)} title={h!.name}><Portrait hero={h!} size={40} /></button>)}</div>
              </div>
            </div>
            {fighters.length === 0 ? (
              <p className="border px-3 py-2 text-[13px] font-semibold leading-relaxed" style={{ borderColor: 'rgba(200,69,45,0.6)', background: 'rgba(200,69,45,0.12)', color: '#ffd9cf' }}>
                {T.events.noDefenders(names.territory(event.territory ?? ''))}
              </p>
            ) : (
              <p className="text-[12px] font-bold" style={{ color: outlook <= 1 ? INK.jade : outlook === 2 ? '#ffcf9e' : INK.sealBright }}>
                {T.events.outlookLabel} · {T.events.outlook[outlook]}
              </p>
            )}
            <div className="flex flex-wrap justify-end gap-2">
              {fighters.length === 0 ? (
                <GameButton variant="danger" onClick={() => resolve('auto')}>{T.events.yield}</GameButton>
              ) : (
                <>
                  <GameButton onClick={() => resolve('auto')}>{T.events.auto}</GameButton>
                  <GameButton variant="danger" onClick={() => resolve('command')}><Swords size={15} />{T.events.command}</GameButton>
                </>
              )}
            </div>
          </div>
        </>
      )
    }
    case 'visitor':
      return (
        <>
          <PanelTitle hanja="客" title={T.events.visitorTitle} sub={event.territory ? names.territory(event.territory) : ''} />
          <div className="flex flex-col gap-4 p-5">
            <p className="text-[13px]" style={{ color: INK.sub }}>{T.events.visitor(names.territory(event.territory ?? ''))}</p>
            {event.heroId && <HeroCard id={event.heroId} />}
            <div className="flex justify-end gap-2">
              <GameButton variant="quiet" onClick={() => resolve('decline')}>{T.events.decline}</GameButton>
              <GameButton variant="primary" onClick={() => resolve('accept')}>{T.events.welcome}</GameButton>
            </div>
          </div>
        </>
      )
    case 'discontent': {
      const hs = event.heroId ? game.heroes[event.heroId] : null
      return (
        <>
          <PanelTitle hanja="憂" title={T.events.discontentTitle} />
          <div className="flex flex-col gap-4 p-5">
            {event.heroId && <HeroCard id={event.heroId} />}
            <p className="text-[13px]" style={{ color: INK.text }}>{T.events.discontent(hs?.loyalty ?? 0)}</p>
            <div className="flex flex-wrap justify-end gap-2">
              <GameButton variant="quiet" onClick={() => resolve('release')}>{T.events.release}</GameButton>
              <GameButton onClick={() => resolve('persuade')}>{T.events.persuade}</GameButton>
              <GameButton variant="primary" disabled={(game.factions[PLAYER_ID]?.gold ?? 0) < LOYALTY.rewardGold} onClick={() => resolve('reward')}>{T.events.reward}</GameButton>
            </div>
          </div>
        </>
      )
    }
    case 'proposal': {
      const faction = event.factionId ? game.factions[event.factionId] : null
      const lord = faction ? roster.byId.get(faction.lordId) : null
      const alliance = event.code === 'alliance'
      return (
        <>
          <PanelTitle hanja="使" title={alliance ? T.events.proposalAlliance : T.events.proposalCeasefire} sub={faction ? names.faction(faction.id) : ''} />
          <div className="flex flex-col gap-4 p-5">
            <div className="flex items-center gap-3">
              {lord && <Portrait hero={lord} size={64} ring />}
              <p className="text-[14px] leading-relaxed" style={{ color: INK.text }}>
                {alliance ? T.events.alliance(names.faction(event.factionId ?? '')) : T.events.ceasefire(names.faction(event.factionId ?? ''), event.amount ?? 0)}
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <GameButton variant="quiet" onClick={() => resolve('decline')}>{T.events.refuseOffer}</GameButton>
              <GameButton variant="jade" onClick={() => resolve('accept')}><Handshake size={15} />{T.events.accept}</GameButton>
            </div>
          </div>
        </>
      )
    }
    case 'prisoners': {
      const list = (event.prisoners ?? []).filter((id) => game.heroes[id])
      return (
        <>
          <PanelTitle hanja="囚" title={T.events.prisonersTitle} sub={T.events.prisoners} />
          <div className="flex flex-col gap-2 overflow-y-auto p-4">
            {list.map((id) => {
              const hero = roster.byId.get(id)!
              const hs = game.heroes[id]
              const done = results[id]
              const p = hs && hs.status === 'prisoner' ? prisonerRecruitChance(game, roster, PLAYER_ID, hero, hs) : 0
              return (
                <div key={id} className="flex items-center gap-3 border px-2 py-2" style={{ borderColor: 'rgba(236,230,214,0.07)' }}>
                  <button type="button" onClick={() => openHero(id)}><Portrait hero={hero} size={44} /></button>
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-1.5"><span className="truncate text-[13px] font-bold" style={{ color: INK.text }}>{hero.name}</span><GradeBadge grade={hero.grade} /></p>
                    <p className="truncate text-[11px]" style={{ color: INK.sub }}>{hs?.formerFaction ? names.faction(hs.formerFaction) : T.neutral}</p>
                  </div>
                  {done ? (
                    <span className="text-[12px] font-bold" style={{ color: done === 'joined' ? INK.jade : INK.sub }}>{T.events[done as 'joined' | 'refused' | 'released' | 'kept']}</span>
                  ) : hs?.status === 'prisoner' ? (
                    <div className="flex flex-wrap justify-end gap-1">
                      {/* 처분(판을 바꾸는 일)은 누를 때 한 번만 — 상태 갱신 함수 안에서 부르면 그리는 도중에 판이 바뀌고, 개발 모드에서는 두 번 굴린다 */}
                      <GameButton size="sm" variant="primary" onClick={() => settle(id, 'recruit')}>{T.events.recruitTry(p)}</GameButton>
                      <GameButton size="sm" onClick={() => settle(id, 'release')}>{T.events.free}</GameButton>
                    </div>
                  ) : null}
                </div>
              )
            })}
            <div className="mt-2 flex justify-end">
              <GameButton variant="primary" onClick={() => resolve('ok')}>{T.ok}</GameButton>
            </div>
          </div>
        </>
      )
    }
    case 'defected': {
      const gone = event.heroes?.length ? event.heroes : event.heroId ? [event.heroId] : []
      return (
        <>
          <PanelTitle hanja="去" title={gone.length > 1 ? T.events.defectedMany(gone.length) : T.events.defectedTitle} />
          <div className="flex flex-col gap-4 p-5">
            {gone.length === 1 && <HeroCard id={gone[0]} />}
            {gone.length > 1 && (
              <ul className="flex max-h-64 flex-wrap gap-2 overflow-y-auto">
                {gone.map((id) => {
                  const h = roster.byId.get(id)
                  return h ? (
                    <li key={id} className="flex w-[8.5rem] items-center gap-2 border px-2 py-1.5" style={{ borderColor: INK.line }}>
                      <Portrait hero={h} size={28} />
                      <span className="truncate text-[12px] font-semibold" style={{ color: INK.text }}>{h.name}</span>
                    </li>
                  ) : null
                })}
              </ul>
            )}
            <p className="text-[13px]" style={{ color: INK.sub }}>{T.events.defected}</p>
            <div className="flex justify-end"><GameButton onClick={() => resolve('ok')}>{T.ok}</GameButton></div>
          </div>
        </>
      )
    }
    case 'faction_fell': {
      const lord = event.heroId ? roster.byId.get(event.heroId) : null
      return (
        <>
          <PanelTitle hanja="亡" title={T.events.fellTitle} />
          <div className="flex flex-col gap-4 p-5">
            <div className="flex items-center gap-3">
              {lord && <Portrait hero={lord} size={64} dim />}
              <p className="text-[14px]" style={{ color: INK.text }}>{T.events.fell(lord ? T.faction(lord.name) : '')}</p>
            </div>
            <div className="flex justify-end"><GameButton onClick={() => resolve('ok')}>{T.ok}</GameButton></div>
          </div>
        </>
      )
    }
    case 'stars108':
      return (
        <>
          <PanelTitle hanja="星" title={T.events.starsTitle} />
          <div className="flex flex-col items-center gap-4 p-6 text-center">
            <p className="cheondo-stamp text-5xl font-black" style={{ color: INK.goldBright }}>一百八星</p>
            <p className="text-[14px] leading-relaxed" style={{ color: INK.text }}>{T.events.stars}</p>
            <GameButton variant="primary" onClick={() => resolve('ok')}>{T.ok}</GameButton>
          </div>
        </>
      )
    default:
      return (
        <div className="flex justify-end p-5"><GameButton onClick={() => resolve('ok')}>{T.ok}</GameButton></div>
      )
  }
}
