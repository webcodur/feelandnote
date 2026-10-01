/*
  천도 v2 — 판의 끝. 통일·패망·시간 초과와 걸어온 길, 모인 별.
*/
'use client'

import { useMemo } from 'react'
import { activeStars, PLAYER_ID, membersOf } from '@/lib/game/suikoden/query'
import { STAR_COUNT } from '@/lib/game/suikoden/stars'
import type { GameState } from '@/lib/game/suikoden/types'
import { useCheondo } from '../context'
import { num } from '../i18n'
import { GameButton, MusicSlot, Panel } from '../ui/Frame'
import { Portrait } from '../ui/HeroBits'
import { INK } from '../ui/theme'

export default function ResultScreen({ game, onTitle }: { game: GameState; onTitle: () => void }) {
  const { T, roster, locale, openHero } = useCheondo()
  const outcome = game.outcome!
  const lord = roster.byId.get(game.lordId)
  const f = game.factions[PLAYER_ID]
  const stars = useMemo(() => activeStars(game, PLAYER_ID).map((id) => roster.byId.get(id)!).filter(Boolean), [game, roster])
  const members = f ? membersOf(game, PLAYER_ID).length : 0
  const title = outcome.kind === 'unified' ? T.result.unified : outcome.kind === 'fallen' ? T.result.fallen : T.result.timeout
  const desc = outcome.kind === 'unified' ? T.result.unifiedDesc : outcome.kind === 'fallen' ? T.result.fallenDesc : T.result.timeoutDesc
  const win = outcome.kind === 'unified'
  const stats: [string, string][] = [
    [T.result.stats.turns, T.result.months(game.turn)],
    [T.result.stats.lands, num(locale, game.stats.maxTerritories)],
    [T.result.stats.won, num(locale, game.stats.battlesWon)],
    [T.result.stats.lost, num(locale, game.stats.battlesLost)],
    [T.result.stats.recruited, num(locale, game.stats.recruited)],
    [T.result.stats.stars, `${stars.length} / ${STAR_COUNT}`],
  ]
  return (
    <div className="absolute inset-0 overflow-y-auto" style={{ background: win ? 'radial-gradient(ellipse at 50% 0%, #3a2c12 0%, #0a0907 60%)' : 'radial-gradient(ellipse at 50% 0%, #22181a 0%, #07070a 60%)' }}>
      <MusicSlot className="absolute right-3 top-3 z-10" />
      <div className="mx-auto flex max-w-4xl flex-col items-center gap-4 px-4 py-6 sm:gap-6 sm:py-10">
        <span className="cheondo-stamp grid h-20 w-20 place-items-center text-4xl font-black sm:h-24 sm:w-24 sm:text-5xl" style={{ background: win ? INK.seal : '#2c2c30', color: win ? '#fff3ea' : INK.sub }}>{win ? '統' : outcome.kind === 'fallen' ? '亡' : '忘'}</span>
        <h1 className="text-4xl font-black" style={{ color: win ? INK.goldBright : INK.text }}>{title}</h1>
        <p className="text-[15px]" style={{ color: INK.sub }}>{desc}</p>
        {lord && (
          <div className="flex items-center gap-3">
            <Portrait hero={lord} size={72} ring />
            <div>
              <p className="text-lg font-black" style={{ color: INK.text }}>{T.faction(lord.name)}</p>
              <p className="text-[12px]" style={{ color: INK.sub }}>{T.hud.officers} {members}</p>
            </div>
          </div>
        )}
        <Panel className="grid w-full grid-cols-2 gap-px sm:grid-cols-3" corners>
          {stats.map(([label, value]) => (
            <div key={label} className="flex flex-col items-center gap-1 p-3 sm:p-4">
              <span className="text-[11px]" style={{ color: INK.mute }}>{label}</span>
              <span className="text-xl font-black tabular-nums" style={{ color: INK.text }}>{value}</span>
            </div>
          ))}
        </Panel>
        {/* 다음 할 일은 첫 화면 안에 — 별 명단은 그 아래로 내려 본다 */}
        <GameButton variant="primary" size="lg" onClick={onTitle}>{T.result.again}</GameButton>
        {stars.length > 0 && (
          <div className="w-full">
            <p className="mb-2 text-center text-[12px] font-bold" style={{ color: INK.gold }}>{T.roster.title} {T.roster.hanja}</p>
            <div className="flex flex-wrap justify-center gap-1.5">
              {stars.slice(0, STAR_COUNT).map((h) => (
                <button key={h.id} type="button" onClick={() => openHero(h.id)} title={h.name}><Portrait hero={h} size={40} /></button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
