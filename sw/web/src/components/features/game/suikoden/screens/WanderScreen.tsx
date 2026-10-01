/*
  천도 v2 — 방랑. 군주가 길동무를 모으며 떠돌다 빈 땅에 깃발을 세운다.
  지도에서 이웃 땅을 눌러 떠나고, 머문 곳에서는 수소문한다. 한 번 움직일 때마다 한 달이 흐른다.
*/
'use client'

import { useMemo, useState } from 'react'
import { Anchor, Flag, Footprints, MapPin, Search, UserMinus } from 'lucide-react'
import { WANDER } from '@/lib/game/suikoden/constants'
import { flagEmoji, isSeaRoute, neighborsOf, REGIONS, TERRITORY_BY_ID, type TerritoryId } from '@/lib/game/suikoden/map'
import { freeHeroesAt } from '@/lib/game/suikoden/query'
import type { Encounter, GameState } from '@/lib/game/suikoden/types'
import {
  banditWinChance, canRaiseHere, partyPower, wanderMove, wanderPart, wanderRaise, wanderRecruitChance, wanderResolve, wanderSearch, type WanderChoice,
} from '@/lib/game/suikoden/wander'
import { makeNames, useCheondo } from '../context'
import { pickLine, useLines } from '../hooks/useCheondoData'
import { encounterTitle } from '../i18n'
import { useWide } from '../hooks/useWide'
import { WorldMap, type MapMarker } from '../map/WorldMap'
import TopBar from '../panels/TopBar'
import { GameButton, Panel, PanelTitle } from '../ui/Frame'
import { ClassBadge, GradeBadge, Portrait } from '../ui/HeroBits'
import { Modal } from '../ui/Overlay'
import { INK } from '../ui/theme'

interface WanderScreenProps {
  game: GameState
  setGame: (s: GameState) => void
  onMenu: () => void
}

export default function WanderScreen({ game, setGame, onMenu }: WanderScreenProps) {
  const { roster, T, locale, sfx, voice, openHero } = useCheondo()
  const w = game.wander!
  const lord = roster.byId.get(game.lordId)!
  const [selected, setSelected] = useState<TerritoryId | null>(null)
  const [confirmRaise, setConfirmRaise] = useState(false)
  const [dismissed, setDismissed] = useState<number>(-1)
  const names = useMemo(() => makeNames(roster, locale, T, game), [roster, locale, T, game])
  const neighbors = useMemo(() => new Set(neighborsOf(w.loc).map((n) => n.id)), [w.loc])
  const here = game.territories[w.loc]
  const locals = useMemo(() => freeHeroesAt(game, roster, w.loc).length, [game, roster, w.loc])
  const raise = canRaiseHere(game)
  const raiseHint = raise.ok
    ? (raise.code === 'uprising' ? T.wander.uprisingSub : T.wander.raiseSub)
    : (raise.code === 'capital' ? T.wander.capitalBlocked : T.wander.occupied)
  const enc = w.encounter
  const encHero = enc?.heroId ? roster.byId.get(enc.heroId) ?? null : null
  const lines = useLines([encHero?.id])
  const greet = encHero ? pickLine(lines[encHero.id], 'greeting', game.turn) : null
  const showEncounter = enc && dismissed !== game.turn
  const mine = partyPower(game, roster)
  const encSub = !enc ? null
    : enc.kind === 'bandits' ? T.wander.enc.banditsSub(enc.power ?? 0, mine, banditWinChance(game, roster, enc.power ?? 0))
      : enc.kind === 'merchant' ? T.wander.enc.merchantSub(banditWinChance(game, roster, enc.power ?? 0))
        : enc.kind === 'village' ? T.wander.enc.villageSub
          : enc.kind === 'shrine' ? T.wander.enc.shrineSub
            : enc.kind === 'rumor' && enc.rumorHeroId ? T.wander.enc.rumorSub : null
  // 소문·점괘로 알게 된 인물의 자리
  const lead = w.lead ?? null
  const leadHero = lead ? roster.byId.get(lead.heroId) ?? null : null

  const wide = useWide()
  const markers = useMemo<MapMarker[]>(() => {
    const list: MapMarker[] = [{ territory: w.loc, kind: 'party', avatar: lord.avatar, name: lord.name }]
    if (lead && lead.at !== w.loc) list.push({ territory: lead.at, kind: 'lead', name: leadHero?.name })
    return list
  }, [w.loc, lord.avatar, lord.name, lead, leadHero?.name])

  const travelTo = selected && neighbors.has(selected) ? selected : null
  const sea = travelTo ? isSeaRoute(w.loc, travelTo) : false

  const go = (to: TerritoryId) => {
    const next = wanderMove(game, roster, to)
    if (next === game) return
    sfx('deploy')
    setSelected(null)
    setGame(next)
  }
  const search = () => { sfx('click'); setGame(wanderSearch(game, roster)) }
  const resolve = (choice: WanderChoice) => {
    const next = wanderResolve(game, roster, choice)
    const res = next.wander?.encounter?.result
    if (res === 'joined') { sfx('confirm'); if (encHero && greet) voice(encHero, 'greeting', greet.variant) }
    else if (res === 'won') sfx('win')
    else if (res === 'lost' || res === 'refused') sfx('lose')
    else sfx('click')
    setGame(next)
  }
  const doRaise = () => {
    sfx('start')
    setConfirmRaise(false)
    setGame(wanderRaise(game, roster))
  }

  return (
    <div className="absolute inset-0 flex flex-col">
      <TopBar game={game} onMenu={onMenu} />
      <div className="relative min-h-0 flex-1">
        <WorldMap
          className="absolute inset-0"
          state={game}
          selected={selected ?? w.loc}
          onSelect={(id) => { sfx('pick'); setSelected(id) }}
          targets={neighbors}
          markers={markers}
          focus={w.loc}
          home={w.loc}
          inset={wide ? { left: 310 } : undefined}
          labelOf={(id) => names.territory(id)}
          ownerName={(owner) => (owner ? names.faction(owner) : T.neutral)}
        />

        {/* 왼쪽 — 일행 */}
        <Panel as="aside" className="absolute left-3 top-3 hidden w-[292px] md:block">
          <PanelTitle hanja="旅" title={T.wander.title} sub={T.wander.turns(w.turns)} />
          <div className="flex flex-col gap-3 p-3">
            <button type="button" onClick={() => openHero(lord.id)} className="flex items-center gap-3 border border-white/[0.07] p-2 text-left hover:border-[#d4af37]/50">
              <Portrait hero={lord} size={52} ring />
              <span className="min-w-0">
                <span className="flex items-center gap-1.5"><span className="truncate text-sm font-extrabold" style={{ color: INK.text }}>{lord.name}</span><GradeBadge grade={lord.grade} /></span>
                <ClassBadge cls={lord.cls} label={T.classes[lord.cls]} />
              </span>
            </button>
            <div>
              <p className="mb-1.5 text-[11px] font-bold" style={{ color: INK.gold }}>{T.wander.party} {w.party.length} / {WANDER.partyMax}</p>
              <div className="grid grid-cols-5 gap-1.5">
                {Array.from({ length: WANDER.partyMax }, (_, i) => {
                  const id = w.party[i]
                  const h = id ? roster.byId.get(id) : null
                  return h ? (
                    <div key={id} className="group relative">
                      <button type="button" onClick={() => openHero(h.id)} title={h.name} className="block">
                        <Portrait hero={h} size={48} ring />
                      </button>
                      <button
                        type="button"
                        onClick={() => setGame(wanderPart(game, h.id))}
                        title={T.wander.part}
                        aria-label={`${h.name} ${T.wander.part}`}
                        className="absolute -right-1 -top-1 hidden h-5 w-5 place-items-center rounded-full bg-black/80 text-[#a8a293] hover:text-[#ffd9cf] group-hover:grid"
                      >
                        <UserMinus size={11} />
                      </button>
                    </div>
                  ) : (
                    <div key={i} className="grid h-12 w-12 place-items-center border border-dashed text-[10px]" style={{ borderColor: 'rgba(236,230,214,0.12)', color: INK.mute }}>{T.wander.slot}</div>
                  )
                })}
              </div>
            </div>
            <div className="border-t pt-3" style={{ borderColor: INK.line }}>
              <p className="flex items-center gap-1.5 text-[11px] font-bold" style={{ color: INK.gold }}><MapPin size={12} />{T.wander.here}</p>
              <p className="mt-1 text-[15px] font-extrabold" style={{ color: INK.text }}>{names.territory(w.loc)}</p>
              <p className="text-[12px]" style={{ color: INK.sub }}>{here.owner ? names.faction(here.owner) : T.neutral} · {T.wander.locals(locals)}</p>
              {leadHero && lead && <p className="mt-1.5 text-[12px] font-semibold leading-snug" style={{ color: INK.goldBright }}>{T.wander.enc.lead(leadHero.name, names.territory(lead.at))}</p>}
            </div>
            <div className="flex flex-col gap-2">
              <GameButton onClick={search} className="w-full justify-start">
                <Search size={15} />{T.wander.search}<span className="ml-auto text-[11px] font-normal" style={{ color: INK.sub }}>{T.wander.searchSub}</span>
              </GameButton>
              <GameButton variant={raise.ok ? 'primary' : 'ghost'} disabled={!raise.ok} onClick={() => setConfirmRaise(true)} className="w-full justify-start">
                <Flag size={15} />{T.wander.raise}<span className="ml-auto text-[11px] font-normal">{raiseHint}</span>
              </GameButton>
            </div>
            <p className="text-[11px] leading-relaxed" style={{ color: INK.mute }}>{T.wander.moveHint}</p>
          </div>
        </Panel>

        {/* 떠날 곳 */}
        {travelTo && (
          <Panel className="absolute right-3 top-3 w-[260px] cheondo-rise">
            <div className="flex flex-col gap-2 p-4">
              <p className="text-[11px] font-bold" style={{ color: INK.gold }}>{REGIONS[TERRITORY_BY_ID[travelTo].region][locale]}</p>
              <p className="text-lg font-black" style={{ color: INK.text }}>{names.territory(travelTo)}</p>
              <p className="text-[12px]" style={{ color: INK.sub }}>{game.territories[travelTo].owner ? names.faction(game.territories[travelTo].owner!) : T.neutral}</p>
              {sea && <p className="flex items-center gap-1.5 text-[12px]" style={{ color: '#9cc3e6' }}><Anchor size={13} />{T.wander.seaFare(WANDER.seaFare)}</p>}
              <GameButton variant="primary" onClick={() => go(travelTo)} disabled={sea && w.gold < WANDER.seaFare} className="mt-1 w-full">
                <Footprints size={15} />{names.territory(travelTo)}
              </GameButton>
            </div>
          </Panel>
        )}

        {/* 만남 */}
        {showEncounter && enc && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center p-3 pb-5">
            <Panel className="pointer-events-auto w-full max-w-2xl cheondo-rise">
              {/* 좁은 화면은 얼굴·표지를 줄여 글 칸을 넓힌다 */}
              <div className="flex gap-3 p-3 md:gap-4 md:p-4">
                {encHero ? (
                  <button type="button" onClick={() => openHero(encHero.id)} className="shrink-0 self-start">
                    <Portrait hero={encHero} size={104} fluid className="h-16 w-16 md:h-[104px] md:w-[104px]" ring priority />
                  </button>
                ) : (
                  <span className="grid h-16 w-16 shrink-0 place-items-center self-start border text-2xl font-black md:h-[104px] md:w-[104px] md:text-4xl" style={{ borderColor: INK.line, color: INK.goldDim }} aria-hidden>
                    {ENC_HANJA[enc.kind]}
                  </span>
                )}
                <div className="flex min-w-0 flex-1 flex-col gap-2">
                  {encHero ? (
                    <>
                      <div className="flex flex-wrap items-center gap-2">
                        <GradeBadge grade={encHero.grade} />
                        <ClassBadge cls={encHero.cls} label={T.classes[encHero.cls]} />
                        <span className="text-[11px]" style={{ color: INK.mute }}>{flagEmoji(encHero.nat)} {TERRITORY_BY_ID[encHero.home][locale]}</span>
                      </div>
                      <p className="text-[16px] font-black" style={{ color: INK.text }}>{T.wander.enc.hero(encHero.name)}</p>
                      <p className="text-[12px]" style={{ color: INK.sub }}>{encHero.title}</p>
                      {greet && <p className="text-[13px] leading-relaxed" style={{ color: INK.text }}>「{greet.text}」</p>}
                    </>
                  ) : enc.kind === 'rumor' && enc.rumorHeroId ? (
                    <p className="text-[15px] font-bold" style={{ color: INK.text }}>{T.wander.enc.rumor(names.hero(enc.rumorHeroId), names.territory(enc.rumorAt ?? w.loc))}</p>
                  ) : (
                    <p className="text-[15px] font-bold" style={{ color: INK.text }}>{encounterTitle(locale, enc.kind) || T.wander.enc.quiet}</p>
                  )}
                  {/* 고르기 전에 무엇을 걸고 무엇을 얻는지 보여 준다 */}
                  {!enc.resolved && encSub && <p className="text-[12px] leading-snug" style={{ color: INK.sub }}>{encSub}</p>}
                  {enc.resolved ? (
                    <div className="mt-auto flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                      <p className="flex-1 text-[13px] font-semibold leading-snug" style={{ color: GOOD_RESULTS.has(enc.result ?? '') ? INK.jade : BAD_RESULTS.has(enc.result ?? '') ? '#ffb8a6' : INK.sub }}>
                        {resultText(T, enc, encHero?.name ?? '', names.territory, names.hero)}
                      </p>
                      <GameButton size="sm" onClick={() => setDismissed(game.turn)} className="self-end sm:self-auto">{T.wander.enc.ok}</GameButton>
                    </div>
                  ) : (
                    <div className="mt-auto flex flex-wrap gap-2">
                      {enc.kind === 'hero' && encHero && (
                        <>
                          <GameButton variant="primary" size="sm" disabled={w.party.length >= WANDER.partyMax} onClick={() => resolve('invite')}>
                            {w.party.length >= WANDER.partyMax ? T.wander.enc.full : T.wander.enc.invite(wanderRecruitChance(game, roster, encHero))}
                          </GameButton>
                          <GameButton size="sm" onClick={() => resolve('talk')}>{T.wander.enc.talk}</GameButton>
                          <GameButton size="sm" variant="quiet" onClick={() => resolve('leave')}>{T.wander.enc.leave}</GameButton>
                        </>
                      )}
                      {enc.kind === 'bandits' && (
                        <>
                          <GameButton variant="danger" size="sm" onClick={() => resolve('fight')}>{T.wander.enc.fight}</GameButton>
                          <GameButton size="sm" onClick={() => resolve('pay')}>{T.wander.enc.pay(Math.min(w.gold, enc.gold ?? 0))}</GameButton>
                          <GameButton size="sm" variant="quiet" onClick={() => resolve('flee')}>{T.wander.enc.flee}</GameButton>
                        </>
                      )}
                      {enc.kind === 'merchant' && (
                        <>
                          <GameButton variant="primary" size="sm" onClick={() => resolve('escort')}>{T.wander.enc.escort(enc.gold ?? 0)}</GameButton>
                          <GameButton size="sm" variant="quiet" onClick={() => resolve('decline')}>{T.wander.enc.decline}</GameButton>
                        </>
                      )}
                      {enc.kind === 'village' && (
                        <>
                          <GameButton variant="primary" size="sm" disabled={w.gold < WANDER.villageGold} onClick={() => resolve('help')}>{T.wander.enc.help}</GameButton>
                          <GameButton size="sm" variant="quiet" onClick={() => resolve('leave')}>{T.wander.enc.leave}</GameButton>
                        </>
                      )}
                      {enc.kind === 'shrine' && (
                        <>
                          <GameButton variant="primary" size="sm" disabled={w.gold < WANDER.shrineGold} onClick={() => resolve('divine')}>{T.wander.enc.divine}</GameButton>
                          <GameButton size="sm" onClick={() => resolve('rest')}>{T.wander.enc.rest}</GameButton>
                        </>
                      )}
                      {(enc.kind === 'rumor' || enc.kind === 'quiet') && <GameButton size="sm" onClick={() => resolve('ok')}>{T.wander.enc.ok}</GameButton>}
                    </div>
                  )}
                </div>
              </div>
            </Panel>
          </div>
        )}

        {/* 좁은 화면 — 넓은 화면 왼쪽 판의 요점(머무는 곳·일행·찾아갈 인물)과 조작을 한 판에 */}
        <div className="absolute inset-x-0 bottom-0 p-2 md:hidden" style={{ display: showEncounter ? 'none' : undefined }}>
          <Panel className="flex flex-col gap-2 p-2.5">
            <div className="flex items-center gap-2">
              <div className="min-w-0 flex-1">
                <p className="truncate text-[14px] font-extrabold" style={{ color: INK.text }}>
                  {names.territory(w.loc)}
                  <span className="ml-1.5 text-[11px] font-semibold" style={{ color: INK.sub }}>{here.owner ? names.faction(here.owner) : T.neutral}</span>
                </p>
                <p className="truncate text-[11px]" style={{ color: INK.sub }}>{T.wander.locals(locals)} · {T.wander.party} {w.party.length}/{WANDER.partyMax}</p>
              </div>
              <div className="flex shrink-0 -space-x-2">
                {[lord.id, ...w.party].map((id) => {
                  const h = roster.byId.get(id)
                  return h ? <button key={id} type="button" onClick={() => openHero(id)} aria-label={h.name}><Portrait hero={h} size={30} rounded="full" ring={id === lord.id} /></button> : null
                })}
              </div>
            </div>
            {leadHero && lead && <p className="text-[12px] font-semibold leading-snug" style={{ color: INK.goldBright }}>{T.wander.enc.lead(leadHero.name, names.territory(lead.at))}</p>}
            {!raise.ok && <p className="text-[11px] leading-snug" style={{ color: INK.mute }}>{raiseHint}</p>}
            <div className="flex gap-2">
              <GameButton onClick={search} className="flex-1"><Search size={15} />{T.wander.search}</GameButton>
              <GameButton variant={raise.ok ? 'primary' : 'ghost'} disabled={!raise.ok} onClick={() => setConfirmRaise(true)} className="flex-1"><Flag size={15} />{T.wander.raise}</GameButton>
            </div>
          </Panel>
        </div>
      </div>

      <Modal open={confirmRaise} onClose={() => setConfirmRaise(false)} width={440}>
        <PanelTitle hanja="旗" title={T.wander.raise} />
        <div className="flex flex-col gap-4 p-5">
          <p className="text-sm leading-relaxed" style={{ color: INK.text }}>
            {raise.code === 'uprising' && here.owner
              ? T.wander.uprisingConfirm(names.territory(w.loc), names.faction(here.owner))
              : T.wander.raiseConfirm(names.territory(w.loc))}
          </p>
          <div className="flex justify-end gap-2">
            <GameButton variant="quiet" onClick={() => setConfirmRaise(false)}>{T.cancel}</GameButton>
            <GameButton variant="primary" onClick={doRaise}><Flag size={15} />{T.wander.raise}</GameButton>
          </div>
        </div>
      </Modal>
    </div>
  )
}

const ENC_HANJA: Record<string, string> = { bandits: '賊', merchant: '商', village: '村', shrine: '祠', rumor: '聞', quiet: '靜', hero: '人' }

function resultText(T: ReturnType<typeof useCheondo>['T'], enc: Encounter, name: string, place: (id: TerritoryId) => string, heroName: (id: string) => string): string {
  const e = T.wander.enc
  const gold = enc.gold ?? 0
  switch (enc.result) {
    case 'joined': return e.joined(name)
    case 'refused': return e.refused
    case 'talked': return e.talked
    case 'won': return e.won(gold)
    case 'lost': return e.lost(enc.loss ?? 0)
    case 'paid': return e.paid
    case 'fled': return e.fled
    case 'helped': return enc.kind === 'village' ? e.villageDone : e.helped
    case 'defended': return e.defended(gold)
    case 'robbed': return e.robbed(enc.loss ?? 0)
    case 'rested': return e.rested
    case 'foretold': return enc.rumorHeroId && enc.rumorAt ? e.foretold(heroName(enc.rumorHeroId), place(enc.rumorAt)) : e.rested
    default: return e.ignored
  }
}

const GOOD_RESULTS = new Set(['joined', 'won', 'defended', 'helped', 'foretold'])
const BAD_RESULTS = new Set(['lost', 'robbed', 'refused'])
