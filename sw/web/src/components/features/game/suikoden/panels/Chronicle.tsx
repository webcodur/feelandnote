/*
  천도 v2 — 기록: 한 달 결산 쪽지와 전체 연대기
*/
'use client'

import { useMemo } from 'react'
import { X } from 'lucide-react'
import { calendarOf } from '@/lib/game/suikoden/constants'
import type { GameState, LogEntry } from '@/lib/game/suikoden/types'
import { makeNames, useCheondo } from '../context'
import { formatLog, num } from '../i18n'
import { Panel, PanelTitle } from '../ui/Frame'
import { Modal } from '../ui/Overlay'
import { INK } from '../ui/theme'

const BAD = new Set(['conquer', 'defected', 'unpaid', 'starving', 'food_bought', 'drought', 'flood', 'plague', 'locusts', 'threat', 'invaded', 'captured_turned', 'treaty_broken', 'subdue_fail', 'persuade_fail'])
const GOOD = new Set(['conquer_neutral', 'recruit_ok', 'visitor_joined', 'prisoner_joined', 'prisoner_rescued', 'alliance_ok', 'ceasefire_ok', 'surrender_ok', 'fame_rank', 'stars108', 'bumper', 'festival', 'harvest', 'build_done', 'subdue_ok', 'repelled', 'raise', 'volunteers', 'wander_joined'])

function toneOf(e: LogEntry): string {
  if (BAD.has(e.code)) return INK.sealBright
  if (GOOD.has(e.code)) return INK.jade
  return INK.sub
}

/** 달을 넘긴 직후 잠깐 보이는 결산 */
export function TurnReportCard({ game, onClose }: { game: GameState; onClose: () => void }) {
  const { T, roster, locale } = useCheondo()
  const names = useMemo(() => makeNames(roster, locale, T, game), [roster, locale, T, game])
  const r = game.report
  if (!r) return null
  const { year, month } = calendarOf(r.turn)
  const net = { gold: r.income.gold - r.expense.gold, food: r.income.food - r.expense.food }
  const entries = r.entries.slice(-6)
  return (
    <Panel className="w-[min(92vw,340px)] cheondo-rise">
      <div className="flex items-center gap-2 border-b px-3 py-2" style={{ borderColor: INK.line }}>
        <span className="flex-1 text-[12px] font-extrabold" style={{ color: INK.text }}>{T.report.title(T.date(year, month))}</span>
        <button type="button" onClick={onClose} aria-label={T.close} className="grid h-7 w-7 place-items-center text-[#a8a293] hover:bg-white/[0.06] hover:text-[#f3d57a]"><X size={14} /></button>
      </div>
      <div className="flex flex-col gap-2 p-3">
        {game.playerFaction && (
          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div className="border px-2 py-1.5" style={{ borderColor: INK.line }}>
              <span style={{ color: INK.mute }}>{T.hud.gold}</span>
              <p className="font-bold tabular-nums" style={{ color: net.gold >= 0 ? INK.jade : INK.sealBright }}>{net.gold >= 0 ? '+' : ''}{num(locale, net.gold)}</p>
            </div>
            <div className="border px-2 py-1.5" style={{ borderColor: INK.line }}>
              <span style={{ color: INK.mute }}>{T.hud.food}</span>
              <p className="font-bold tabular-nums" style={{ color: net.food >= 0 ? INK.jade : INK.sealBright }}>{net.food >= 0 ? '+' : ''}{num(locale, net.food)}</p>
            </div>
          </div>
        )}
        {entries.length === 0 ? (
          <p className="text-[12px]" style={{ color: INK.sub }}>{T.report.quiet}</p>
        ) : (
          <ul className="flex flex-col gap-1">
            {entries.map((e, i) => (
              <li key={i} className="flex gap-2 text-[12px] leading-snug">
                <span aria-hidden className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: toneOf(e) }} />
                <span style={{ color: INK.text }}>{formatLog(locale, e, names)}</span>
              </li>
            ))}
            {r.entries.length > entries.length && <li className="text-[11px]" style={{ color: INK.mute }}>{T.report.more(r.entries.length - entries.length)}</li>}
          </ul>
        )}
      </div>
    </Panel>
  )
}

export function ChronicleModal({ open, game, onClose }: { open: boolean; game: GameState; onClose: () => void }) {
  const { T, roster, locale } = useCheondo()
  const names = useMemo(() => makeNames(roster, locale, T, game), [roster, locale, T, game])
  const groups = useMemo(() => {
    const byTurn = new Map<number, LogEntry[]>()
    for (const e of game.log.slice().reverse()) {
      if (!byTurn.has(e.turn)) byTurn.set(e.turn, [])
      byTurn.get(e.turn)!.push(e)
    }
    return [...byTurn.entries()]
  }, [game.log])
  return (
    <Modal open={open} onClose={onClose} width={640} label={T.hud.chronicle}>
      <PanelTitle title={T.hud.chronicle} />
      <div className="flex flex-col gap-4 overflow-y-auto p-4">
        {groups.map(([turn, entries]) => {
          const { year, month } = calendarOf(turn)
          return (
            <section key={turn}>
              <h3 className="mb-1.5 text-[11px] font-bold" style={{ color: INK.gold }}>{T.date(year, month)}</h3>
              <ul className="flex flex-col gap-1">
                {entries.map((e, i) => (
                  <li key={i} className="flex gap-2 text-[12px] leading-snug">
                    <span aria-hidden className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: toneOf(e) }} />
                    <span style={{ color: e.mine ? INK.text : INK.sub }}>{formatLog(locale, e, names)}</span>
                  </li>
                ))}
              </ul>
            </section>
          )
        })}
      </div>
    </Modal>
  )
}
