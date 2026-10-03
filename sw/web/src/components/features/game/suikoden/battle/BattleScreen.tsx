/*
  천도 v2 — 합전. 양 진영 앞줄·뒷줄 세 칸씩. 위에는 행동 순서, 아래에는 지금 차례인 부대의 명령.
  적 차례와 자동 전투는 저절로 흐르고, 배속을 바꿀 수 있다. 일기토는 따로 겨룬다.
*/
'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { FastForward, Flag, Play, Shield, Sparkles, Swords, Zap, Crown, Building2, Trophy, X } from 'lucide-react'
import {
  autoDuel, availableActions, applyAction, closeDuel, duelRound, isPlayerTurn, nextActor, refuseDuel, retreat, stepAuto, swapPositions, timeline, unitById,
} from '@/lib/game/suikoden/battle'
import { BATTLE, CLASSES, SKILL_TARGET } from '@/lib/game/suikoden/constants'
import { PLAYER_ID } from '@/lib/game/suikoden/query'
import type { BattleSide, BattleState, BattleUnit, DuelMove, GameState } from '@/lib/game/suikoden/types'
import { finishBattle } from '@/lib/game/suikoden/war'
import { makeNames, useCheondo } from '../context'
import { pickLine, useLines } from '../hooks/useCheondoData'
import { formatBattleLog, num } from '../i18n'
import { territoryArt } from '../ui/art'
import { GameButton, Meter, MusicSlot, Panel } from '../ui/Frame'
import { GradeBadge, Portrait } from '../ui/HeroBits'
import { Modal } from '../ui/Overlay'
import { alpha, INK } from '../ui/theme'
import DuelOverlay from './DuelOverlay'

interface BattleScreenProps {
  game: GameState
  setGame: (s: GameState) => void
}

type Pending = { kind: 'attack' | 'skill' | 'duel' } | null

const STEP_MS = { 1: 850, 2: 430, 3: 190 } as const

export default function BattleScreen({ game, setGame }: BattleScreenProps) {
  const { roster, T, locale, sfx, voice } = useCheondo()
  const b = game.battle!
  const names = useMemo(() => makeNames(roster, locale, T, game), [roster, locale, T, game])
  const scene = territoryArt(b.territory, 'scene')
  const playerSide: BattleSide | null = b.playerSide
  const [started, setStarted] = useState(() => b.log.length > 0 || !playerSide)
  const [swapFrom, setSwapFrom] = useState<string | null>(null)
  const [pending, setPending] = useState<Pending>(null)
  const [confirmRetreat, setConfirmRetreat] = useState(false)
  const [hiddenBark, setHiddenBark] = useState(0)
  const speed = game.settings.battleSpeed
  const auto = game.settings.autoBattle
  const heroIds = useMemo(() => b.units.filter((u) => !u.militia).map((u) => u.heroId), [b.units])
  const lines = useLines(heroIds.slice(0, 12))

  // 기술·일기토·회심의 일격이 나오면 그 부대가 외친다
  const fxNow = b.fx
  const barkLines = fxNow ? lines[fxNow.actor] : null
  const barkSource = useMemo(() => {
    if (!fxNow || !(fxNow.kind === 'skill' || fxNow.kind === 'duel' || fxNow.kind === 'buff' || fxNow.kind === 'crit')) return null
    const line = pickLine(barkLines, 'clash', fxNow.id)
    return line ? { id: fxNow.id, heroId: fxNow.actor, text: line.text, variant: line.variant } : null
  }, [fxNow, barkLines])

  const actor = nextActor(b)
  const myTurn = started && isPlayerTurn(b) && !auto
  const actions = actor && myTurn ? availableActions(b, actor) : null

  const mutate = useCallback((fn: (draft: GameState) => void) => {
    const draft = structuredClone(game)
    fn(draft)
    setGame(draft)
  }, [game, setGame])

  // 자동 진행 — 적 차례, 자동 전투, 결투가 끝난 뒤
  useEffect(() => {
    if (!started || b.result) return
    if (b.duel) {
      if (b.duel.done) {
        const id = window.setTimeout(() => mutate((d) => closeDuel(d.battle!)), 1400)
        return () => window.clearTimeout(id)
      }
      if (auto) {
        const id = window.setTimeout(() => mutate((d) => autoDuel(d.battle!, d)), 500)
        return () => window.clearTimeout(id)
      }
      return
    }
    if (myTurn) return
    const id = window.setTimeout(() => mutate((d) => stepAuto(d.battle!, d)), STEP_MS[speed])
    return () => window.clearTimeout(id)
  }, [started, b.result, b.duel, myTurn, speed, auto, mutate, b.fxSeq])

  // 효과음·외침
  const lastFx = useRef(0)
  useEffect(() => {
    const fx = b.fx
    if (!fx || fx.id === lastFx.current) return
    lastFx.current = fx.id
    if (fx.kind === 'hit') sfx('slash')
    else if (fx.kind === 'crit') sfx('assault')
    else if (fx.kind === 'skill') sfx(fx.skill === 'fire' || fx.skill === 'confuse' ? 'stratagem' : 'clang')
    else if (fx.kind === 'heal' || fx.kind === 'buff') sfx('govern')
    else if (fx.kind === 'duel') sfx('clang')
    if (barkSource) {
      const hero = roster.byId.get(barkSource.heroId)
      if (hero && unitById(b, barkSource.heroId)?.side === playerSide) voice(hero, 'clash', barkSource.variant)
    }
  }, [b.fx, b, sfx, roster, voice, playerSide, barkSource])

  // 외침은 1.8초 뒤 걷힌다 — 걷는 일만 타이머가 하고, 무엇을 외칠지는 그릴 때 정한다
  useEffect(() => {
    if (!barkSource) return
    const id = window.setTimeout(() => setHiddenBark(barkSource.id), 1800)
    return () => window.clearTimeout(id)
  }, [barkSource])

  // 우리 쪽 대장 — 군주가 나왔으면 군주, 아니면 가장 이름난 부대. 싸움을 열고 닫는 말을 맡는다
  const lead = useMemo(() => {
    if (!playerSide) return null
    const ours = b.units.filter((u) => u.side === playerSide && !u.militia)
    const top = ours.find((u) => u.isLord) ?? ours.sort((x, y) => (roster.byId.get(y.heroId)?.score ?? 0) - (roster.byId.get(x.heroId)?.score ?? 0))[0]
    return top ? roster.byId.get(top.heroId) ?? null : null
  }, [b.units, playerSide, roster])
  const [opening, setOpening] = useState<{ id: number; heroId: string; text: string; variant: number } | null>(null)
  const begin = () => {
    sfx('start')
    setStarted(true)
    setSwapFrom(null)
    const line = lead ? pickLine(lines[lead.id], 'deploy', b.territory.length + game.turn) : null
    if (lead && line) {
      setOpening({ id: -1, heroId: lead.id, text: line.text, variant: line.variant })
      voice(lead, 'deploy', line.variant)
      window.setTimeout(() => setOpening(null), 2400)
    }
  }
  const bark = barkSource && barkSource.id !== hiddenBark ? barkSource : opening

  // 끝나면 대장이 이긴 말·진 말을 남긴다
  const won = playerSide && b.result ? b.result === playerSide : null
  const closing = lead && won !== null ? pickLine(lines[lead.id], won ? 'win' : 'lose', game.turn) : null

  // 결과 소리
  const resultPlayed = useRef(false)
  useEffect(() => {
    if (!b.result || resultPlayed.current) return
    resultPlayed.current = true
    sfx(won === false ? 'lose' : 'win')
    if (lead && closing && won !== null) voice(lead, won ? 'win' : 'lose', closing.variant)
  }, [b.result, won, sfx, lead, closing, voice])

  const act = (kind: 'attack' | 'skill' | 'duel' | 'guard', target?: string) => {
    if (!actor) return
    setPending(null)
    mutate((d) => applyAction(d.battle!, d, { kind, actor: actor.heroId, target }))
  }

  const onUnitClick = (u: BattleUnit) => {
    if (!started) {
      if (u.side !== playerSide) return
      if (!swapFrom) { setSwapFrom(u.heroId); sfx('pick'); return }
      if (swapFrom === u.heroId) { setSwapFrom(null); return }
      const from = swapFrom
      mutate((d) => {
        const a = unitById(d.battle!, from)!
        swapPositions(d.battle!, u.heroId, a.row, a.col)
        swapPositions(d.battle!, from, u.row, u.col)
      })
      setSwapFrom(null)
      sfx('click')
      return
    }
    if (!pending || !actions || !actor) return
    const list = pending.kind === 'attack' ? actions.attack : pending.kind === 'skill' ? actions.skill : actions.duel
    if (!list.some((x) => x.heroId === u.heroId)) return
    act(pending.kind, u.heroId)
  }

  // 여섯 칸 남짓이라 그릴 때마다 새로 셈한다(actions가 매번 새로 나오므로 기억해 둘 까닭이 없다)
  const targetList = !pending || !actions ? [] : pending.kind === 'attack' ? actions.attack : pending.kind === 'skill' ? actions.skill : actions.duel
  const targetable = new Set(targetList.map((u) => u.heroId))

  const setSetting = (patch: Partial<GameState['settings']>) => mutate((d) => { d.settings = { ...d.settings, ...patch } })

  const order = timeline(b, 10)
  const nameOf = (id: string) => {
    if (id.startsWith('militia:')) return `${T.battle.militia} ${Number(id.split(':')[2]) + 1}`
    return names.hero(id)
  }
  const sideLabel = (side: BattleSide) => {
    const fid = side === 'attacker' ? b.attacker : b.defender
    if (!fid) return T.neutral
    return fid === PLAYER_ID ? T.battle.ours : names.faction(fid)
  }
  const leftSide: BattleSide = playerSide ?? 'attacker'
  const rightSide: BattleSide = leftSide === 'attacker' ? 'defender' : 'attacker'

  const skillMode = actor ? SKILL_TARGET[actor.skill] : null
  const onSkill = () => {
    if (!actor || !actions?.skillReady) return
    if (skillMode === 'allies' || skillMode === 'self') act('skill')
    else setPending({ kind: 'skill' })
  }

  const recentLog = b.log.slice(-4)
  const lastLog = b.log.length > 0 ? b.log[b.log.length - 1] : null

  return (
    <div className="absolute inset-0 flex flex-col overflow-hidden" style={{ background: `radial-gradient(ellipse at 50% 55%, #1d1712 0%, #0b0a09 55%, #050506 100%)` }}>
      {/* 싸우는 땅의 풍경 — 부대 카드가 읽히도록 흐리고 어둡게 깐다 */}
      {scene && (
        <>
          {/* 크게 키우면(transform) 넘친 만큼 화면이 밀려 윗줄이 잘린다 — 제자리 크기로만 깐다 */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={scene} alt="" aria-hidden decoding="async" className="pointer-events-none absolute inset-0 h-full w-full select-none object-cover" style={{ opacity: 0.5, filter: 'blur(2px) saturate(0.8)' }} />
          <span aria-hidden className="pointer-events-none absolute inset-0" style={{ background: 'radial-gradient(ellipse at 50% 50%, rgba(10,9,8,0.35) 0%, rgba(8,8,9,0.8) 62%, rgba(5,5,6,0.95) 100%)' }} />
        </>
      )}
      {/* 배경 글씨 */}
      <div className="pointer-events-none absolute inset-0 grid place-items-center overflow-hidden" aria-hidden>
      </div>

      {/* 윗줄 */}
      {/* 넓은 화면: 사기 · 땅과 합 · 사기 · 단추가 한 줄. 휴대폰: 첫 줄에 두 사기 막대를 반씩, 둘째 줄에 땅과 합(왼쪽)·단추(오른쪽) */}
      <header className="relative z-10 flex flex-wrap items-center gap-x-3 gap-y-2 border-b px-3 py-2 sm:px-4" style={{ borderColor: INK.line, background: 'rgba(8,8,10,0.85)' }}>
        <MoraleBar label={sideLabel(leftSide)} value={b.morale[leftSide]} color={leftSide === playerSide ? INK.jade : INK.gold} />
        <div className="text-center max-sm:order-1 max-sm:flex max-sm:min-w-0 max-sm:flex-1 max-sm:basis-0 max-sm:items-baseline max-sm:gap-2 max-sm:text-left">
          <p className="min-w-0 truncate text-[11px] font-bold" style={{ color: INK.gold }}>{names.territory(b.territory)}</p>
          <p className="shrink-0 whitespace-nowrap text-[14px] font-black tabular-nums" style={{ color: INK.text }}>{T.battle.round(b.round, b.maxRounds)}</p>
        </div>
        <MoraleBar label={sideLabel(rightSide)} value={b.morale[rightSide]} color={INK.sealBright} right />
        <div className="ml-auto flex shrink-0 items-center gap-1 max-sm:order-2">
          {playerSide && (
            <>
              <GameButton size="sm" variant={auto ? 'jade' : 'ghost'} onClick={() => setSetting({ autoBattle: !auto })} aria-pressed={auto} className="max-sm:gap-1 max-sm:px-2"><Play size={13} />{T.battle.auto}</GameButton>
              <GameButton size="sm" onClick={() => setSetting({ battleSpeed: ((speed % 3) + 1) as 1 | 2 | 3 })} title={T.battle.speed} className="max-sm:gap-1 max-sm:px-2"><FastForward size={13} />×{speed}</GameButton>
              <GameButton size="sm" variant="danger" disabled={!!b.result} onClick={() => setConfirmRetreat(true)} className="max-sm:gap-1 max-sm:px-2"><Flag size={13} />{T.battle.retreat}</GameButton>
            </>
          )}
          <MusicSlot className="h-8 w-8" />
        </div>
      </header>

      {/* 행동 순서 */}
      <div className="relative z-10 flex items-center gap-1.5 overflow-x-auto px-3 py-2 sm:px-4" aria-label={T.battle.turnOrder}>
        {order.map((o, i) => {
          const u = unitById(b, o.heroId)
          const hero = roster.byId.get(o.heroId) ?? null
          const mine = o.side === playerSide
          return (
            <div key={`${o.heroId}-${i}`} className="relative shrink-0" title={nameOf(o.heroId)} style={{ opacity: i === 0 ? 1 : 0.85 - i * 0.05 }}>
              <div className={i === 0 ? 'cheondo-turn' : ''} style={{ borderRadius: 3, boxShadow: i === 0 ? undefined : `0 0 0 2px ${mine ? alpha(INK.jade, 0.8) : alpha(INK.seal, 0.8)}` }}>
                {u?.militia ? <MilitiaFace size={i === 0 ? 44 : 34} /> : <Portrait hero={hero} size={i === 0 ? 44 : 34} />}
              </div>
            </div>
          )
        })}
        {actor && (
          // 싸움 전(진형 짜기)에는 누가 먼저 나서는지 알려 준다 — 앞자리를 누구에게 맡길지 고르는 단서다
          <span className="ml-2 shrink-0 text-[12px] font-semibold" style={{ color: myTurn || (!started && actor.side === playerSide) ? INK.goldBright : INK.sub }}>
            {!started ? T.battle.firstMove(nameOf(actor.heroId)) : myTurn ? nameOf(actor.heroId) : b.result ? '' : auto && actor.side === playerSide ? T.battle.auto : T.battle.enemyTurn}
          </span>
        )}
      </div>

      {/* 외침·전황 한 줄 — 부대 카드를 덮지 않도록 제 자리를 늘 비워 둔다. 좁은 화면은 아래 전황 줄이 없어 마지막 일을 여기 적는다 */}
      <div className="relative z-10 flex h-10 shrink-0 items-center justify-center px-3 text-center" aria-live="polite">
        {bark ? (
          <p key={`bark-${bark.id}`} className="cheondo-rise line-clamp-2 text-[13px] font-semibold leading-snug" style={{ color: INK.text }}>
            <span className="mr-1.5 text-[12px] font-bold" style={{ color: unitById(b, bark.heroId)?.side === playerSide ? INK.goldBright : '#ffb8a6' }}>{nameOf(bark.heroId)}</span>
            「{bark.text}」
          </p>
        ) : lastLog ? (
          <p className="line-clamp-2 text-[12px] leading-snug md:hidden" style={{ color: INK.sub }}>{formatBattleLog(locale, lastLog, nameOf)}</p>
        ) : null}
      </div>

      {/* 전장 */}
      {/* 가로로 넓은 화면(md 이상 가로 방향)은 두 진영이 좌우로, 그 밖(휴대폰·세로로 든 태블릿)은 위아래로 마주 본다 */}
      <div className="relative z-0 flex min-h-0 flex-1 flex-col-reverse items-center justify-center gap-2 px-2 sm:gap-3 sm:px-6 md:landscape:flex-row md:landscape:gap-6 lg:landscape:gap-14">
        {/* 바닥 — 두 진영 사이에 금빛 길 */}
        <div className="pointer-events-none absolute inset-x-0 top-1/2 hidden h-[62%] -translate-y-1/2 md:landscape:block" aria-hidden style={{ background: 'radial-gradient(ellipse 60% 50% at 50% 50%, rgba(212,175,55,0.07), transparent 70%)' }} />
        <Formation battle={b} side={leftSide} mirrored={false} onUnit={onUnitClick} targetable={targetable} actorId={actor?.heroId ?? null} swapFrom={swapFrom} nameOf={nameOf} />
        {/* 두 진영의 경계 — 좌우로 마주 보면 세로 금선, 위아래로 마주 보면 가로 금선. 가운데 검 표지 */}
        <div className="relative my-2.5 h-px w-[min(100%,26rem)] shrink-0 md:portrait:w-[min(100%,40rem)] md:landscape:my-0 md:landscape:h-auto md:landscape:w-px md:landscape:self-stretch" aria-hidden>
          <span className="absolute inset-0 bg-[linear-gradient(90deg,transparent,rgba(212,175,55,0.4),transparent)] md:landscape:bg-[linear-gradient(transparent,rgba(212,175,55,0.3),transparent)]" />
          <span className="absolute left-1/2 top-1/2 grid h-6 w-6 -translate-x-1/2 -translate-y-1/2 rotate-45 place-items-center border md:landscape:h-12 md:landscape:w-12" style={{ borderColor: INK.lineStrong, background: '#0d0b09' }}>
            <Swords size={18} className="h-3 w-3 -rotate-45 md:landscape:h-[18px] md:landscape:w-[18px]" style={{ color: INK.gold }} />
          </span>
        </div>
        <Formation battle={b} side={rightSide} mirrored onUnit={onUnitClick} targetable={targetable} actorId={actor?.heroId ?? null} swapFrom={null} nameOf={nameOf} />

        {/* 기술 이름 띠 */}
        {b.fx && (b.fx.kind === 'skill' || b.fx.kind === 'buff' || b.fx.kind === 'heal' || b.fx.kind === 'duel') && (
          // 두 진영 사이(가운데 문장 자리)에 잠깐 떴다 사라진다 — 부대 카드 위에 오래 머물지 않게
          <div key={`fx-${b.fx.id}`} className="pointer-events-none absolute left-1/2 top-1/2 z-20 -translate-x-1/2 -translate-y-1/2">
            <div className="cheondo-banner flex items-center gap-3 border-y px-8 py-2" style={{ borderColor: INK.lineStrong, background: 'linear-gradient(90deg, transparent, rgba(8,8,10,0.92) 20%, rgba(8,8,10,0.92) 80%, transparent)' }}>
              <span className="text-[13px] font-bold" style={{ color: INK.sub }}>{nameOf(b.fx.actor)}</span>
              <span className="text-2xl font-black" style={{ color: unitById(b, b.fx.actor)?.side === playerSide ? INK.goldBright : INK.sealBright }}>
                {b.fx.kind === 'duel' ? T.battle.duel : b.fx.skill ? T.battle.skills[b.fx.skill] : ''}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* 아랫줄 — 명령 */}
      {/* 싸움이 시작되면 휴대폰 아랫줄 높이를 내 차례 높이로 묶어 차례가 바뀔 때마다 전장이 들썩이지 않게 한다 */}
      <footer className={`relative z-10 flex flex-col justify-center gap-2 border-t px-3 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] sm:px-4 ${started ? 'max-md:min-h-[106px]' : ''}`} style={{ borderColor: INK.line, background: 'rgba(8,8,10,0.9)' }}>
        {!started ? (
          <div className="flex flex-wrap items-center gap-3">
            <p className="flex-1 text-[12px]" style={{ color: INK.sub }}><b style={{ color: INK.goldBright }}>{T.battle.placement}</b> · {T.battle.placementHint}</p>
            <GameButton variant="danger" size="lg" onClick={begin}><Swords size={16} />{T.battle.begin}</GameButton>
          </div>
        ) : myTurn && actor && actions ? (
          // 휴대폰: 윗줄에 누구 차례인지와 기술 설명, 아랫줄에 명령 단추를 한 폭으로 나눠 세운다
          <div className="flex flex-col gap-2 md:flex-row md:items-center">
            <div className="flex min-w-0 items-center gap-2 md:pr-2">
              <Portrait hero={roster.byId.get(actor.heroId) ?? null} size={36} ring />
              <div className="min-w-0 shrink-0 leading-tight">
                <p className="truncate text-[13px] font-extrabold" style={{ color: INK.text }}>{nameOf(actor.heroId)}</p>
                <p className="text-[11px]" style={{ color: pending ? INK.goldBright : INK.sub }}>{pending ? (pending.kind === 'skill' && SKILL_TARGET[actor.skill] === 'ally' ? T.battle.pickAlly : T.battle.pickTarget) : T.classes[actor.cls]}</p>
              </div>
              <p className="ml-1 line-clamp-2 min-w-0 flex-1 border-l pl-2 text-[11px] leading-snug md:hidden" style={{ color: INK.sub, borderColor: INK.line }}>
                <b style={{ color: INK.goldBright }}>{T.battle.skills[actor.skill]}</b> {T.battle.skillDesc[actor.skill]}
              </p>
            </div>
            <div className="grid auto-cols-fr grid-flow-col gap-1.5 md:flex md:gap-2">
              <ActionButton icon={<Swords size={15} />} label={T.battle.attack} active={pending?.kind === 'attack'} disabled={actions.attack.length === 0} onClick={() => setPending(pending?.kind === 'attack' ? null : { kind: 'attack' })} hint={actor.row === 1 && !CLASSES[actor.cls].ranged ? `${Math.round(BATTLE.backRowMelee * 100)}%` : undefined} />
              <ActionButton
                icon={<Sparkles size={15} />}
                label={T.battle.skills[actor.skill]}
                active={pending?.kind === 'skill'}
                disabled={!actions.skillReady || (SKILL_TARGET[actor.skill] !== 'allies' && SKILL_TARGET[actor.skill] !== 'self' && actions.skill.length === 0)}
                onClick={onSkill}
                hint={actions.skillReady ? undefined : T.battle.cooldown(actor.cooldown)}
                title={T.battle.skillDesc[actor.skill]}
              />
              {actions.duel.length > 0 && <ActionButton icon={<Zap size={15} />} label={T.battle.duel} active={pending?.kind === 'duel'} onClick={() => setPending(pending?.kind === 'duel' ? null : { kind: 'duel' })} />}
              <ActionButton icon={<Shield size={15} />} label={T.battle.guard} onClick={() => act('guard')} />
            </div>
            <p className="ml-auto hidden min-w-0 max-w-[40%] truncate text-[12px] md:block" style={{ color: INK.sub }}>{T.battle.skillDesc[actor.skill]}</p>
          </div>
        ) : (
          <p className="h-9 text-[12px] leading-9" style={{ color: INK.sub }}>{b.result ? '' : auto ? T.battle.auto : T.battle.enemyTurn}…</p>
        )}
        <ul className="hidden gap-4 overflow-hidden text-[11px] md:flex" aria-live="polite">
          {recentLog.map((l, i) => (
            <li key={`${b.log.length - recentLog.length + i}`} className="truncate" style={{ color: i === recentLog.length - 1 ? INK.text : INK.mute }}>{formatBattleLog(locale, l, nameOf)}</li>
          ))}
        </ul>
      </footer>

      {/* 일기토 */}
      {b.duel && <DuelOverlay battle={b} nameOf={nameOf} onMove={(m: DuelMove) => mutate((d) => duelRound(d.battle!, d, m))} onRefuse={() => mutate((d) => refuseDuel(d.battle!))} onClose={() => mutate((d) => closeDuel(d.battle!))} />}

      {/* 결과 */}
      {b.result && <BattleResult battle={b} onContinue={() => mutate((d) => { finishBattle(d, roster) })} placeName={names.territory(b.territory)} speaker={closing && lead ? { name: lead.name, text: closing.text } : null} />}

      <Modal open={confirmRetreat} onClose={() => setConfirmRetreat(false)} width={400}>
        <div className="flex flex-col gap-4 p-5">
          <p className="text-sm" style={{ color: INK.text }}>{T.battle.retreatConfirm}</p>
          <div className="flex justify-end gap-2">
            <GameButton variant="quiet" onClick={() => setConfirmRetreat(false)}>{T.cancel}</GameButton>
            <GameButton variant="danger" onClick={() => { setConfirmRetreat(false); if (playerSide) mutate((d) => retreat(d.battle!, playerSide)) }}><Flag size={14} />{T.battle.retreat}</GameButton>
          </div>
        </div>
      </Modal>
    </div>
  )
}

function MilitiaFace({ size, className }: { size: number; className?: string }) {
  return <span className={`grid place-items-center font-black ${className ?? ''}`} style={{ width: className ? undefined : size, height: className ? undefined : size, borderRadius: 3, background: 'linear-gradient(160deg, #3a3024, #121110)', color: '#a58d64', fontSize: size * 0.42 }} aria-hidden><Building2 size={size * 0.5} /></span>
}

/**
 * 부대 칸 크기 — 빈 칸과 부대 카드가 같이 쓴다. 넓은 화면일수록 크게.
 * 휴대폰은 네 줄(적 두 줄·우리 두 줄)이 화면 높이를 나눠 갖는다: 윗줄·순서·외침·아랫줄·경계선(약 372px)을 뺀 높이의 4분의 1.
 * 폭은 세 칸이 화면 폭을 채우게 둔다. 얼굴이 카드를 가득 채우고 글은 그 위에 얹는다.
 * 세로로 든 태블릿도 네 줄로 쌓이므로 같은 셈으로 크게 키운다(얼굴은 왼쪽 네모 그대로).
 * 1800px 넘는 화면은 2xl 크기로는 전장 절반이 비므로 세 줄이 남는 높이를 나눠 갖게 한 번 더 키운다.
 * 단계는 rem으로 적는다 — min-[1800px]처럼 px로 적으면 2xl(96rem)보다 앞에 찍혀 덮인다.
 */
const CARD_SIZE = 'h-[clamp(76px,calc((100dvh_-_372px)/4),128px)] w-[min(124px,calc((100vw_-_28px)/3))] sm:h-[104px] sm:w-[156px] md:portrait:h-[clamp(104px,calc((100dvh_-_400px)/4),156px)] md:portrait:w-[min(244px,calc((100vw_-_72px)/3))] xl:h-[128px] xl:w-[200px] 2xl:h-[156px] 2xl:w-[244px] min-[112.5rem]:h-[clamp(156px,calc((100dvh_-_430px)/3),208px)] min-[112.5rem]:w-[312px]'
const FACE_SIZE = 'max-sm:h-full max-sm:w-full max-sm:rounded-none! sm:h-[52px] sm:w-[52px] md:portrait:h-[96px] md:portrait:w-[96px] xl:h-[76px] xl:w-[76px] 2xl:h-[100px] 2xl:w-[100px] min-[112.5rem]:h-[128px] min-[112.5rem]:w-[128px]'
/** 휴대폰 카드 글 그림자 — 얼굴 위에 얹혀도 읽히게 */
const PHONE_INK_SHADOW = 'max-sm:[text-shadow:0_1px_2px_rgba(0,0,0,0.95)]'

function MoraleBar({ label, value, color, right }: { label: string; value: number; color: string; right?: boolean }) {
  const { T } = useCheondo()
  return (
    // 휴대폰은 두 막대가 첫 줄을 반씩 나눠 갖는다(사이 간격 gap-x-3보다 조금 더 빼 소수점 반올림에도 줄이 넘치지 않게)
    <div className={`flex w-[min(34vw,260px)] flex-col gap-1 max-sm:w-[calc(50%-0.5rem)] ${right ? 'items-end text-right max-sm:ml-auto' : ''}`}>
      <span className="flex w-full items-baseline justify-between gap-2 text-[11px]">
        <span className="truncate font-bold" style={{ color: INK.text, order: right ? 2 : 1 }}>{label}</span>
        <span className="shrink-0 tabular-nums" style={{ color: INK.sub, order: right ? 1 : 2 }}>{T.battle.morale} {Math.round(value)}</span>
      </span>
      <div className="h-1.5 w-full bg-white/[0.08]" style={{ transform: right ? 'scaleX(-1)' : undefined }}>
        <div className="h-full transition-[width] duration-300" style={{ width: `${Math.max(0, Math.min(100, value))}%`, background: color }} />
      </div>
    </div>
  )
}

function ActionButton({ icon, label, onClick, active, disabled, hint, title }: { icon: React.ReactNode; label: string; onClick: () => void; active?: boolean; disabled?: boolean; hint?: string; title?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-pressed={active}
      className={`flex h-11 min-w-0 items-center justify-center gap-1.5 border px-2 text-[13px] font-bold disabled:cursor-not-allowed disabled:opacity-35 md:justify-start md:gap-2 md:px-4 ${active ? 'border-[#f3d57a] bg-[#d4af37] text-[#14110a]' : 'border-[#d4af37]/35 bg-white/[0.03] text-[#ece6d6] hover:border-[#f3d57a] hover:text-[#f3d57a]'}`}
    >
      {icon}
      {/* 휴대폰은 단추 폭이 좁아 덧말(재사용까지·뒷줄 위력)을 이름 아래로 내린다 */}
      <span className="flex min-w-0 flex-col items-start leading-tight md:flex-row md:items-baseline md:gap-2">
        <span className="truncate">{label}</span>
        {hint && <span className="whitespace-nowrap text-[10px] font-semibold opacity-70">{hint}</span>}
      </span>
    </button>
  )
}

/**
 * 한 진영 — 앞줄이 가운데를 향한다.
 * 넓은 화면은 좌우로 마주 보고(줄이 세로), 좁은 화면은 위아래로 마주 본다(줄이 가로, 적이 위).
 * 줄 순서는 넓은 화면 기준으로 두고 좁은 화면에서는 flex-col-reverse로 뒤집는다.
 */
function Formation({ battle, side, mirrored, onUnit, targetable, actorId, swapFrom, nameOf }: {
  battle: BattleState; side: BattleSide; mirrored: boolean; onUnit: (u: BattleUnit) => void; targetable: Set<string>; actorId: string | null; swapFrom: string | null; nameOf: (id: string) => string
}) {
  const ordered = mirrored ? [0, 1] as const : [1, 0] as const
  return (
    <div className="flex flex-col-reverse items-center justify-center gap-1.5 sm:gap-3 md:landscape:flex-row">
      {ordered.map((row) => (
        <div key={row} className="flex flex-row gap-1.5 sm:gap-2.5 md:landscape:flex-col">
          {[0, 1, 2].map((col) => {
            const u = battle.units.find((x) => x.side === side && x.row === row && x.col === col)
            return u ? (
              <UnitCard key={u.heroId} unit={u} battle={battle} onClick={() => onUnit(u)} targetable={targetable.has(u.heroId)} acting={actorId === u.heroId} swapping={swapFrom === u.heroId} nameOf={nameOf} />
            ) : (
              <div key={`${row}-${col}`} className={`${CARD_SIZE} border border-dashed`} style={{ borderColor: 'rgba(236,230,214,0.06)' }} />
            )
          })}
        </div>
      ))}
    </div>
  )
}

function UnitCard({ unit, battle, onClick, targetable, acting, swapping, nameOf }: { unit: BattleUnit; battle: BattleState; onClick: () => void; targetable: boolean; acting: boolean; swapping: boolean; nameOf: (id: string) => string }) {
  const { roster, T, locale } = useCheondo()
  const hero = unit.militia ? null : roster.byId.get(unit.heroId) ?? null
  const fx = battle.fx
  const hitMe = fx && fx.targets.includes(unit.heroId) && (fx.kind === 'hit' || fx.kind === 'crit' || fx.kind === 'skill' || fx.kind === 'debuff')
  const healMe = fx && fx.targets.includes(unit.heroId) && (fx.kind === 'heal' || fx.kind === 'buff')
  const amount = fx && fx.targets.includes(unit.heroId) && fx.amount && fx.targets.length === 1 ? fx.amount : null
  const mine = unit.side === battle.playerSide
  const cls = CLASSES[unit.cls]
  const statuses = Object.keys(unit.statuses)
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={unit.routed}
      aria-label={nameOf(unit.heroId)}
      className={`relative ${CARD_SIZE} overflow-visible border text-left ${targetable ? 'cursor-crosshair border-[#f3d57a] bg-[#d4af37]/[0.14] hover:bg-[#d4af37]/25' : swapping ? 'border-[#3fb9a5] bg-[#3fb9a5]/15' : 'border-white/[0.09] bg-[#0f1013]/90 hover:border-white/25'} ${acting ? 'cheondo-turn' : ''}`}
      style={{ opacity: unit.routed ? 0.35 : 1 }}
    >
      <div key={hitMe ? fx!.id : 'still'} className={`relative flex h-full flex-col gap-[3px] p-1.5 max-sm:overflow-hidden max-sm:p-0 ${hitMe ? 'cheondo-shake' : ''}`}>
        <div className="flex min-h-0 flex-1 gap-2">
          {/* 얼굴 — 휴대폰은 카드를 가득 채우고, 넓은 화면은 왼쪽에 네모로 */}
          {/* 넓은 화면은 얼굴 칸이 카드 높이로 늘어나지 않게(self-start) 병과 표지를 얼굴 모서리에 붙인다 */}
          <div className="relative shrink-0 max-sm:absolute max-sm:inset-0 sm:self-start">
            {unit.militia ? <MilitiaFace size={64} className={FACE_SIZE} /> : <Portrait hero={hero} size={76} fluid className={FACE_SIZE} />}
          </div>
          {/* 휴대폰 — 얼굴 위 글이 읽히도록 아래는 짙게, 위 표지 자리는 옅게 어둡힌다 */}
          <span aria-hidden className="pointer-events-none absolute inset-0 sm:hidden" style={{ background: 'linear-gradient(0deg, rgba(8,8,10,0.95) 0%, rgba(8,8,10,0.72) 30%, rgba(8,8,10,0) 60%), linear-gradient(180deg, rgba(8,8,10,0.5) 0%, rgba(8,8,10,0) 28%)' }} />
          {(targetable || swapping) && (
            <span aria-hidden className="pointer-events-none absolute inset-0 sm:hidden" style={{ background: targetable ? 'rgba(212,175,55,0.2)' : 'rgba(63,185,165,0.22)' }} />
          )}
          {/* 휴대폰은 등급을 위에, 상태·이름·병력을 아래에 모은다(order). 넓은 화면은 적힌 순서대로 */}
          <div className="flex min-w-0 flex-1 flex-col max-sm:relative max-sm:p-1.5">
            <span className="flex items-center gap-1 max-sm:order-3">
              <span className={`truncate text-[12px] font-extrabold leading-tight xl:text-[14px] min-[112.5rem]:text-[17px] ${PHONE_INK_SHADOW}`} style={{ color: INK.text }}>{nameOf(unit.heroId)}</span>
            </span>
            <span className="flex items-center gap-1 max-sm:order-1">
              {!unit.militia && <GradeBadge grade={unit.grade} className="h-[15px] min-w-[20px] text-[9px]" />}
              {unit.isLord && <span className={`text-[10px] font-black ${PHONE_INK_SHADOW}`} style={{ color: INK.goldBright }}><Crown size={12} aria-hidden /></span>}
              <span className="hidden truncate text-[10px] font-semibold xl:inline" style={{ color: cls.color }}>{T.classes[unit.cls]}</span>
            </span>
            <span className={`mt-auto flex items-baseline justify-between gap-1 text-[11px] font-bold tabular-nums max-sm:order-4 max-sm:mt-0.5 xl:text-[13px] min-[112.5rem]:text-[15px] ${PHONE_INK_SHADOW}`} style={{ color: mine ? '#c9f1ea' : '#ffd9cf' }}>
              {num(locale, unit.troops)}
              <span className="hidden text-[10px] font-semibold xl:inline" style={{ color: INK.mute }}>/ {num(locale, unit.maxTroops)}</span>
            </span>
            <Meter value={unit.troops} max={unit.maxTroops} color={mine ? INK.jade : INK.sealBright} height={4} className="max-sm:order-5" />
            <span className="mt-1 flex min-h-[14px] flex-wrap gap-0.5 max-sm:order-2 max-sm:mb-0.5 max-sm:mt-auto max-sm:min-h-0">
              {statuses.map((s) => (
                <span key={s} className="rounded-[2px] px-1 text-[9px] font-bold leading-[14px]" style={{ background: s === 'confused' || s === 'weakened' ? 'rgba(200,69,45,0.55)' : 'rgba(63,185,165,0.5)', color: INK.text }}>{T.battle.statuses[s]}</span>
              ))}
              {unit.cooldown === 0 && !unit.routed && <span className="rounded-[2px] px-1 text-[9px] font-bold leading-[14px]" style={{ background: 'rgba(212,175,55,0.35)', color: INK.goldBright }}>{T.battle.skills[unit.skill]}</span>}
            </span>
          </div>
        </div>
      </div>
      {hitMe && <span key={`f${fx!.id}`} className="cheondo-flash pointer-events-none absolute inset-0" style={{ background: fx!.kind === 'crit' ? 'rgba(255,220,150,0.45)' : 'rgba(226,88,60,0.35)' }} />}
      {healMe && <span key={`h${fx!.id}`} className="cheondo-flash pointer-events-none absolute inset-0" style={{ background: 'rgba(63,185,165,0.35)' }} />}
      {amount !== null && (
        <span key={`n${fx!.id}`} className="cheondo-float pointer-events-none absolute left-1/2 top-2 z-10 text-lg font-black tabular-nums" style={{ color: healMe ? '#9ff0de' : fx!.kind === 'crit' ? '#ffe28a' : '#ff9a82', textShadow: '0 2px 0 #000' }}>
          {healMe ? '+' : '−'}{num(locale, amount)}
        </span>
      )}
      {unit.routed && <span className="pointer-events-none absolute right-1 top-1 text-lg font-black" style={{ color: INK.seal }}><X size={20} aria-hidden /></span>}
    </button>
  )
}

function BattleResult({ battle, onContinue, placeName, speaker }: { battle: BattleState; onContinue: () => void; placeName: string; speaker: { name: string; text: string } | null }) {
  const { T, locale } = useCheondo()
  const playerSide: BattleSide = battle.playerSide ?? (battle.attacker === PLAYER_ID ? 'attacker' : 'defender')
  const won = battle.result === playerSide
  const enemySide: BattleSide = playerSide === 'attacker' ? 'defender' : 'attacker'
  const losses = (side: BattleSide) => battle.units.filter((u) => u.side === side).reduce((s, u) => s + Math.max(0, u.startTroops - u.troops), 0)
  const title = won ? T.battle.victory : T.battle.defeat
  const tn = placeName
  const detail = playerSide === 'attacker' ? (won ? T.battle.conquered(tn) : T.battle.failed(tn)) : (won ? T.battle.held(tn) : T.battle.lost(tn))
  return (
    <div className="absolute inset-0 z-30 grid place-items-center p-4" style={{ background: 'rgba(4,4,6,0.72)' }}>
      <Panel className="w-full max-w-md cheondo-rise">
        <div className="flex flex-col items-center gap-3 p-6 text-center">
          <span className="cheondo-stamp grid h-20 w-20 place-items-center text-4xl font-black" style={{ background: won ? INK.seal : '#2c2c30', color: won ? '#fff3ea' : INK.sub, boxShadow: 'inset 0 0 0 4px rgba(0,0,0,0.25)' }}>
            {won ? <Trophy size={36} aria-hidden /> : <X size={36} aria-hidden />}
          </span>
          <h2 className="text-2xl font-black" style={{ color: won ? INK.goldBright : INK.text }}>{title}</h2>
          <p className="text-[14px]" style={{ color: INK.text }}>{detail}</p>
          {speaker && (
            <figure className="w-full border-y px-2 py-2.5" style={{ borderColor: INK.line }}>
              <blockquote className="text-[13px] leading-relaxed" style={{ color: INK.text }}>「{speaker.text}」</blockquote>
              <figcaption className="mt-1 text-[11px] font-semibold" style={{ color: INK.gold }}>{speaker.name}</figcaption>
            </figure>
          )}
          {/* 공격에 실패해도 수비군이 잃은 병력은 이달 안에 돌아오지 않는다 — 다음 물결로 이어 치는 길을 알려 준다 */}
          {/* 주인 없는 땅의 토박이는 다음 싸움에 다시 온전히 나오므로 세력 땅에서만 알린다 */}
          {!won && playerSide === 'attacker' && !!battle.defender && losses(enemySide) > 0 && (
            <p className="text-[12px] leading-relaxed" style={{ color: INK.goldBright }}>{T.battle.waveHint}</p>
          )}
          <div className="grid w-full grid-cols-2 gap-2 text-[12px]">
            <div className="border px-2 py-2" style={{ borderColor: INK.line }}>
              <p style={{ color: INK.mute }}>{T.battle.lossesOurs}</p>
              <p className="text-[15px] font-black tabular-nums" style={{ color: INK.text }}>{num(locale, losses(playerSide))}</p>
            </div>
            <div className="border px-2 py-2" style={{ borderColor: INK.line }}>
              <p style={{ color: INK.mute }}>{T.battle.lossesEnemy}</p>
              <p className="text-[15px] font-black tabular-nums" style={{ color: INK.text }}>{num(locale, losses(enemySide))}</p>
            </div>
          </div>
          <GameButton variant="primary" size="lg" onClick={onContinue} className="mt-1 w-full">{T.battle.continue}</GameButton>
        </div>
      </Panel>
    </div>
  )
}
