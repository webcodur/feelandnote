/*
  천도 v2 — 인물 두루마리. 어느 화면에서든 인물을 누르면 열린다.
*/
'use client'

import { ExternalLink, Volume2 } from 'lucide-react'
import { CLASSES, DISPOSITION_KEYS, GRADE_INFO, VIRTUE_KEYS } from '@/lib/game/suikoden/constants'
import { flagEmoji, TERRITORY_BY_ID } from '@/lib/game/suikoden/map'
import { heroMaxTroops, heroStateOf } from '@/lib/game/suikoden/query'
import { maxTroopsOf } from '@/lib/game/suikoden/roster'
import { starLabel } from '@/lib/game/suikoden/stars'
import type { GameState } from '@/lib/game/suikoden/types'
import { makeNames, useCheondo } from '../context'
import { pickLine, quoteOf, useLines } from '../hooks/useCheondoData'
import { formatYear, num } from '../i18n'
import { GameButton, Meter } from '../ui/Frame'
import { AbilityRadar, ClassBadge, DispositionRow, GradeBadge, Portrait, StatRow } from '../ui/HeroBits'
import { Modal } from '../ui/Overlay'
import { INK } from '../ui/theme'

export default function HeroSheet({ heroId, game, onClose }: { heroId: string | null; game: GameState | null; onClose: () => void }) {
  const { roster, T, locale, voice } = useCheondo()
  const hero = heroId ? roster.byId.get(heroId) ?? null : null
  const lines = useLines([heroId])
  if (!hero) return <Modal open={false} onClose={onClose}>{null}</Modal>
  const l = lines[hero.id]
  const quote = quoteOf(l)
  const greet = pickLine(l, 'greeting', hero.id.charCodeAt(0))
  const s = hero.stats
  const hs = game ? heroStateOf(game, hero) : null
  const names = makeNames(roster, locale, T, game)
  const star = hs?.star !== null && hs?.star !== undefined ? starLabel(hs.star, locale) : null
  const cls = CLASSES[hero.cls]
  const profileHref = `${locale === 'en' ? '/en' : ''}/celeb/${hero.id}`
  return (
    <Modal open={!!hero} onClose={onClose} width={760} label={hero.name}>
      {/* 휴대폰은 이름·등급을 첫 화면에 — 작은 얼굴 옆 머리글 → 말 → 수치 차례. 넓은 화면은 왼쪽(얼굴·말)·오른쪽(머리글·수치) 두 단 */}
      <div className="grid min-h-0 max-h-[var(--modal-max-height)] grid-cols-1 overflow-y-auto md:grid-cols-[260px_1fr] md:grid-rows-[auto_1fr]">
        {/* 머리글 — 등급·병과·이름·직함·고향 */}
        <div className="flex gap-3 p-4 pr-10 max-md:border-b md:col-start-2 md:row-start-1 md:p-5 md:pb-0" style={{ borderColor: INK.line, background: `linear-gradient(180deg, ${cls.color}14, transparent 70%)` }}>
          <Portrait hero={hero} size={88} ring priority className="md:hidden" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <GradeBadge grade={hero.grade} />
              <ClassBadge cls={hero.cls} label={T.classes[hero.cls]} />
              <span className="text-[11px]" style={{ color: INK.mute }}>{T.sheet.reality[hero.reality]}</span>
            </div>
            <h3 className="mt-1 text-xl font-black leading-tight md:text-2xl" style={{ color: INK.text }}>{hero.name}</h3>
            <p className="text-[13px] leading-snug" style={{ color: INK.sub }}>{hero.title}</p>
            <p className="mt-1 text-[12px]" style={{ color: INK.sub }}>
              {flagEmoji(hero.nat)} {T.sheet.home} {TERRITORY_BY_ID[hero.home][locale]} · {formatYear(locale, hero.birth)}{hero.death !== null ? ` – ${formatYear(locale, hero.death)}` : ` · ${T.sheet.alive}`}
            </p>
            {star && (
              <p className="mt-1 text-[12px] font-black md:hidden" style={{ color: INK.goldBright }}>{star.text}</p>
            )}
          </div>
        </div>
        {/* 왼쪽 — 얼굴과 말 */}
        <div className="flex flex-col gap-3 border-b p-4 md:col-start-1 md:row-span-2 md:row-start-1 md:border-b-0 md:border-r md:p-5" style={{ borderColor: INK.line, background: `linear-gradient(180deg, ${cls.color}1a, transparent 60%)` }}>
          <Portrait hero={hero} size={220} ring priority className="mx-auto max-md:hidden" />
          {star && (
            <p className="text-center text-[13px] font-black max-md:hidden" style={{ color: INK.goldBright }}>{star.text}</p>
          )}
          {greet && <p className="text-[13px] leading-relaxed" style={{ color: INK.text }}>「{greet.text}」</p>}
          {quote && (
            <figure className="border-l-2 pl-3" style={{ borderColor: INK.gold }}>
              <figcaption className="mb-1 text-[10px] font-bold" style={{ color: INK.gold }}>{T.sheet.quote}</figcaption>
              <blockquote className="text-[12px] leading-relaxed" style={{ color: INK.sub }}>{quote}</blockquote>
            </figure>
          )}
          <div className="mt-auto flex flex-wrap gap-2">
            {hero.voiceV > 0 && greet && (
              <GameButton size="sm" onClick={() => voice(hero, 'greeting', greet.variant)}><Volume2 size={14} />{T.sheet.voice}</GameButton>
            )}
            <a
              href={profileHref}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-8 items-center gap-1.5 border border-[#d4af37]/30 px-3 text-xs font-semibold text-[#ece6d6] hover:border-[#d4af37]/80 hover:text-[#f3d57a]"
            >
              <ExternalLink size={13} />{T.sheet.profile}
            </a>
          </div>
        </div>
        {/* 오른쪽 — 수치 */}
        <div className="flex flex-col gap-4 p-4 md:col-start-2 md:row-start-2 md:p-5">
          <div className="grid grid-cols-1 items-center gap-4 sm:grid-cols-[248px_1fr]">
            <AbilityRadar stats={{ command: s.command, martial: s.martial, intellect: s.intellect, charm: s.charm }} labels={T.abilities} size={180} color={cls.color} />
            <div className="flex flex-col gap-1.5">
              <p className="text-[11px] font-bold" style={{ color: INK.gold }}>{T.sheet.virtues}</p>
              {VIRTUE_KEYS.map((k) => <StatRow key={k} label={T.virtues[k]} value={s[k]} color="rgba(243,213,122,0.7)" labelWidth={locale === 'en' ? '4.75rem' : '2.5rem'} />)}
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <p className="text-[11px] font-bold" style={{ color: INK.gold }}>{T.sheet.dispositions}</p>
            {DISPOSITION_KEYS.map((k) => <DispositionRow key={k} left={T.dispositions[k][0]} right={T.dispositions[k][1]} value={s[k]} labelWidth={locale === 'en' ? '5rem' : '3rem'} />)}
          </div>
          <div className="grid grid-cols-2 gap-2 text-[12px] sm:grid-cols-4">
            <Fact label={T.sheet.skill} value={T.battle.skills[cls.skills[0]]} />
            <Fact label={T.sheet.row} value={cls.row === 0 ? T.battle.front : T.battle.back} />
            <Fact label={T.sheet.maxTroops} value={num(locale, hs && game ? heroMaxTroops(hero, hs, game) : maxTroopsOf(hero))} />
            <Fact label={T.sheet.salary} value={`${GRADE_INFO[hero.grade].salary}`} />
          </div>
          {hs && hs.status !== 'free' && game && (
            <div className="flex flex-col gap-2 border p-3" style={{ borderColor: INK.line }}>
              <p className="text-[11px] font-bold" style={{ color: INK.gold }}>{T.sheet.record}</p>
              <div className="grid grid-cols-2 gap-2 text-[12px] sm:grid-cols-3">
                <Fact label={T.sheet.faction} value={hs.faction ? names.faction(hs.faction) : T.officer.status[hs.status]} />
                <Fact label={T.sheet.location} value={names.territory(hs.loc)} />
                <Fact label={T.officer.level} value={`Lv ${hs.level}`} />
              </div>
              <Bar label={T.officer.troops} value={hs.troops} max={heroMaxTroops(hero, hs, game)} color={INK.jade} locale={locale} />
              <Bar label={T.officer.loyalty} value={hs.loyalty} max={100} color={INK.gold} locale={locale} />
              <Bar label={T.officer.training} value={hs.training} max={100} color="#6fa8dc" locale={locale} />
              {hs.wound > 0 && <Bar label={T.officer.wound} value={hs.wound} max={100} color={INK.seal} locale={locale} />}
            </div>
          )}
          {hero.derived && <p className="text-[11px]" style={{ color: INK.mute }}>※ {T.select.derived}</p>}
        </div>
      </div>
    </Modal>
  )
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="border px-2 py-1.5" style={{ borderColor: INK.line }}>
      <div className="text-[10px]" style={{ color: INK.mute }}>{label}</div>
      <div className="truncate font-bold" style={{ color: INK.text }}>{value}</div>
    </div>
  )
}

function Bar({ label, value, max, color, locale }: { label: string; value: number; max: number; color: string; locale: 'ko' | 'en' }) {
  return (
    <div className="flex items-center gap-2 text-[11px]">
      <span className="w-10 shrink-0" style={{ color: INK.sub }}>{label}</span>
      <Meter value={value} max={max} color={color} className="flex-1" />
      <span className="w-20 shrink-0 text-right font-semibold tabular-nums" style={{ color: INK.text }}>{num(locale, value)} / {num(locale, max)}</span>
    </div>
  )
}
