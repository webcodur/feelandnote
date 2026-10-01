/*
  천도 v2 — 출진 채비. 출발지·부대를 고르고 우리 전력과 적 수비력을 견준다.
*/
'use client'

import { useMemo, useState } from 'react'
import { Swords } from 'lucide-react'
import { armyPower, armyStrength, defensePower, defenseStrength, sortieRatio, unitPower } from '@/lib/game/suikoden/ai'
import { roundsToBreak } from '@/lib/game/suikoden/power'
import { BATTLE, CLASSES } from '@/lib/game/suikoden/constants'
import { type TerritoryId } from '@/lib/game/suikoden/map'
import { heroMaxTroops, marchableNeighbors, officersAt, PLAYER_ID } from '@/lib/game/suikoden/query'
import type { GameState } from '@/lib/game/suikoden/types'
import { checkAttack, sortieCandidates, sortieFood } from '@/lib/game/suikoden/war'
import { makeNames, useCheondo } from '../context'
import { num } from '../i18n'
import { Chip, GameButton, Meter, PanelTitle } from '../ui/Frame'
import { ClassBadge, GradeBadge, Portrait } from '../ui/HeroBits'
import { Modal } from '../ui/Overlay'
import { INK } from '../ui/theme'

interface SortiePanelProps {
  game: GameState
  target: TerritoryId | null
  from: TerritoryId | null
  onClose: () => void
  onLaunch: (from: TerritoryId, target: TerritoryId, ids: string[]) => void
}

export default function SortiePanel(props: SortiePanelProps) {
  return (
    <Modal open={!!props.target} onClose={props.onClose} width={640}>
      {props.target && <SortieBody key={`${props.target}-${props.from}`} {...props} target={props.target} />}
    </Modal>
  )
}

function SortieBody({ game, target: initialTarget, from: initialFrom, onClose, onLaunch }: SortiePanelProps & { target: TerritoryId }) {
  const { T, locale, roster, sfx } = useCheondo()
  const names = useMemo(() => makeNames(roster, locale, T, game), [roster, locale, T, game])
  const [target, setTarget] = useState<TerritoryId>(initialTarget)
  const sources = useMemo(() => Object.values(game.territories)
    .filter((t) => t.owner === PLAYER_ID && marchableNeighbors(game, t.id).includes(target))
    .map((t) => t.id), [game, target])
  const [from, setFrom] = useState<TerritoryId | null>(initialFrom && sources.includes(initialFrom) ? initialFrom : sources[0] ?? null)
  const targets = useMemo(() => (from ? marchableNeighbors(game, from).filter((id) => game.territories[id].owner !== PLAYER_ID) : []), [game, from])
  const ready = useMemo(() => (from ? sortieCandidates(game, PLAYER_ID, from) : [])
    .map((hs) => ({ hs, hero: roster.byId.get(hs.id)! }))
    .filter((x) => x.hero)
    .sort((a, b) => unitPower(game, roster, b.hs) - unitPower(game, roster, a.hs)), [game, from, roster])
  const [picked, setPicked] = useState<string[]>(() => ready.slice(0, BATTLE.maxUnits).map((x) => x.hs.id))
  const check = from ? checkAttack(game, PLAYER_ID, from, target) : { ok: false, code: 'not_own_territory' }
  const army = picked.map((id) => game.heroes[id]).filter(Boolean)
  const ours = armyPower(game, roster, army)
  const theirs = defensePower(game, roster, target)
  const ratio = army.length > 0 ? sortieRatio(game, roster, army, target) : 0
  // 소모전으로는 밀리지 않아도 제한 합 안에 성을 떨어뜨리지 못할 만큼 치는 힘이 약한가
  const slowBreak = army.length > 0 && roundsToBreak(armyStrength(game, roster, army), defenseStrength(game, roster, target)) > BATTLE.effectiveRounds * 1.15
  // 헤드리스 대조(.artifacts 보정)로 비 1.05 언저리가 승률 7할쯤이다
  const advantage = ratio < 0.85 ? 0 : ratio < 1.05 ? 1 : ratio < 1.5 ? 2 : 3
  const food = sortieFood(game, picked)
  const foodOk = game.factions[PLAYER_ID].food >= food
  const toggle = (id: string) => {
    sfx('pick')
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : p.length >= BATTLE.maxUnits ? p : [...p, id]))
  }
  const owner = game.territories[target].owner
  const error = !check.ok ? T.sortie.errors[check.code] : picked.length === 0 ? T.sortie.errors.no_units : !foodOk ? T.sortie.errors.not_enough_food : null
  // 이긴 부대는 새 땅에 눌러앉는다 — 출발지가 비면 쉽게 떨어진다
  const leavesEmpty = !!from && picked.length > 0 && officersAt(game, from, PLAYER_ID).every((h) => picked.includes(h.id))

  return (
    <>
      <PanelTitle hanja="戰" title={T.sortie.title} sub={`${from ? names.territory(from) : '—'} → ${names.territory(target)} · ${owner ? names.faction(owner) : T.neutral}`} />
      <div className="flex flex-col gap-4 overflow-y-auto p-4">
        {/* 고를 것이 하나뿐이면 제목 줄(출발 → 목표)이 이미 말해 주므로 줄을 세우지 않는다 */}
        {(sources.length > 1 || targets.length > 1) && (
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="w-10 text-[11px] font-bold" style={{ color: INK.mute }}>{T.sortie.from}</span>
            {sources.map((id) => (
              <Chip
                key={id}
                active={from === id}
                onClick={() => {
                  setFrom(id)
                  setPicked(sortieCandidates(game, PLAYER_ID, id)
                    .sort((a, b) => unitPower(game, roster, b) - unitPower(game, roster, a))
                    .slice(0, BATTLE.maxUnits).map((h) => h.id))
                }}
              >
                {names.territory(id)}
              </Chip>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="w-10 text-[11px] font-bold" style={{ color: INK.mute }}>{T.sortie.to}</span>
            {targets.map((id) => <Chip key={id} active={target === id} onClick={() => setTarget(id)}>{names.territory(id)}</Chip>)}
          </div>
        </div>
        )}

        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 border p-3" style={{ borderColor: INK.line }}>
          <div>
            <p className="text-[11px]" style={{ color: INK.sub }}>{T.sortie.ourPower}</p>
            <p className="text-lg font-black tabular-nums" style={{ color: INK.jade }}>{num(locale, ours)}</p>
          </div>
          <span className="border px-2 py-1 text-[12px] font-black" style={{ borderColor: advantage >= 2 ? INK.jade : advantage === 0 ? INK.seal : INK.lineStrong, color: advantage >= 2 ? INK.jade : advantage === 0 ? INK.sealBright : INK.goldBright }}>
            {T.sortie.advantage[advantage]}
          </span>
          <div className="text-right">
            <p className="text-[11px]" style={{ color: INK.sub }}>{T.sortie.enemyPower}</p>
            <p className="text-lg font-black tabular-nums" style={{ color: INK.sealBright }}>{num(locale, theirs)}</p>
          </div>
          {/* 막대는 승산 비를 그린다 — 가운데를 넘으면 유리 */}
          <div className="relative col-span-3 flex h-2 overflow-hidden" aria-hidden>
            <div style={{ width: `${(ratio / (1 + ratio)) * 100}%`, background: INK.jade }} />
            <div className="flex-1" style={{ background: INK.seal }} />
            <span className="absolute inset-y-0 left-1/2 w-px bg-black/60" />
          </div>
          {slowBreak && <p className="col-span-3 text-[11px] leading-relaxed" style={{ color: '#ffcf9e' }}>{T.sortie.slowBreak}</p>}
        </div>

        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-[11px] font-bold" style={{ color: INK.gold }}>{T.sortie.pick(picked.length, BATTLE.maxUnits)}</span>
            <span className="text-[11px] tabular-nums" style={{ color: foodOk ? INK.sub : INK.sealBright }}>{T.sortie.supply(food)}</span>
          </div>
          {/* 휴대폰도 두 칸 — 여섯 부대가 한 화면에 들어오게 */}
          <div className="grid grid-cols-2 gap-1.5">
            {ready.length === 0 && <p className="col-span-2 text-[12px]" style={{ color: INK.mute }}>{T.sortie.noSource}</p>}
            {ready.map(({ hs, hero }) => {
              const on = picked.includes(hs.id)
              const max = heroMaxTroops(hero, hs, game)
              return (
                <button
                  key={hs.id}
                  type="button"
                  aria-pressed={on}
                  onClick={() => toggle(hs.id)}
                  className={`flex min-w-0 items-center gap-2 border px-1.5 py-1.5 text-left sm:gap-2.5 sm:px-2 ${on ? 'border-[#f3d57a] bg-[#d4af37]/[0.12]' : 'border-white/[0.07] hover:border-[#d4af37]/50'}`}
                >
                  <Portrait hero={hero} size={40} fluid ring={on} className="h-9 w-9 sm:h-10 sm:w-10" />
                  <span className="min-w-0 flex-1">
                    <span className="flex min-w-0 items-center gap-1"><span className="min-w-0 truncate text-[13px] font-bold" style={{ color: INK.text }}>{hero.name}</span><GradeBadge grade={hero.grade} className="shrink-0" /><ClassBadge cls={hero.cls} className="shrink-0 max-sm:hidden" /></span>
                    <span className="flex items-center gap-2 text-[10px]" style={{ color: INK.sub }}>
                      {/* 휴대폰은 이름 줄이 좁아 병과 표지를 이 줄로 내린다 */}
                      <span className="font-black sm:hidden" style={{ color: CLASSES[hero.cls].color }} aria-hidden>{CLASSES[hero.cls].hanja}</span>
                      <span>{CLASSES[hero.cls].row === 0 ? T.battle.front : T.battle.back}</span>
                      <span className="tabular-nums">{num(locale, hs.troops)}</span>
                    </span>
                    <Meter value={hs.troops} max={max} color={INK.jade} height={3} className="mt-1" />
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {!error && leavesEmpty && from && <p className="text-[12px] leading-relaxed" style={{ color: '#ffcf9e' }}>{T.sortie.leavesEmpty(names.territory(from))}</p>}
        {error && <p className="text-[12px] font-semibold" style={{ color: INK.sealBright }}>{error}</p>}
        <div className="flex justify-end gap-2">
          <GameButton variant="quiet" onClick={onClose}>{T.cancel}</GameButton>
          <GameButton variant="danger" disabled={!!error || !from} onClick={() => from && onLaunch(from, target, picked)}>
            <Swords size={15} />{T.sortie.start}
          </GameButton>
        </div>
      </div>
    </>
  )
}
