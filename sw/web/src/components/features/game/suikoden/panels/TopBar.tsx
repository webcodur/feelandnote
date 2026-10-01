/*
  천도 v2 — 윗줄: 세력 도장, 날짜, 자원, 메뉴 단추. 고전 전략게임의 상단 정보줄을 얇게.
*/
'use client'

import type { ReactNode } from 'react'
import { Coins, Flag, Menu, ScrollText, Star, Users, Wheat, Handshake, BookOpen } from 'lucide-react'
import { calendarOf } from '@/lib/game/suikoden/constants'
import { fameRank, membersOf, territoriesOf, turnLimit } from '@/lib/game/suikoden/query'
import type { FoodOutlook } from '@/lib/game/suikoden/economy'
import type { GameState } from '@/lib/game/suikoden/types'
import { useCheondo } from '../context'
import { num } from '../i18n'
import { Kbd, MusicSlot, Seal } from '../ui/Frame'
import { INK } from '../ui/theme'

interface TopBarProps {
  game: GameState
  onRoster?: () => void
  onDiplomacy?: () => void
  onChronicle?: () => void
  onMenu: () => void
  netGold?: number
  netFood?: number
  /** 한 해 평균으로 본 군량 형편 — 금으로 사들여 버티는지, 병사가 흩어지기까지 몇 달인지 */
  food?: FoodOutlook | null
}

function Resource({ icon, label, value, delta, title, className }: { icon: ReactNode; label: string; value: string; delta?: number; title?: string; className?: string }) {
  return (
    <div className={`flex shrink-0 items-center gap-1 px-1 sm:gap-1.5 sm:px-2 ${className ?? ''}`} title={title ?? label}>
      <span style={{ color: INK.gold }} aria-hidden>{icon}</span>
      <span className="sr-only">{label}</span>
      {/* 휴대폰은 폭이 모자라 이달 증감을 값 아래 둘째 줄로 내린다 */}
      <span className="flex flex-col leading-none sm:flex-row sm:items-baseline sm:gap-1.5">
        <span className="text-[13px] font-bold tabular-nums" style={{ color: INK.text }}>{value}</span>
        {delta !== undefined && delta !== 0 && (
          <span className="text-[10px] font-bold tabular-nums max-sm:mt-0.5" style={{ color: delta > 0 ? INK.jade : INK.sealBright }}>{delta > 0 ? '+' : ''}{delta}</span>
        )}
      </span>
    </div>
  )
}

function BarButton({ icon, label, hotkey, onClick }: { icon: ReactNode; label: string; hotkey?: string; onClick?: () => void }) {
  if (!onClick) return null
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-9 items-center gap-1.5 border border-transparent px-2 text-[12px] font-semibold text-[#a8a293] hover:border-[#d4af37]/40 hover:bg-white/[0.04] hover:text-[#f3d57a] sm:px-2.5"
      title={hotkey ? `${label} (${hotkey})` : label}
    >
      {icon}
      <span className="hidden lg:inline">{label}</span>
      {hotkey && <span className="hidden xl:inline"><Kbd>{hotkey}</Kbd></span>}
    </button>
  )
}

export default function TopBar({ game, onRoster, onDiplomacy, onChronicle, onMenu, netGold, netFood, food }: TopBarProps) {
  const { T, roster, locale } = useCheondo()
  const lord = roster.byId.get(game.lordId)
  const { year, month, season } = calendarOf(game.turn)
  const f = game.playerFaction ? game.factions[game.playerFaction] : null
  const left = turnLimit(game) - game.turn
  const lands = f ? territoriesOf(game, f.id).length : 0
  const members = f ? membersOf(game, f.id).length : (game.wander?.party.length ?? 0) + 1
  const fame = f ? f.fame : game.wander?.fame ?? 0
  const gold = f ? f.gold : game.wander?.gold ?? 0
  return (
    <header className="relative z-10 flex h-12 shrink-0 items-center gap-2 border-b px-2 sm:px-3" style={{ borderColor: INK.line, background: 'linear-gradient(180deg, rgba(10,11,14,0.97), rgba(10,11,14,0.88))' }}>
      <div className="flex min-w-0 shrink-0 items-center gap-2">
        {/* 아주 좁은 휴대폰(380px 미만)은 도장까지 접어 자원과 단추를 한 줄에 지킨다 */}
        <Seal color={f?.color ?? INK.goldDim} text={lord?.name ?? '?'} size={28} className="max-[380px]:hidden" />
        {/* 좁은 화면에서는 도장만 두고 자원 칸에 자리를 내준다 */}
        <div className="hidden min-w-0 leading-tight sm:block">
          <p className="truncate text-[13px] font-extrabold" style={{ color: INK.text }}>{f ? T.faction(lord?.name ?? '') : `${lord?.name ?? ''} · ${T.hud.wander}`}</p>
          <p className="truncate text-[10px] font-semibold" style={{ color: INK.gold }}>{T.fameRanks[fameRank(fame)]}</p>
        </div>
      </div>
      <div className="mx-1 hidden h-6 w-px bg-white/10 sm:block" />
      {/* 방랑 중에는 휴대폰 자원 칸이 비어 날짜를 윗줄에 둔다(세력을 세우면 휴대폰 날짜는 달 넘기기 단추로 간다) */}
      <div className={`${f ? 'hidden sm:flex' : 'flex min-w-0'} items-baseline gap-2`}>
        <span className="shrink-0 text-[13px] font-bold" style={{ color: INK.text }}>{T.date(year, month)}</span>
        <span className="shrink-0 text-[11px] font-semibold max-sm:hidden" style={{ color: INK.sub }}>{T.seasons[season]}</span>
        <span className="truncate text-[10px]" style={{ color: INK.mute }}>{T.hud.limit(left)}</span>
      </div>
      {/* 군량 경고까지 붙어 폭이 모자라면 자원 칸만 옆으로 밀어 보고, 오른쪽 단추 줄은 제자리를 지킨다.
          세력을 세운 뒤 태블릿(1024px 미만)은 금·군량·경고만 — 명성·무장·영토까지 두면 768px에서 숫자가 잘렸다 */}
      <div className="ml-auto flex min-w-0 items-center overflow-x-auto">

        <Resource icon={<Coins size={14} />} label={T.hud.gold} value={num(locale, gold)} delta={netGold} />
        {f && <Resource icon={<Wheat size={14} />} label={T.hud.food} value={num(locale, f.food)} delta={netFood} />}
        {/* 태블릿 이하(1024px 미만)는 짧은 꼴(「3달치」「매입 38」)로 — 긴 설명은 넓은 화면과 title에. 768px에서 긴 꼴이 잘렸다 */}
        {f && food?.kind === 'danger' && food.months <= 6 && (
          <span
            role="status"
            title={T.hud.foodWarn}
            className="mr-1 shrink-0 whitespace-nowrap border px-1.5 py-0.5 text-[10px] font-bold"
            style={{ borderColor: 'rgba(200,69,45,0.7)', background: 'rgba(200,69,45,0.18)', color: '#ffd9cf' }}
          >
            <span className="max-lg:hidden">{T.hud.foodLeft(food.months)}</span>
            <span className="lg:hidden">{T.hud.foodLeftShort(food.months)}</span>
          </span>
        )}
        {f && food?.kind === 'buying' && (
          <span
            title={T.hud.foodBuyingWarn}
            className="mr-1 shrink-0 whitespace-nowrap border px-1.5 py-0.5 text-[10px] font-bold"
            style={{ borderColor: 'rgba(212,175,55,0.55)', background: 'rgba(212,175,55,0.12)', color: INK.goldBright }}
          >
            <span className="max-lg:hidden">{T.hud.foodBuying(num(locale, food.goldPerMonth))}</span>
            <span className="lg:hidden">{T.hud.foodBuyingShort(num(locale, food.goldPerMonth))}</span>
          </span>
        )}
        <Resource icon={<Star size={14} />} label={T.hud.fame} value={num(locale, fame)} className={f ? 'max-lg:hidden' : 'max-sm:hidden'} />
        <Resource icon={<Users size={14} />} label={T.hud.officers} value={num(locale, members)} className={f ? 'max-lg:hidden' : 'max-md:hidden'} />
        {f && <Resource icon={<Flag size={14} />} label={T.hud.lands} value={num(locale, lands)} className="max-lg:hidden" />}
      </div>
      <div className="mx-1 hidden h-6 w-px bg-white/10 md:block" />
      <nav className="flex shrink-0 items-center">
        <BarButton icon={<BookOpen size={15} />} label={T.hud.roster} hotkey="R" onClick={onRoster} />
        <BarButton icon={<Handshake size={15} />} label={T.hud.diplomacy} hotkey="D" onClick={onDiplomacy} />
        <BarButton icon={<ScrollText size={15} />} label={T.hud.chronicle} hotkey="L" onClick={onChronicle} />
        <MusicSlot className="w-8 sm:w-9" />
        <BarButton icon={<Menu size={15} />} label={T.menu} hotkey="Esc" onClick={onMenu} />
      </nav>
    </header>
  )
}
