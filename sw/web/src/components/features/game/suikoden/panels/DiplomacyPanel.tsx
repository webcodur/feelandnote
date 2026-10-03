/*
  천도 v2 — 외교. 세력마다 관계·맹약·힘을 견주고, 사신을 보내 선물·동맹·정전·항복을 청한다.
*/
'use client'

import { useMemo, useState } from 'react'
import { DIPLOMACY } from '@/lib/game/suikoden/constants'
import { diplomacyChance, runDiplomacy, surrenderWait, type DiploAction } from '@/lib/game/suikoden/diplomacy'
import { factionPower, membersOf, PLAYER_ID, territoriesOf, treatyOf } from '@/lib/game/suikoden/query'
import type { GameState } from '@/lib/game/suikoden/types'
import type { CommandResult } from '@/lib/game/suikoden/commands'
import { makeNames, useCheondo } from '../context'
import { num } from '../i18n'
import { GameButton, PanelTitle, Seal } from '../ui/Frame'
import { Portrait } from '../ui/HeroBits'
import { Modal } from '../ui/Overlay'
import { INK } from '../ui/theme'
import { resultToast } from './resultText'
import type { Act } from './TerritoryPanel'

interface DiplomacyPanelProps {
  open: boolean
  game: GameState
  focus: string | null
  act: Act
  onClose: () => void
}

const ACTIONS: DiploAction[] = ['gift', 'alliance', 'ceasefire', 'surrender', 'break']

export default function DiplomacyPanel({ open, game, focus, act, onClose }: DiplomacyPanelProps) {
  const { T } = useCheondo()
  return (
    <Modal open={open} onClose={onClose} width={900} label={T.diplomacy.title}>
      <PanelTitle title={T.diplomacy.title} />
      {open && <DiplomacyBody game={game} focus={focus} act={act} />}
    </Modal>
  )
}

function DiplomacyBody({ game, focus, act }: { game: GameState; focus: string | null; act: Act }) {
  const { T, roster, locale, toast, sfx } = useCheondo()
  const names = useMemo(() => makeNames(roster, locale, T, game), [roster, locale, T, game])
  const factions = useMemo(() => Object.values(game.factions).filter((f) => f.alive && !f.isPlayer)
    .map((f) => ({ f, power: factionPower(game, roster, f.id), lands: territoriesOf(game, f.id).length, members: membersOf(game, f.id).length }))
    .sort((a, b) => b.power - a.power), [game, roster])
  const [selected, setSelected] = useState<string | null>(focus ?? factions[0]?.f.id ?? null)
  const myPower = factionPower(game, roster, PLAYER_ID)
  const envoy = useMemo(() => membersOf(game, PLAYER_ID)
    .filter((h) => !h.acted)
    .map((hs) => ({ hs, hero: roster.byId.get(hs.id)! }))
    .filter((x) => x.hero)
    .sort((a, b) => (b.hero.stats.charm + b.hero.stats.intellect * 0.5) - (a.hero.stats.charm + a.hero.stats.intellect * 0.5))[0] ?? null, [game, roster])
  const sel = factions.find((x) => x.f.id === selected) ?? null

  if (factions.length === 0) return <p className="p-6 text-sm" style={{ color: INK.sub }}>{T.diplomacy.none}</p>

  const run = (action: DiploAction) => {
    if (!envoy || !sel) return
    const r: CommandResult = act((draft) => runDiplomacy(draft, roster, envoy.hs.id, sel.f.id, action))
    const msg = resultToast(T, names, r)
    toast(msg.text, msg.tone)
    sfx(r.ok && !r.code.endsWith('_fail') ? 'confirm' : 'lose')
  }

  return (
    // 휴대폰은 세력 목록(위)과 고른 세력의 외교(아래)가 높이를 나눠 쓴다 — 목록이 한 줄로 쪼그라들지 않게
    <div className="grid min-h-0 flex-1 grid-cols-1 overflow-hidden max-md:grid-rows-[minmax(0,2fr)_minmax(0,3fr)] md:grid-cols-[1fr_320px]">
      <div className="min-h-0 overflow-y-auto p-2 sm:p-3">
        <div className="flex flex-col gap-1">
          {factions.map(({ f, power, lands, members }) => {
            const lord = roster.byId.get(f.lordId)
            const rel = game.factions[PLAYER_ID]?.relations[f.id] ?? 0
            const treaty = treatyOf(game, PLAYER_ID, f.id)
            const active = selected === f.id
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => setSelected(f.id)}
                className={`flex items-center gap-2 border px-2 py-2 text-left sm:gap-3 sm:px-3 ${active ? 'border-[#f3d57a] bg-[#d4af37]/[0.1]' : 'border-white/[0.06] hover:border-[#d4af37]/50'}`}
              >
                {/* 좁은 화면은 도장을 빼고 얼굴 테두리에 세력 빛을 둔다 */}
                <span className="max-sm:hidden"><Seal color={f.color} text={lord?.name ?? ''} size={26} /></span>
                {lord && <span className="shrink-0 rounded-[3px] sm:shadow-none" style={{ boxShadow: `0 0 0 2px ${f.color}` }}><Portrait hero={lord} size={36} /></span>}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-bold" style={{ color: INK.text }}>{names.faction(f.id)}</span>
                  <span className="block truncate text-[11px]" style={{ color: INK.sub }}>{T.diplomacy.personality[f.personality]} · {T.diplomacy.lands(lands)} · {T.diplomacy.members(members)}</span>
                </span>
                <span className="w-20 shrink-0 sm:w-28">
                  <span className="flex justify-between text-[10px]" style={{ color: INK.mute }}><span>{T.diplomacy.relation}</span><span className="font-bold tabular-nums" style={{ color: rel >= 0 ? INK.jade : INK.sealBright }}>{rel}</span></span>
                  <span className="relative mt-1 block h-1.5 bg-white/[0.07]">
                    <span className="absolute inset-y-0 left-1/2 w-px bg-white/25" />
                    <span className="absolute inset-y-0" style={{ left: rel >= 0 ? '50%' : `${50 + rel / 2}%`, width: `${Math.abs(rel) / 2}%`, background: rel >= 0 ? INK.jade : INK.seal }} />
                  </span>
                </span>
                <span className="w-16 shrink-0 text-right leading-tight sm:w-20">
                  {treaty ? (
                    <span className="text-[11px] font-bold" style={{ color: INK.jade }}>{T.diplomacy.treaty[treaty.kind]}</span>
                  ) : (
                    <>
                      <span className="block text-[10px]" style={{ color: INK.mute }}>{T.diplomacy.power}</span>
                      <span className="block text-[12px] font-bold tabular-nums" style={{ color: power > myPower ? '#ffb8a6' : INK.text }}>{num(locale, power)}</span>
                    </>
                  )}
                </span>
              </button>
            )
          })}
        </div>
      </div>
      <div className="flex min-h-0 flex-col gap-3 overflow-y-auto border-t p-4 md:border-l md:border-t-0" style={{ borderColor: INK.line }}>
        {sel ? (
          <>
            <div className="flex items-center gap-3">
              {roster.byId.get(sel.f.lordId) && <Portrait hero={roster.byId.get(sel.f.lordId)!} size={56} ring />}
              <div className="min-w-0">
                <p className="truncate text-[15px] font-black" style={{ color: INK.text }}>{names.faction(sel.f.id)}</p>
                <p className="text-[11px]" style={{ color: INK.sub }}>{T.diplomacy.powerVs(num(locale, sel.power), num(locale, myPower))}</p>
                {treatyOf(game, PLAYER_ID, sel.f.id) && (
                  <p className="text-[11px] font-bold" style={{ color: INK.jade }}>
                    {T.diplomacy.treaty[treatyOf(game, PLAYER_ID, sel.f.id)!.kind]} · {T.diplomacy.until(treatyOf(game, PLAYER_ID, sel.f.id)!.until - game.turn)}
                  </p>
                )}
              </div>
            </div>
            <p className="text-[11px]" style={{ color: INK.sub }}>{T.diplomacy.envoy}: <b style={{ color: INK.text }}>{envoy ? envoy.hero.name : T.diplomacy.noEnvoy}</b></p>
            {ACTIONS.map((action) => {
              const treaty = treatyOf(game, PLAYER_ID, sel.f.id)
              if (action === 'break' && !treaty) return null
              if ((action === 'alliance' || action === 'ceasefire') && treaty) return null
              const p = envoy ? diplomacyChance(game, roster, envoy.hero, sel.f.id, action) : 0
              const wait = action === 'surrender' ? surrenderWait(game, sel.f.id) : 0
              const disabled = !envoy || p <= 0 || (action === 'gift' && (game.factions[PLAYER_ID]?.gold ?? 0) < DIPLOMACY.giftGold)
              return (
                <div key={action} className="border p-2.5" style={{ borderColor: INK.line }}>
                  <div className="flex items-center gap-2">
                    <span className="flex-1 text-[13px] font-bold" style={{ color: INK.text }}>{T.diplomacy.actions[action]}</span>
                    <GameButton size="sm" variant={action === 'break' ? 'danger' : action === 'surrender' ? 'primary' : 'ghost'} disabled={disabled} onClick={() => run(action)}>
                      {action === 'gift' ? T.diplomacy.send
                        : action === 'break' ? T.diplomacy.breakDo
                          : wait > 0 ? T.diplomacy.waitMonths(wait)
                          : p <= 0 ? (action === 'alliance' ? T.diplomacy.needRelation(DIPLOMACY.allianceMin) : T.diplomacy.notYet)
                            : T.diplomacy.odds(Math.round(p * 100))}
                    </GameButton>
                  </div>
                  <p className="mt-1 text-[11px] leading-relaxed" style={{ color: INK.sub }}>{T.diplomacy.desc[action]}</p>
                </div>
              )
            })}
          </>
        ) : null}
      </div>
    </div>
  )
}
