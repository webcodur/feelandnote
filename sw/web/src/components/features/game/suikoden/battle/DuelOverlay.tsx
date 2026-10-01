/*
  천도 v2 — 일기토. 두 장수가 마주 서서 공격·방어·필살 가운데 하나를 고른다.
  상대가 내뱉는 말에 다음 수가 비친다(열에 일곱은 참말이다).
*/
'use client'

import { useState } from 'react'
import { Shield, Swords, Zap } from 'lucide-react'
import type { BattleState, DuelMove } from '@/lib/game/suikoden/types'
import { unitById } from '@/lib/game/suikoden/battle'
import { useCheondo } from '../context'
import { GameButton, Meter } from '../ui/Frame'
import { Portrait } from '../ui/HeroBits'
import { INK } from '../ui/theme'

interface DuelOverlayProps {
  battle: BattleState
  nameOf: (id: string) => string
  onMove: (move: DuelMove) => void
  onRefuse: () => void
  onClose: () => void
}

const MOVE_ICON: Record<DuelMove, React.ReactNode> = {
  attack: <Swords size={18} />,
  guard: <Shield size={18} />,
  desperate: <Zap size={18} />,
}

export default function DuelOverlay({ battle, nameOf, onMove, onRefuse }: DuelOverlayProps) {
  const { T, roster, sfx } = useCheondo()
  const duel = battle.duel!
  const [accepted, setAccepted] = useState(duel.player !== 'b' || duel.rounds.length > 0)
  const mine = duel.player === 'b' ? duel.b : duel.a
  const theirs = duel.player === 'b' ? duel.a : duel.b
  const left = duel.player ? mine : duel.a
  const right = duel.player ? theirs : duel.b
  const hp = (id: string) => (id === duel.a ? [duel.hpA, duel.maxA] : [duel.hpB, duel.maxB])
  const last = duel.rounds[duel.rounds.length - 1]
  const hintLines = T.duel.hints[duel.hint]
  const hintText = hintLines[duel.rounds.length % hintLines.length]
  const playerTurn = !!duel.player && !duel.done && accepted
  const incoming = duel.player === 'b' && !accepted
  const leftUnit = unitById(battle, left)
  const rightUnit = unitById(battle, right)

  const move = (m: DuelMove) => { sfx('clang'); onMove(m) }

  return (
    <div className="absolute inset-0 z-40 flex flex-col items-center justify-center gap-4 p-4" style={{ background: 'radial-gradient(ellipse at center, rgba(40,14,8,0.92) 0%, rgba(4,4,6,0.96) 70%)' }} role="dialog" aria-label={T.duel.title}>
      <p className="cheondo-stamp text-3xl font-black tracking-tight sm:text-5xl" style={{ color: INK.sealBright, textShadow: '0 0 30px rgba(226,88,60,0.45)' }}>{T.duel.title}</p>
      <div className="flex w-full max-w-3xl items-center justify-between gap-3">
        {[left, right].map((id, i) => {
          const [cur, max] = hp(id)
          const hero = roster.byId.get(id) ?? null
          const u = i === 0 ? leftUnit : rightUnit
          const hitThisRound = last && ((id === duel.a && last.dmgA > 0) || (id === duel.b && last.dmgB > 0))
          return (
            <div key={id} className={`flex w-[44%] flex-col items-center gap-2 ${i === 1 ? 'items-center' : ''}`}>
              <div key={`${id}-${duel.rounds.length}`} className={hitThisRound ? 'cheondo-shake' : ''}>
                <Portrait hero={hero} size={168} ring priority className="max-sm:!h-[112px] max-sm:!w-[112px]" />
              </div>
              <p className="text-center text-lg font-black" style={{ color: INK.text }}>{nameOf(id)}</p>
              <p className="text-[11px]" style={{ color: INK.sub }}>{T.abilities.martial} {u?.stats.martial ?? 0}</p>
              <Meter value={cur} max={max} color={i === 0 && duel.player ? INK.jade : INK.sealBright} height={8} />
              <p className="text-[12px] font-bold tabular-nums" style={{ color: INK.text }}>{Math.round(cur)} / {max}</p>
            </div>
          )
        })}
      </div>

      {last && (
        <p className="text-[13px] font-semibold" style={{ color: INK.sub }}>
          {T.duel.round(duel.rounds.length)} · {T.duel.moves[duel.player === 'b' ? last.b : last.a]} vs {T.duel.moves[duel.player === 'b' ? last.a : last.b]}
        </p>
      )}

      {duel.done ? (
        <p className="cheondo-rise text-xl font-black" style={{ color: INK.goldBright }}>{duel.winner ? T.duel.win(nameOf(duel.winner)) : T.duel.draw}</p>
      ) : incoming ? (
        <div className="flex flex-col items-center gap-3">
          <p className="text-[15px] font-bold" style={{ color: INK.text }}>{T.duel.incoming(nameOf(duel.a))}</p>
          <div className="flex gap-2">
            <GameButton variant="quiet" onClick={onRefuse}>{T.duel.refuse}</GameButton>
            <GameButton variant="danger" onClick={() => { sfx('clang'); setAccepted(true) }}><Swords size={15} />{T.duel.accept}</GameButton>
          </div>
        </div>
      ) : playerTurn ? (
        <div className="flex flex-col items-center gap-3">
          <div className="relative border px-5 py-3 text-center" style={{ borderColor: 'rgba(226,88,60,0.5)', background: 'rgba(8,8,10,0.9)' }}>
            <p className="text-[11px] font-bold" style={{ color: INK.sealBright }}>{nameOf(theirs)}</p>
            <p className="text-[17px] font-black" style={{ color: INK.text }}>「{hintText}」</p>
          </div>
          <p className="text-[11px]" style={{ color: INK.mute }}>{T.duel.read} · {T.duel.rule}</p>
          <div className="flex gap-2">
            {(['attack', 'guard', 'desperate'] as DuelMove[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => move(m)}
                className="flex h-14 w-24 flex-col items-center justify-center gap-1 border-2 border-[#d4af37]/50 bg-black/40 text-[13px] font-black text-[#ece6d6] hover:border-[#f3d57a] hover:bg-[#d4af37]/20 hover:text-[#f3d57a] sm:w-28"
              >
                {MOVE_ICON[m]}{T.duel.moves[m]}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <p className="text-[13px]" style={{ color: INK.sub }}>{T.duel.challenge(nameOf(duel.a), nameOf(duel.b))}</p>
      )}
    </div>
  )
}
