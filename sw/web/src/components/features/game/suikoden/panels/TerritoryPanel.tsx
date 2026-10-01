/*
  천도 v2 — 영토 살피기. 우리 땅이면 무장에게 일을 맡기고, 남의 땅이면 형편을 보고 출진·외교로 잇는다.
  명령을 누르면 맡길 무장 목록이 나오고, 무장마다 기대치를 보여 준다. 여러 명에게 잇달아 맡길 수 있다.
*/
'use client'

import { useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import {
  ArrowLeft, Beer, Castle, Coins, Crown, Drama, Gift, GraduationCap, Hammer, HandHeart, Landmark, MoveRight,
  Search, ShieldAlert, Ship, Sprout, Store, Swords, Target, Tent, UserCheck, UserPlus, Wheat, X,
} from 'lucide-react'
import { defensePower } from '@/lib/game/suikoden/ai'
import { pickDefenders } from '@/lib/game/suikoden/battle'
import {
  canRecruitByFame, previewGain, recruitChance, runCommand, searchChance, type Command, type CommandResult, type DevTask,
} from '@/lib/game/suikoden/commands'
import { BUILDINGS, COMMANDS, DEV_MAX, GRADE_INFO, BUILDING_EFFECT, LOYALTY } from '@/lib/game/suikoden/constants'
import { isSeaRoute, neighborsOf, REGIONS, TERRITORY_BY_ID, type TerritoryId } from '@/lib/game/suikoden/map'
import {
  canBuildHere, freeHeroesAt, hasBuilding, heroMaxTroops, marchableNeighbors, officersAt, PLAYER_ID,
} from '@/lib/game/suikoden/query'
import { territoryIncome } from '@/lib/game/suikoden/turn'
import type { BuildingType, GameState, Hero, HeroState } from '@/lib/game/suikoden/types'
import { sortieCandidates } from '@/lib/game/suikoden/war'
import { makeNames, useCheondo } from '../context'
import { num } from '../i18n'
import { Chip, GameButton, Meter, Seal } from '../ui/Frame'
import { territoryArt } from '../ui/art'
import { ClassBadge, GradeBadge, Portrait } from '../ui/HeroBits'
import { INK } from '../ui/theme'
import { resultToast } from './resultText'

export type Act = (fn: (draft: GameState) => CommandResult) => CommandResult

interface TerritoryPanelProps {
  game: GameState
  territory: TerritoryId
  act: Act
  onSortie: (target: TerritoryId, from?: TerritoryId) => void
  onDiplomacy: (factionId: string) => void
  onClose: () => void
}

export const BUILDING_ICON: Record<BuildingType, ReactNode> = {
  farmland: <Wheat size={15} />, market: <Store size={15} />, barracks: <Tent size={15} />, fortress: <Castle size={15} />,
  tavern: <Beer size={15} />, academy: <GraduationCap size={15} />, temple: <Landmark size={15} />, theater: <Drama size={15} />, shipyard: <Ship size={15} />,
}

type Mode =
  | { kind: 'dev'; task: DevTask }
  | { kind: 'search' }
  | { kind: 'recruit' }
  | { kind: 'move' }
  | { kind: 'build' }
  | { kind: 'reward' }
  | null

export default function TerritoryPanel({ game, territory, act, onSortie, onDiplomacy, onClose }: TerritoryPanelProps) {
  const { T, locale, roster } = useCheondo()
  const t = game.territories[territory]
  const def = TERRITORY_BY_ID[territory]
  const names = useMemo(() => makeNames(roster, locale, T, game), [roster, locale, T, game])
  const owner = t.owner ? game.factions[t.owner] : null
  const isMine = t.owner === PLAYER_ID
  const isCapital = !!owner && owner.capital === territory
  const banner = territoryArt(territory, 'banner')
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="relative flex shrink-0 items-start gap-3 overflow-hidden border-b px-4 py-3" style={{ borderColor: INK.line, minHeight: banner ? 96 : undefined }}>
        {banner && (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img key={banner} src={banner} alt="" aria-hidden className="pointer-events-none absolute inset-0 h-full w-full object-cover" style={{ opacity: 0.55 }} loading="lazy" decoding="async" />
            <span aria-hidden className="pointer-events-none absolute inset-0" style={{ background: 'linear-gradient(90deg, rgba(13,15,19,0.96) 0%, rgba(13,15,19,0.75) 45%, rgba(13,15,19,0.35) 100%), linear-gradient(0deg, rgba(13,15,19,0.9), transparent 60%)' }} />
          </>
        )}
        {owner ? <Seal color={owner.color} text={roster.byId.get(owner.lordId)?.name ?? '?'} size={34} className="relative" /> : <span className="relative grid h-[34px] w-[34px] place-items-center border text-sm font-black" style={{ borderColor: INK.line, color: INK.mute, background: 'rgba(13,15,19,0.8)' }} aria-hidden>空</span>}
        <div className="relative min-w-0 flex-1">
          <p className="text-[11px] font-bold" style={{ color: INK.gold }}>{REGIONS[def.region][locale]}{isCapital ? ` · ${T.territory.capital}` : ''}</p>
          <h2 className="truncate text-xl font-black leading-tight" style={{ color: INK.text }}>{names.territory(territory)}</h2>
          <p className="truncate text-[12px]" style={{ color: INK.sub }}>{owner ? (isMine ? T.ours : names.faction(owner.id)) : T.neutral}</p>
        </div>
        <button type="button" onClick={onClose} aria-label={T.close} className="relative grid h-8 w-8 place-items-center text-[#a8a293] hover:bg-white/[0.06] hover:text-[#f3d57a]"><X size={16} /></button>
      </div>
      {/* 휴대폰 아래 가장자리(홈 표시줄)에 마지막 줄이 붙지 않게 조금 띄운다 */}
      <div className="min-h-0 flex-1 overflow-y-auto max-md:pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        {isMine ? (
          <OwnTerritory game={game} territory={territory} act={act} onSortie={onSortie} names={names} />
        ) : (
          <ForeignTerritory game={game} territory={territory} onSortie={onSortie} onDiplomacy={onDiplomacy} names={names} />
        )}
      </div>
    </div>
  )
}

// ── 공용 조각 ──

function StatCell({ label, value, max, color, hint }: { label: string; value: number; max?: number; color?: string; hint?: string }) {
  const { locale } = useCheondo()
  return (
    <div className="border px-2.5 py-2" style={{ borderColor: INK.line }} title={hint}>
      <div className="flex items-baseline justify-between gap-1">
        <span className="text-[10px] font-semibold" style={{ color: INK.mute }}>{label}</span>
        <span className="text-[13px] font-bold tabular-nums" style={{ color: INK.text }}>{num(locale, value)}</span>
      </div>
      {max !== undefined && <Meter value={value} max={max} color={color} className="mt-1.5" height={3} />}
    </div>
  )
}

function OfficerRow({ hero, hs, right, onClick, dim }: { hero: Hero; hs: HeroState; right?: ReactNode; onClick?: () => void; dim?: boolean }) {
  const { T, locale, openHero } = useCheondo()
  return (
    <div className={`flex items-center gap-2.5 border px-2 py-1.5 ${dim ? 'opacity-55' : ''}`} style={{ borderColor: 'rgba(236,230,214,0.06)' }}>
      <button type="button" onClick={() => openHero(hero.id)} className="shrink-0" aria-label={hero.name}>
        <Portrait hero={hero} size={36} ring={hs.status === 'lord'} />
      </button>
      <button type="button" onClick={onClick ?? (() => openHero(hero.id))} className="min-w-0 flex-1 text-left">
        <span className="flex items-center gap-1.5">
          <span className="truncate text-[13px] font-bold" style={{ color: INK.text }}>{hero.name}</span>
          <GradeBadge grade={hero.grade} />
          <ClassBadge cls={hero.cls} />
        </span>
        <span className="flex items-center gap-2 text-[11px]" style={{ color: INK.sub }}>
          <span className="tabular-nums">{T.officer.troops} {num(locale, hs.troops)}</span>
          <span className="tabular-nums" style={{ color: hs.loyalty < 40 ? INK.sealBright : INK.sub }}>{T.officer.loyalty} {hs.loyalty}</span>
          {hs.wound > 0 && <span style={{ color: INK.sealBright }}>{T.officer.wound} {hs.wound}</span>}
        </span>
      </button>
      {right}
    </div>
  )
}

// ── 우리 땅 ──

function OwnTerritory({ game, territory, act, onSortie, names }: { game: GameState; territory: TerritoryId; act: Act; onSortie: (target: TerritoryId, from?: TerritoryId) => void; names: ReturnType<typeof makeNames> }) {
  const { T, locale, roster, toast, sfx } = useCheondo()
  const [mode, setMode] = useState<Mode>(null)
  const t = game.territories[territory]
  const f = game.factions[PLAYER_ID]
  const income = territoryIncome(game, t)
  const officers = officersAt(game, territory, PLAYER_ID)
    .map((hs) => ({ hs, hero: roster.byId.get(hs.id)! }))
    .filter((x) => x.hero)
    .sort((a, b) => Number(a.hs.acted) - Number(b.hs.acted) || (a.hs.status === 'lord' ? -1 : 0) || b.hs.troops - a.hs.troops)
  const idle = officers.filter((o) => !o.hs.acted)
  const natives = roster.byHome.get(territory)?.length ?? 0
  const free = freeHeroesAt(game, roster, territory)
  const known = free.filter((h) => f.discovered[h.id] !== undefined)
  const hiddenLeft = free.length - known.length
  const wallsCap = hasBuilding(t, 'fortress') ? DEV_MAX + BUILDING_EFFECT.fortressWalls : DEV_MAX
  const enemyNeighbors = marchableNeighbors(game, territory).filter((id) => game.territories[id].owner !== PLAYER_ID)
  // 뭍으로는 더 나아갈 곳이 없고 바다 건너에만 남의 땅이 있다 — 조선소가 길을 연다는 걸 알려 준다
  const seaOnly = enemyNeighbors.length === 0 && !hasBuilding(t, 'shipyard')
    && neighborsOf(territory).some((n) => n.sea && game.territories[n.id].owner !== PLAYER_ID)

  const run = (cmd: Command) => {
    const r = act((draft) => runCommand(draft, roster, PLAYER_ID, cmd))
    const msg = resultToast(T, names, r)
    toast(msg.text, msg.tone)
    sfx(r.ok ? (cmd.kind === 'recruit' && r.code === 'recruit_ok' ? 'confirm' : cmd.kind === 'search' && r.found?.length ? 'reveal' : 'click') : 'lose')
    return r
  }

  if (mode) {
    return (
      <CommandPicker
        game={game}
        territory={territory}
        mode={mode}
        idle={idle}
        known={known}
        onRun={run}
        onBack={() => setMode(null)}
        names={names}
      />
    )
  }

  const cmd = (kind: DevTask | 'search' | 'recruit' | 'move' | 'build' | 'reward', icon: ReactNode, label: string, disabled?: boolean) => (
    <button
      key={kind}
      type="button"
      disabled={disabled}
      onClick={() => { sfx('click'); setMode(kind === 'search' || kind === 'recruit' || kind === 'move' || kind === 'build' || kind === 'reward' ? { kind } as Mode : { kind: 'dev', task: kind }) }}
      className="flex h-14 flex-col items-center justify-center gap-1 border border-white/[0.07] bg-white/[0.02] text-[12px] font-semibold text-[#ece6d6] hover:border-[#d4af37]/60 hover:bg-[#d4af37]/10 hover:text-[#f3d57a] disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:border-white/[0.07] disabled:hover:bg-white/[0.02] disabled:hover:text-[#ece6d6]"
      title={T.commands.desc[kind]}
    >
      <span style={{ color: INK.gold }}>{icon}</span>
      {label}
    </button>
  )
  const noIdle = idle.length === 0

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="grid grid-cols-3 gap-1.5">
        <StatCell label={T.territory.population} value={t.population} />
        <StatCell label={T.territory.order} value={t.order} max={100} color={t.order < 40 ? INK.seal : INK.jade} />
        <StatCell label={T.territory.walls} value={t.walls} max={wallsCap} color="#9aa7b4" />
        <StatCell label={T.territory.farm} value={t.farm} max={DEV_MAX} color="#8fc34f" />
        <StatCell label={T.territory.commerce} value={t.commerce} max={DEV_MAX} color={INK.gold} />
        <div className="border px-2.5 py-2" style={{ borderColor: INK.line }}>
          <div className="text-[10px] font-semibold" style={{ color: INK.mute }}>{T.territory.income}</div>
          <div className="flex items-center gap-2 text-[12px] font-bold tabular-nums" style={{ color: INK.text }}>
            <span className="flex items-center gap-0.5"><Coins size={11} style={{ color: INK.gold }} />{income.gold}</span>
            <span className="flex items-center gap-0.5"><Wheat size={11} style={{ color: '#8fc34f' }} />{income.food}</span>
          </div>
        </div>
      </div>

      {t.threat && (
        <div className="flex items-center gap-2 border px-3 py-2 text-[12px]" style={{ borderColor: 'rgba(200,69,45,0.6)', background: 'rgba(200,69,45,0.12)', color: '#ffd9cf' }}>
          <ShieldAlert size={15} />
          <span className="flex-1 font-semibold">{T.threats[t.threat.type]} · {T.territory.threat} {t.threat.power}</span>
          <GameButton size="sm" variant="danger" disabled={noIdle} onClick={() => setMode({ kind: 'dev', task: 'subdue' })}>{T.commands.subdue}</GameButton>
        </div>
      )}

      {/* 시설 */}
      <section>
        <h3 className="mb-1.5 text-[11px] font-bold" style={{ color: INK.gold }}>{T.territory.buildings} {t.buildings.length} / {t.slots}</h3>
        <div className="flex flex-wrap gap-1.5">
          {t.buildings.map((b) => (
            <span key={b.type} className="flex h-9 items-center gap-1.5 border px-2 text-[12px] font-semibold" title={T.buildingDesc[b.type]} style={{ borderColor: b.progress > 0 ? 'rgba(236,230,214,0.12)' : INK.lineStrong, color: b.progress > 0 ? INK.sub : INK.text }}>
              <span style={{ color: b.progress > 0 ? INK.mute : INK.gold }}>{BUILDING_ICON[b.type]}</span>
              {T.buildings[b.type]}
              {b.progress > 0 && <span className="text-[10px]" style={{ color: INK.mute }}>{T.territory.months(b.progress)}</span>}
            </span>
          ))}
          {Array.from({ length: Math.max(0, t.slots - t.buildings.length) }, (_, i) => (
            <button key={i} type="button" disabled={noIdle} onClick={() => setMode({ kind: 'build' })} className="flex h-9 items-center gap-1 border border-dashed px-2 text-[11px] text-[#6f6a60] hover:border-[#d4af37]/60 hover:text-[#f3d57a] disabled:hover:border-white/15 disabled:hover:text-[#6f6a60]" style={{ borderColor: 'rgba(236,230,214,0.15)' }}>
              <Hammer size={12} />{T.territory.emptySlot}
            </button>
          ))}
        </div>
        {seaOnly && (
          <p className="mt-2 flex items-start gap-1.5 text-[11px] leading-snug" style={{ color: INK.goldBright }}>
            <Ship size={12} className="mt-px shrink-0" />{T.territory.seaOnly}
          </p>
        )}
      </section>

      {/* 명령 */}
      <section className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <h3 className="text-[11px] font-bold" style={{ color: INK.gold }}>{T.commands.groups.develop} · {T.commands.groups.military} · {T.commands.groups.people}</h3>
          <label className="flex cursor-pointer items-center gap-1.5 text-[11px]" style={{ color: t.delegate ? INK.jade : INK.sub }} title={t.delegate ? T.territory.delegateOn : T.territory.delegateOff}>
            <input
              type="checkbox"
              checked={t.delegate}
              onChange={(e) => run({ kind: 'delegate', territory, on: e.target.checked })}
              className="h-3.5 w-3.5 accent-[#3fb9a5]"
            />
            {T.territory.delegate}
          </label>
        </div>
        <div className="grid grid-cols-4 gap-1.5">
          {cmd('farm', <Sprout size={16} />, T.commands.farm, noIdle || t.farm >= DEV_MAX)}
          {cmd('commerce', <Coins size={16} />, T.commands.commerce, noIdle || t.commerce >= DEV_MAX)}
          {cmd('walls', <Castle size={16} />, T.commands.walls, noIdle || t.walls >= wallsCap)}
          {cmd('relief', <HandHeart size={16} />, T.commands.relief, noIdle || t.order >= 100)}
          {cmd('conscript', <UserPlus size={16} />, T.commands.conscript, noIdle)}
          {cmd('train', <Target size={16} />, T.commands.train, noIdle)}
          <button
            type="button"
            disabled={enemyNeighbors.length === 0}
            onClick={() => { sfx('click'); onSortie(enemyNeighbors[0], territory) }}
            className="flex h-14 flex-col items-center justify-center gap-1 border border-[#c8452d]/40 bg-[#c8452d]/10 text-[12px] font-semibold text-[#ffd9cf] hover:border-[#e2583c] hover:bg-[#c8452d]/25 disabled:cursor-not-allowed disabled:opacity-35"
            title={T.commands.desc.sortie}
          >
            <Swords size={16} />{T.commands.sortie}
          </button>
          {cmd('search', <Search size={16} />, T.commands.search, noIdle || hiddenLeft === 0)}
          {cmd('recruit', <UserCheck size={16} />, T.commands.recruit, noIdle || known.length === 0)}
          {cmd('move', <MoveRight size={16} />, T.commands.move, noIdle)}
          {cmd('build', <Hammer size={16} />, T.commands.build, noIdle || t.buildings.length >= t.slots)}
          {cmd('reward', <Gift size={16} />, T.commands.reward, officers.filter((o) => o.hs.status === 'officer').length === 0)}
        </div>
      </section>

      {/* 무장 */}
      <section>
        <h3 className="mb-1.5 text-[11px] font-bold" style={{ color: INK.gold }}>{T.territory.officers} {officers.length} · {T.hud.idle(idle.length)}</h3>
        {officers.length === 0 ? (
          <p className="text-[12px]" style={{ color: INK.mute }}>{T.territory.noOfficers}</p>
        ) : (
          <div className="flex flex-col gap-1">
            {officers.map(({ hs, hero }) => (
              <OfficerRow
                key={hs.id}
                hero={hero}
                hs={hs}
                dim={hs.acted}
                right={
                  <span className="flex items-center gap-1">
                    {t.governor === hs.id ? (
                      <span className="text-[10px] font-bold" style={{ color: INK.gold }} title={T.territory.governor}><Crown size={13} /></span>
                    ) : (
                      <button type="button" onClick={() => run({ kind: 'governor', territory, target: hs.id })} className="text-[#6f6a60] hover:text-[#f3d57a]" title={`${T.commands.governor} — ${T.territory.governorHint}`} aria-label={`${hero.name} ${T.commands.governor}`}><Crown size={13} /></button>
                    )}
                    <span className="min-w-10 whitespace-nowrap text-right text-[10px] font-semibold" style={{ color: hs.acted ? INK.mute : INK.jade }}>{hs.acted ? (hs.task ? T.officer.tasks[hs.task] : '—') : T.officer.ready}</span>
                  </span>
                }
              />
            ))}
          </div>
        )}
      </section>

      {/* 재야 인재 */}
      <section>
        <h3 className="mb-1.5 text-[11px] font-bold" style={{ color: INK.gold }}>{T.territory.talent}</h3>
        <p className="mb-2 text-[11px]" style={{ color: INK.sub }}>{T.territory.known(known.length, natives)} · {hiddenLeft > 0 ? T.territory.unknownTalent : T.territory.noTalent}</p>
        <div className="flex flex-wrap gap-1.5">
          {known.slice(0, 24).map((h) => (
            <TalentChip key={h.id} hero={h} game={game} onRecruit={() => setMode({ kind: 'recruit' })} />
          ))}
        </div>
        {enemyNeighbors.length > 0 && <p className="mt-3 text-[11px]" style={{ color: INK.mute }}>{T.sortie.title}: {enemyNeighbors.map((id) => names.territory(id)).join(' · ')}</p>}
      </section>
      <span className="sr-only">{num(locale, f.gold)}</span>
    </div>
  )
}

function TalentChip({ hero, game, onRecruit }: { hero: Hero; game: GameState; onRecruit: () => void }) {
  const { openHero } = useCheondo()
  const f = game.factions[PLAYER_ID]
  const cooling = (f.discovered[hero.id] ?? 0) > game.turn
  const fameOk = canRecruitByFame(game, PLAYER_ID, hero)
  return (
    <button
      type="button"
      onClick={() => (fameOk && !cooling ? onRecruit() : openHero(hero.id))}
      title={hero.name}
      className="flex items-center gap-1.5 border py-0.5 pl-0.5 pr-2 text-[11px] font-semibold hover:border-[#d4af37]/60"
      style={{ borderColor: 'rgba(236,230,214,0.08)', color: fameOk && !cooling ? INK.text : INK.mute }}
    >
      <Portrait hero={hero} size={26} dim={!fameOk || cooling} />
      <span className="max-w-[6.5rem] truncate">{hero.name}</span>
      <GradeBadge grade={hero.grade} />
    </button>
  )
}

// ── 명령 고르기 ──

interface PickerProps {
  game: GameState
  territory: TerritoryId
  mode: NonNullable<Mode>
  idle: { hs: HeroState; hero: Hero }[]
  known: Hero[]
  onRun: (cmd: Command) => CommandResult
  onBack: () => void
  names: ReturnType<typeof makeNames>
}

function CommandPicker({ game, territory, mode, idle, known, onRun, onBack, names }: PickerProps) {
  const { T, locale, roster } = useCheondo()
  const [dest, setDest] = useState<TerritoryId | null>(null)
  // 명령 단추까지 서랍을 내려 둔 채 들어오면 그 스크롤이 남아 머리줄이 가려진다 → 들어올 때 맨 위로
  const topRef = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => { topRef.current?.closest('.overflow-y-auto')?.scrollTo({ top: 0 }) }, [])
  const f = game.factions[PLAYER_ID]
  const t = game.territories[territory]
  const title = mode.kind === 'dev' ? T.commands[mode.task] : T.commands[mode.kind]
  const descKey = mode.kind === 'dev' ? mode.task : mode.kind
  const cost = mode.kind === 'dev'
    ? T.commands.cost(COMMANDS[mode.task].gold, COMMANDS[mode.task].food)
    : mode.kind === 'search' ? T.commands.cost(COMMANDS.search.gold, 0)
      : mode.kind === 'recruit' ? T.commands.cost(COMMANDS.recruit.gold, 0)
        : mode.kind === 'reward' ? T.commands.cost(100, 0) : ''

  // 무장 목록이 길어 내려도 뒤로 가기·비용이 보이게 머리줄을 붙여 둔다
  const header = (
    <div ref={topRef} className="sticky top-0 z-10 flex items-center gap-2 border-b px-3 py-2.5" style={{ borderColor: INK.line, background: INK.panelSolid }}>
      <button type="button" onClick={onBack} className="grid h-8 w-8 place-items-center text-[#a8a293] hover:bg-white/[0.06] hover:text-[#f3d57a]" aria-label={T.back}><ArrowLeft size={16} /></button>
      <div className="min-w-0 flex-1">
        <p className="text-[15px] font-extrabold" style={{ color: INK.text }}>{title}</p>
        <p className="truncate text-[11px]" style={{ color: INK.sub }}>{T.commands.desc[descKey]}{cost ? ` · ${cost}` : ''}</p>
      </div>
      <span className="text-[11px] font-bold tabular-nums" style={{ color: INK.gold }}>{T.hud.gold} {num(locale, f.gold)}</span>
    </div>
  )

  if (mode.kind === 'build') {
    const builder = idle.slice().sort((a, b) => Number(b.hero.cls === 'artisan') - Number(a.hero.cls === 'artisan'))[0]
    return (
      <div>
        {header}
        <div className="flex flex-col gap-1.5 p-3">
          {builder && <p className="text-[11px]" style={{ color: INK.sub }}>{T.commands.pickOfficer}: <b style={{ color: INK.text }}>{builder.hero.name}</b></p>}
          {(Object.keys(BUILDINGS) as BuildingType[]).map((type) => {
            const b = BUILDINGS[type]
            const ok = canBuildHere(t, type) && !!builder && f.gold >= b.gold
            const months = Math.max(1, b.months - (builder?.hero.cls === 'artisan' ? 1 : 0))
            return (
              <button
                key={type}
                type="button"
                disabled={!ok}
                onClick={() => { if (builder) { onRun({ kind: 'build', heroId: builder.hs.id, building: type }); onBack() } }}
                className="flex items-center gap-3 border px-3 py-2 text-left hover:border-[#d4af37]/60 hover:bg-[#d4af37]/[0.08] disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:border-white/[0.07] disabled:hover:bg-transparent"
                style={{ borderColor: 'rgba(236,230,214,0.07)' }}
              >
                <span className="grid h-9 w-9 place-items-center border" style={{ borderColor: INK.line, color: INK.gold }}>{BUILDING_ICON[type]}</span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[13px] font-bold" style={{ color: INK.text }}>{T.buildings[type]} <span className="text-[11px] font-black" style={{ color: INK.goldDim }}>{b.hanja}</span></span>
                  <span className="block truncate text-[11px]" style={{ color: INK.sub }}>{T.buildingDesc[type]}</span>
                </span>
                <span className="text-right text-[11px] tabular-nums" style={{ color: INK.sub }}>{T.commands.cost(b.gold, 0)}<br />{T.territory.months(months)}</span>
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  if (mode.kind === 'recruit') {
    const recruiter = idle.slice().sort((a, b) => b.hero.stats.charm - a.hero.stats.charm)[0]
    return (
      <div>
        {header}
        <div className="flex flex-col gap-1.5 p-3">
          {recruiter ? <p className="text-[11px]" style={{ color: INK.sub }}>{T.commands.pickOfficer}: <b style={{ color: INK.text }}>{recruiter.hero.name}</b> ({T.abilities.charm} {recruiter.hero.stats.charm})</p> : <p className="text-[12px]" style={{ color: INK.mute }}>{T.commands.none}</p>}
          {known.length === 0 && <p className="text-[12px]" style={{ color: INK.mute }}>{T.territory.noTalent}</p>}
          {known.map((h) => {
            const fameOk = canRecruitByFame(game, PLAYER_ID, h)
            const cooling = (f.discovered[h.id] ?? 0) > game.turn
            const p = recruiter ? recruitChance(game, roster, PLAYER_ID, recruiter.hero, h) : 0
            return (
              <div key={h.id} className="flex items-center gap-2.5 border px-2 py-1.5" style={{ borderColor: 'rgba(236,230,214,0.07)' }}>
                <Portrait hero={h} size={40} />
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1.5"><span className="truncate text-[13px] font-bold" style={{ color: INK.text }}>{h.name}</span><GradeBadge grade={h.grade} /><ClassBadge cls={h.cls} /></p>
                  <p className="truncate text-[11px]" style={{ color: INK.sub }}>{h.title}</p>
                </div>
                {!fameOk ? (
                  <span className="text-right text-[10px] leading-tight" style={{ color: INK.sealBright }}>{T.toast.errors.fame_low}<br />{T.hud.fame} {GRADE_INFO[h.grade].fameReq}</span>
                ) : cooling ? (
                  <span className="text-[10px]" style={{ color: INK.mute }}>{T.toast.errors.target_cooldown}</span>
                ) : (
                  <GameButton size="sm" variant="primary" disabled={!recruiter} onClick={() => recruiter && onRun({ kind: 'recruit', heroId: recruiter.hs.id, target: h.id })}>
                    {T.commands.recruit} {Math.round(p * 100)}%
                  </GameButton>
                )}
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  if (mode.kind === 'move') {
    const dests = marchableNeighbors(game, territory).filter((id) => game.territories[id].owner === PLAYER_ID)
    return (
      <div>
        {header}
        <div className="flex flex-col gap-2 p-3">
          <p className="text-[11px] font-bold" style={{ color: INK.gold }}>{T.commands.pickDest}</p>
          <div className="flex flex-wrap gap-1.5">
            {dests.length === 0 && <p className="text-[12px]" style={{ color: INK.mute }}>{T.toast.errors.not_adjacent}</p>}
            {dests.map((id) => <Chip key={id} active={dest === id} onClick={() => setDest(id)}>{names.territory(id)}</Chip>)}
          </div>
          {dest && (
            <div className="flex flex-col gap-1">
              <p className="mt-1 text-[11px] font-bold" style={{ color: INK.gold }}>{T.commands.pickOfficer}</p>
              {idle.map(({ hs, hero }) => (
                <OfficerRow key={hs.id} hero={hero} hs={hs} onClick={() => onRun({ kind: 'move', heroId: hs.id, to: dest })} right={<GameButton size="sm" onClick={() => onRun({ kind: 'move', heroId: hs.id, to: dest })}><MoveRight size={13} />{names.territory(dest)}</GameButton>} />
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  if (mode.kind === 'reward') {
    const list = officersAt(game, territory, PLAYER_ID).filter((h) => h.status === 'officer').map((hs) => ({ hs, hero: roster.byId.get(hs.id)! })).sort((a, b) => a.hs.loyalty - b.hs.loyalty)
    return (
      <div>
        {header}
        <div className="flex flex-col gap-1 p-3">
          {list.map(({ hs, hero }) => (
            <OfficerRow key={hs.id} hero={hero} hs={hs} right={<GameButton size="sm" disabled={hs.loyalty >= 100 || f.gold < LOYALTY.rewardGold} onClick={() => onRun({ kind: 'reward', target: hs.id })}><Gift size={13} />{T.commands.reward}</GameButton>} />
          ))}
        </div>
      </div>
    )
  }

  // 내정·군사·탐색 — 무장 고르기
  const task = mode.kind === 'dev' ? mode.task : 'search'
  const scored = idle.map((o) => ({
    ...o,
    score: task === 'search' ? Math.round(searchChance(game, o.hero, territory) * 100) : previewGain(game, roster, o.hs.id, task),
  })).sort((a, b) => b.score - a.score)
  return (
    <div>
      {header}
      <div className="flex flex-col gap-1 p-3">
        <p className="text-[11px] font-bold" style={{ color: INK.gold }}>{T.commands.pickOfficer}</p>
        {scored.length === 0 && <p className="text-[12px]" style={{ color: INK.mute }}>{T.commands.none}</p>}
        {scored.map(({ hs, hero, score }) => {
          const label = task === 'search' || task === 'subdue' ? T.commands.chance(score / 100) : task === 'conscript' ? `+${num(locale, score)}` : T.commands.expect(score)
          const disabled = task === 'conscript' && hs.troops >= heroMaxTroops(hero, hs, game)
          return (
            <OfficerRow
              key={hs.id}
              hero={hero}
              hs={hs}
              onClick={disabled ? undefined : () => onRun(task === 'search' ? { kind: 'search', heroId: hs.id } : { kind: task, heroId: hs.id })}
              right={
                <GameButton size="sm" variant="primary" disabled={disabled} onClick={() => onRun(task === 'search' ? { kind: 'search', heroId: hs.id } : { kind: task, heroId: hs.id })}>
                  {label}
                </GameButton>
              }
            />
          )
        })}
      </div>
    </div>
  )
}

// ── 남의 땅 ──

function ForeignTerritory({ game, territory, onSortie, onDiplomacy, names }: { game: GameState; territory: TerritoryId; onSortie: (target: TerritoryId, from?: TerritoryId) => void; onDiplomacy: (factionId: string) => void; names: ReturnType<typeof makeNames> }) {
  const { T, locale, roster, openHero } = useCheondo()
  const t = game.territories[territory]
  const owner = t.owner ? game.factions[t.owner] : null
  const defense = Math.round(defensePower(game, roster, territory))
  const stationed = owner ? officersAt(game, territory, owner.id).map((hs) => roster.byId.get(hs.id)!).filter(Boolean) : []
  const defenders = !owner ? pickDefenders(game, roster, territory, null).map((id) => roster.byId.get(id)!).filter(Boolean) : []
  const natives = roster.byHome.get(territory)?.length ?? 0
  const sources = game.playerFaction
    ? Object.values(game.territories).filter((src) => src.owner === PLAYER_ID && marchableNeighbors(game, src.id).includes(territory))
    : []
  const readySource = sources.find((src) => sortieCandidates(game, PLAYER_ID, src.id).length > 0)
  // 바닷길로만 닿는데 조선소가 없어 못 가는 경우 — 어디에 지으면 되는지 짚어 준다
  const portNeeded = game.playerFaction && sources.length === 0
    ? Object.values(game.territories).find((src) => src.owner === PLAYER_ID && isSeaRoute(src.id, territory) && !hasBuilding(src, 'shipyard'))
    : undefined
  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="grid grid-cols-3 gap-1.5">
        <StatCell label={T.territory.population} value={t.population} />
        <StatCell label={T.territory.walls} value={t.walls} max={DEV_MAX} color="#9aa7b4" />
        {owner ? <StatCell label={T.territory.order} value={t.order} max={100} color={INK.jade} /> : <StatCell label={T.territory.militia} value={t.militia} />}
      </div>
      <div className="flex items-center justify-between border px-3 py-2" style={{ borderColor: INK.line }}>
        <span className="text-[11px] font-semibold" style={{ color: INK.sub }}>{T.territory.defense}</span>
        <span className="text-[15px] font-black tabular-nums" style={{ color: INK.text }}>{num(locale, defense)}</span>
      </div>
      {owner && (
        <section>
          <h3 className="mb-1.5 text-[11px] font-bold" style={{ color: INK.gold }}>{T.territory.officers} {stationed.length}</h3>
          <div className="flex flex-wrap gap-1.5">
            {stationed.slice(0, 18).map((h) => (
              <button key={h.id} type="button" onClick={() => openHero(h.id)} title={h.name}><Portrait hero={h} size={34} ring={owner.lordId === h.id} /></button>
            ))}
          </div>
        </section>
      )}
      {!owner && defenders.length > 0 && (
        <section>
          <h3 className="mb-1.5 text-[11px] font-bold" style={{ color: INK.gold }}>{T.battle.enemy}</h3>
          <div className="flex flex-col gap-1">
            {defenders.map((h) => (
              <button key={h.id} type="button" onClick={() => openHero(h.id)} className="flex items-center gap-2 border px-2 py-1.5 text-left hover:border-[#d4af37]/50" style={{ borderColor: 'rgba(236,230,214,0.06)' }}>
                <Portrait hero={h} size={32} />
                <span className="truncate text-[13px] font-bold" style={{ color: INK.text }}>{h.name}</span>
                <GradeBadge grade={h.grade} />
                <ClassBadge cls={h.cls} />
              </button>
            ))}
          </div>
        </section>
      )}
      <p className="text-[11px]" style={{ color: INK.sub }}>{T.territory.nativeCount(natives)}</p>
      <div className="flex flex-col gap-2">
        {game.playerFaction && (
          <GameButton variant="danger" disabled={!readySource} onClick={() => readySource && onSortie(territory, readySource.id)} className="w-full">
            <Swords size={15} />{T.commands.sortie}
          </GameButton>
        )}
        {!readySource && game.playerFaction && (
          <p className="text-[11px] leading-snug" style={{ color: portNeeded ? INK.goldBright : INK.mute }}>
            {portNeeded ? T.sortie.needShipyard(names.territory(portNeeded.id)) : T.sortie.noSource}
          </p>
        )}
        {owner && game.playerFaction && (
          <GameButton onClick={() => onDiplomacy(owner.id)} className="w-full">{T.hud.diplomacy}</GameButton>
        )}
      </div>
      <span className="sr-only">{names.territory(territory)}</span>
    </div>
  )
}
