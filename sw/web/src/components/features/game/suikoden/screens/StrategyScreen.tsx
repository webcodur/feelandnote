/*
  천도 v2 — 전략 국면. 지도가 판의 중심이고, 땅을 누르면 오른쪽에서 그 땅을 다스린다.
  달을 넘기면 AI 세력이 움직이고 결산 쪽지가 뜬다.
*/
'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { ChevronsRight, Crosshair, Hourglass } from 'lucide-react'
import type { CommandResult } from '@/lib/game/suikoden/commands'
import { countIdle } from '@/lib/game/suikoden/commands'
import { calendarOf } from '@/lib/game/suikoden/constants'
import { resolveEvent, resolvePrisoner, type EventChoice } from '@/lib/game/suikoden/events'
import { type TerritoryId } from '@/lib/game/suikoden/map'
import { officersAt, PLAYER_ID, territoriesOf, turnLimit } from '@/lib/game/suikoden/query'
import { endTurn, factionLedger, foodOutlook, foodPurchaseCost, pendingBlocking } from '@/lib/game/suikoden/turn'
import type { GameState } from '@/lib/game/suikoden/types'
import { launchPlayerAttack } from '@/lib/game/suikoden/war'
import { makeNames, useCheondo } from '../context'
import { useWide } from '../hooks/useWide'
import { WorldMap, type MapMarker } from '../map/WorldMap'
import { ChronicleModal, TurnReportCard } from '../panels/Chronicle'
import DiplomacyPanel from '../panels/DiplomacyPanel'
import EventModal, { nextEvent } from '../panels/EventModal'
import RosterPanel from '../panels/RosterPanel'
import SortiePanel from '../panels/SortiePanel'
import TerritoryPanel, { type Act } from '../panels/TerritoryPanel'
import TopBar from '../panels/TopBar'
import { Kbd, Panel } from '../ui/Frame'
import { INK } from '../ui/theme'

interface StrategyScreenProps {
  game: GameState
  setGame: (s: GameState) => void
  onMenu: () => void
}

export default function StrategyScreen({ game, setGame, onMenu }: StrategyScreenProps) {
  const { roster, T, locale, sfx, toast } = useCheondo()
  const player = game.factions[PLAYER_ID]
  const wide = useWide()
  // 싸움이 끝나 이 화면으로 돌아오면(전투 화면과 갈아 끼워져 새로 선다) 방금 싸운 땅을 비춘다. 아니면 도읍
  const [home] = useState<TerritoryId | null>(() => lastBattleSite(game) ?? player?.capital ?? null)
  // 넓은 화면은 그 땅의 판을 곁에 펼쳐 둔다. 휴대폰은 판이 지도 아래 절반을 덮고 달 넘기기 단추까지 가리므로 눌러야 연다
  const [selected, setSelected] = useState<TerritoryId | null>(wide ? home : null)
  const [focus, setFocus] = useState<TerritoryId | null>(home)
  const [sortie, setSortie] = useState<{ target: TerritoryId; from: TerritoryId | null } | null>(null)
  const [panel, setPanel] = useState<'roster' | 'diplomacy' | 'chronicle' | null>(null)
  const [diploFocus, setDiploFocus] = useState<string | null>(null)
  const [reportTurn, setReportTurn] = useState<number | null>(null)
  const names = useMemo(() => makeNames(roster, locale, T, game), [roster, locale, T, game])

  const act: Act = useCallback((fn: (draft: GameState) => CommandResult) => {
    const draft = structuredClone(game)
    const r = fn(draft)
    if (r.ok) setGame(draft)
    return r
  }, [game, setGame])

  const ledger = useMemo(() => (player ? factionLedger(game, roster, PLAYER_ID) : null), [game, roster, player])
  const food = useMemo(() => (player ? foodOutlook(game, roster, PLAYER_ID) : null), [game, roster, player])
  const idle = countIdle(game, PLAYER_ID)
  const blocking = pendingBlocking(game)
  const event = nextEvent(game)
  const myLands = useMemo(() => territoriesOf(game, PLAYER_ID), [game])

  const markers: MapMarker[] = useMemo(() => {
    const list: MapMarker[] = []
    // 한 땅에 침공이 둘 이상 겹쳐도(여러 세력·여러 물결) 싸움 표지는 하나
    const invaded = new Set<TerritoryId>()
    for (const e of game.events) if (!e.resolved && e.kind === 'invaded' && e.territory) invaded.add(e.territory)
    for (const territory of invaded) list.push({ territory, kind: 'battle' })
    // 지키는 무장이 없는 우리 땅
    for (const t of myLands) if (officersAt(game, t.id, PLAYER_ID).length === 0) list.push({ territory: t.id, kind: 'empty' })
    return list
  }, [game, myLands])

  const doEndTurn = useCallback(() => {
    if (blocking.length > 0) { sfx('lose'); return }
    const next = endTurn(game, roster)
    if (next === game) return
    sfx('confirm')
    setGame(next)
    setReportTurn(next.turn)
  }, [blocking.length, game, roster, setGame, sfx])

  const onResolve = useCallback((eventId: number, choice: EventChoice) => {
    const ev = game.events.find((e) => e.id === eventId)
    const next = resolveEvent(game, roster, eventId, choice)
    setGame(next)
    // 맡겨서 그 자리에서 결판난 수비전은 결과를 알려 준다
    if (ev?.kind === 'invaded' && ev.territory && !next.battle) {
      const held = next.territories[ev.territory].owner === PLAYER_ID
      const place = names.territory(ev.territory)
      toast(held ? T.battle.held(place) : T.battle.lost(place), held ? 'good' : 'bad')
      sfx(held ? 'win' : 'lose')
    } else {
      sfx(choice === 'command' ? 'deploy' : 'click')
    }
  }, [game, roster, setGame, sfx, toast, names, T])

  const onPrisoner = useCallback((heroId: string, action: 'recruit' | 'release' | 'keep') => {
    const { state, result } = resolvePrisoner(game, roster, heroId, action)
    setGame(state)
    sfx(result === 'joined' ? 'confirm' : result === 'refused' ? 'lose' : 'click')
    return result
  }, [game, roster, setGame, sfx])

  const launch = useCallback((from: TerritoryId, target: TerritoryId, ids: string[]) => {
    const draft = structuredClone(game)
    const r = launchPlayerAttack(draft, roster, from, target, ids)
    if (!r.ok) { toast(T.sortie.errors[r.code] ?? T.toast.errors.default, 'bad'); return }
    sfx('deploy')
    setSortie(null)
    setGame(draft)
  }, [game, roster, setGame, sfx, toast, T])

  const cycleIdle = useCallback(() => {
    const withIdle = myLands.filter((t) => Object.values(game.heroes).some((h) => h.faction === PLAYER_ID && h.loc === t.id && !h.acted && (h.status === 'officer' || h.status === 'lord')))
    if (withIdle.length === 0) return
    const i = selected ? withIdle.findIndex((t) => t.id === selected) : -1
    const next = withIdle[(i + 1) % withIdle.length].id
    setSelected(next)
    setFocus(next)
  }, [myLands, game.heroes, selected])

  // 단축키
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || event || sortie || panel) return
      const target = e.target as HTMLElement
      if (target && (target.tagName === 'INPUT' || target.tagName === 'SELECT' || target.tagName === 'TEXTAREA')) return
      const k = e.key.toLowerCase()
      if (k === 'r') { e.preventDefault(); setPanel('roster') }
      else if (k === 'd') { e.preventDefault(); setDiploFocus(null); setPanel('diplomacy') }
      else if (k === 'l') { e.preventDefault(); setPanel('chronicle') }
      else if (k === 'e') { e.preventDefault(); doEndTurn() }
      else if (k === 'tab') { e.preventDefault(); cycleIdle() }
      else if (k === 'escape') { e.preventDefault(); if (selected) setSelected(null); else onMenu() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [event, sortie, panel, doEndTurn, cycleIdle, selected, onMenu])

  const showReport = reportTurn === game.turn && !!game.report

  return (
    <div className="absolute inset-0 flex flex-col">
      <TopBar
        game={game}
        onRoster={() => setPanel('roster')}
        onDiplomacy={() => { setDiploFocus(null); setPanel('diplomacy') }}
        onChronicle={() => setPanel('chronicle')}
        onMenu={onMenu}
        netGold={ledger ? ledger.income.gold - ledger.expense.gold - foodPurchaseCost(game, ledger, PLAYER_ID) : undefined}
        netFood={ledger ? ledger.income.food - ledger.expense.food : undefined}
        food={food}
      />
      <div className="relative min-h-0 flex-1">
        <WorldMap
          className="absolute inset-0"
          state={game}
          selected={selected}
          onSelect={(id) => { sfx('pick'); setSelected(id) }}
          focus={focus}
          markers={markers}
          inset={selected ? (wide ? { right: 412 } : { bottom: '62%' }) : undefined}
          emptyLabel={T.territory.unguarded}
          labelOf={(id) => names.territory(id)}
          ownerName={(owner) => (owner ? (owner === PLAYER_ID ? T.ours : names.faction(owner)) : T.neutral)}
        />

        {/* 오른쪽 — 영토 */}
        {selected && (
          <Panel
            as="aside"
            // flex 열이어야 안쪽 목록이 max-h 안에서 줄어들어 스크롤된다(그냥 블록이면 h-full이 풀리지 않아 아래가 잘린 채 닿지 않았다)
            className="absolute bottom-0 left-0 right-0 flex max-h-[62%] flex-col overflow-hidden md:bottom-auto md:left-auto md:right-3 md:top-3 md:max-h-[calc(100%-6.5rem)] md:w-[400px]"
          >
            <TerritoryPanel
              game={game}
              territory={selected}
              act={act}
              onSortie={(target, from) => setSortie({ target, from: from ?? null })}
              onDiplomacy={(id) => { setDiploFocus(id); setPanel('diplomacy') }}
              onClose={() => setSelected(null)}
            />
          </Panel>
        )}

        {/* 왼쪽 아래 — 결산 */}
        {/* 휴대폰은 아래 서랍·달 넘기기 단추와 겹치지 않게 지도 위쪽에 띄운다(넓은 화면은 왼쪽 아래) */}
        {showReport && (
          <div className="absolute inset-x-2 top-2 z-10 max-h-[36dvh] overflow-y-auto md:bottom-24 md:left-3 md:right-auto md:top-auto md:max-h-none md:overflow-visible">
            <TurnReportCard game={game} onClose={() => setReportTurn(null)} />
          </div>
        )}

        {/* 오른쪽 아래 — 달 넘기기 */}
        <div className={`absolute bottom-3 right-3 flex items-end gap-2 ${selected ? 'max-md:hidden' : ''}`}>
          <button
            type="button"
            onClick={cycleIdle}
            disabled={idle === 0}
            title={`${T.hud.idle(idle)} (Tab)`}
            className="flex h-12 items-center gap-2 border px-3 text-[12px] font-bold text-[#ece6d6] hover:border-[#d4af37]/70 hover:text-[#f3d57a] disabled:opacity-40"
            style={{ borderColor: INK.line, background: 'rgba(10,11,14,0.9)' }}
          >
            <Crosshair size={15} />{T.hud.idle(idle)}
          </button>
          <button
            type="button"
            onClick={doEndTurn}
            className={`group flex h-14 items-center gap-3 border-2 px-5 text-left ${blocking.length > 0 ? 'border-[#c8452d] bg-[#c8452d]/25 hover:bg-[#c8452d]/40' : 'border-[#d4af37] bg-[#d4af37] text-[#14110a] hover:border-[#f3d57a] hover:bg-[#f3d57a]'}`}
          >
            {blocking.length > 0 ? <Hourglass size={20} className="text-[#ffd9cf]" /> : <ChevronsRight size={22} />}
            <span className="leading-tight">
              <span className={`block text-[15px] font-black ${blocking.length > 0 ? 'text-[#ffd9cf]' : ''}`}>{blocking.length > 0 ? T.hud.pending(blocking.length) : T.hud.endTurn}</span>
              <span className={`hidden text-[10px] font-semibold sm:block ${blocking.length > 0 ? 'text-[#ffd9cf]/70' : 'text-[#14110a]/70'}`}>{blocking.length > 0 ? T.hud.resolveFirst : T.hud.toMonth(calendarOf(game.turn + 1).month)} · <Kbd onLight={blocking.length === 0}>E</Kbd></span>
              {/* 휴대폰 윗줄에는 날짜 칸이 없어 오늘 날짜와 남은 세월을 여기 적는다(단축키는 쓸 일이 없다) */}
              <span className={`block text-[10px] font-semibold tabular-nums sm:hidden ${blocking.length > 0 ? 'text-[#ffd9cf]/70' : 'text-[#14110a]/70'}`}>{T.date(calendarOf(game.turn).year, calendarOf(game.turn).month)} · {T.hud.limit(turnLimit(game) - game.turn)}</span>
            </span>
          </button>
        </div>
      </div>

      <SortiePanel game={game} target={sortie?.target ?? null} from={sortie?.from ?? null} onClose={() => setSortie(null)} onLaunch={launch} />
      <RosterPanel open={panel === 'roster'} game={game} onClose={() => setPanel(null)} onPrisoner={onPrisoner} />
      <DiplomacyPanel open={panel === 'diplomacy'} game={game} focus={diploFocus} act={act} onClose={() => setPanel(null)} />
      <ChronicleModal open={panel === 'chronicle'} game={game} onClose={() => setPanel(null)} />
      <EventModal game={game} event={event} onResolve={onResolve} onPrisoner={onPrisoner} />
    </div>
  )
}

/** 이달 우리가 낀 마지막 싸움터 — 전투를 마치고 돌아왔을 때 그 자리를 비춰 다음 물결을 이어 치기 쉽게 한다 */
const BATTLE_LOG_CODES = new Set(['conquer', 'conquer_neutral', 'repelled'])
function lastBattleSite(game: GameState): TerritoryId | null {
  for (let i = game.log.length - 1; i >= 0; i--) {
    const e = game.log[i]
    if (e.turn !== game.turn) break
    if (e.mine && BATTLE_LOG_CODES.has(e.code) && typeof e.params.at === 'string' && e.params.at in game.territories) return e.params.at as TerritoryId
  }
  return null
}
