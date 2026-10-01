/*
  천도 v2 — 주군 고르기. 공개 인물 전원이 후보다. 찾기·거르기·정렬, 오른쪽에 자세히.
*/
'use client'

import { useDeferredValue, useMemo, useState } from 'react'
import { ArrowLeft, Dices, Search } from 'lucide-react'
import { DIFFICULTY, GRADES, START, VIRTUE_KEYS, DISPOSITION_KEYS, CLASSES } from '@/lib/game/suikoden/constants'
import { flagEmoji, REGIONS, TERRITORY_BY_ID, type RegionId } from '@/lib/game/suikoden/map'
import { lordScore, maxTroopsOf } from '@/lib/game/suikoden/roster'
import type { Difficulty, Grade, Hero, HeroClass } from '@/lib/game/suikoden/types'
import { useCheondo } from '../context'
import { eraOf, formatYear, num } from '../i18n'
import { Chip, GameButton, MusicSlot, Panel } from '../ui/Frame'
import { AbilityRadar, ClassBadge, DispositionRow, GradeBadge, Portrait, StatRow } from '../ui/HeroBits'
import { INK } from '../ui/theme'
import { VirtualGrid } from '../ui/VirtualGrid'

type Era = ReturnType<typeof eraOf>
type SortKey = 'grade' | 'renown' | 'name'

interface LordSelectProps {
  onBack: () => void
  onStart: (lordId: string, difficulty: Difficulty) => void
}

const CLASS_ORDER: HeroClass[] = ['general', 'strategist', 'official', 'saint', 'artist', 'artisan', 'ranger']
const ERA_ORDER: Era[] = ['ancient', 'medieval', 'early', 'modern', 'contemporary']
const REGION_ORDER = Object.keys(REGIONS) as RegionId[]

export default function LordSelect({ onBack, onStart }: LordSelectProps) {
  const { roster, T, locale, sfx } = useCheondo()
  const [query, setQuery] = useState('')
  const deferredQuery = useDeferredValue(query)
  const [grade, setGrade] = useState<Grade | null>(null)
  const [cls, setCls] = useState<HeroClass | null>(null)
  const [region, setRegion] = useState<RegionId | null>(null)
  const [era, setEra] = useState<Era | null>(null)
  const [reality, setReality] = useState<'real' | 'fiction' | null>(null)
  const [sort, setSort] = useState<SortKey>('grade')
  const [difficulty, setDifficulty] = useState<Difficulty>('normal')
  const [pickedId, setPickedId] = useState<string | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)

  const featured = useMemo(() => roster.heroes
    .filter((h) => h.grade === 'SS' || h.grade === 'S')
    .sort((a, b) => (lordScore(b) + b.renown * 30) - (lordScore(a) + a.renown * 30))
    .slice(0, 14), [roster])

  const list = useMemo(() => {
    const q = deferredQuery.trim().toLowerCase()
    const filtered = roster.heroes.filter((h) => {
      if (grade && h.grade !== grade) return false
      if (cls && h.cls !== cls) return false
      if (region && TERRITORY_BY_ID[h.home].region !== region) return false
      if (era && eraOf(h.birth) !== era) return false
      if (reality === 'real' && h.reality === 'fiction') return false
      if (reality === 'fiction' && h.reality === 'real') return false
      if (q && !h.name.toLowerCase().includes(q) && !h.title.toLowerCase().includes(q)) return false
      return true
    })
    const collator = new Intl.Collator(locale === 'en' ? 'en' : 'ko')
    filtered.sort((a, b) => {
      if (sort === 'name') return collator.compare(a.name, b.name)
      if (sort === 'renown') return b.renown - a.renown || b.score - a.score
      return b.score - a.score || b.renown - a.renown
    })
    return filtered
  }, [roster, deferredQuery, grade, cls, region, era, reality, sort, locale])

  const picked = pickedId ? roster.byId.get(pickedId) ?? null : null
  const asideHero = picked ?? featured[0] ?? null
  const pick = (id: string) => { sfx('pick'); setPickedId(id); setSheetOpen(true) }
  const randomPick = () => {
    const pool = list.length > 0 ? list : roster.heroes
    pick(pool[Math.floor(Math.random() * pool.length)].id)
  }
  const resetKey = [deferredQuery, grade, cls, region, era, reality, sort].join('|')

  return (
    <div className="absolute inset-0 flex flex-col" style={{ background: `radial-gradient(ellipse at 20% 0%, #1a1712 0%, ${INK.bg} 55%)` }}>
      {/* 머리 */}
      {/* 휴대폰은 한 줄에 뒤로·제목·난이도·음악 단추를 다 세우려고 뒤로는 화살표만, 난이도 단추는 좁게 둔다 */}
      <header className="flex shrink-0 flex-wrap items-center gap-2 border-b px-3 py-3 sm:gap-3 sm:px-6" style={{ borderColor: INK.line }}>
        <GameButton variant="quiet" size="sm" onClick={onBack} aria-label={T.back} className="max-sm:px-2"><ArrowLeft size={16} /><span className="max-sm:hidden">{T.back}</span></GameButton>
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-black tracking-tight sm:text-xl" style={{ color: INK.text }}>{T.select.title}</h2>
          {/* 휴대폰은 폭이 좁아 한 줄로 자르면 뜻이 끊긴다 — 두 줄까지 둔다 */}
          <p className="line-clamp-2 text-[12px] leading-snug sm:line-clamp-1" style={{ color: INK.sub }}>{T.select.subtitle(num(locale, roster.heroes.length))}</p>
        </div>
        <div className="flex items-center gap-1" role="radiogroup" aria-label={T.select.difficulty}>
          {(Object.keys(DIFFICULTY) as Difficulty[]).map((d) => (
            <button
              key={d}
              type="button"
              role="radio"
              aria-checked={difficulty === d}
              onClick={() => setDifficulty(d)}
              title={T.select.diffDesc(DIFFICULTY[d].aiFactions, DIFFICULTY[d].limitYears)}
              className={`h-8 border px-2 text-xs font-bold sm:px-3 ${difficulty === d ? 'border-[#d4af37] bg-[#d4af37] text-[#14110a]' : 'border-white/10 text-[#a8a293] hover:border-[#d4af37]/60 hover:text-[#ece6d6]'}`}
            >
              {T.difficulty[d]}
            </button>
          ))}
          <span className="ml-2 hidden text-[11px] md:inline" style={{ color: INK.mute }}>{T.select.diffDesc(DIFFICULTY[difficulty].aiFactions, DIFFICULTY[difficulty].limitYears)}</span>
        </div>
        <MusicSlot className="w-8 sm:w-9" />
      </header>

      <div className="flex min-h-0 flex-1">
        {/* 목록 */}
        <div className="flex min-w-0 flex-1 flex-col gap-3 px-4 py-3 sm:px-6">
          {/* 이름난 주군 */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1" aria-label={T.select.featured}>
            <span className="shrink-0 text-[11px] font-bold" style={{ color: INK.gold }}>{T.select.featured}</span>
            {featured.map((h, i) => (
              <button
                key={h.id}
                type="button"
                onClick={() => pick(h.id)}
                title={h.name}
                // 넓은 화면은 아무도 고르지 않았을 때 첫 사람을 펼쳐 두므로 그 사람을 표시해 둔다
                className={`shrink-0 rounded-full p-0.5 ${pickedId === h.id ? 'bg-[#f3d57a]' : !pickedId && i === 0 ? 'bg-white/10 hover:bg-[#d4af37]/70 xl:bg-[#f3d57a]' : 'bg-white/10 hover:bg-[#d4af37]/70'}`}
              >
                <Portrait hero={h} size={34} rounded="full" />
              </button>
            ))}
          </div>

          {/* 거르기 */}
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex h-9 min-w-[200px] flex-1 items-center gap-2 border px-3 sm:max-w-xs" style={{ borderColor: INK.line, background: 'rgba(255,255,255,0.03)' }}>
              <Search size={14} style={{ color: INK.sub }} aria-hidden />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={T.select.search}
                aria-label={T.select.search}
                className="h-full min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-[#6f6a60]"
                style={{ color: INK.text }}
              />
            </label>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              aria-label={T.select.sort}
              className="h-9 border bg-[#0f1116] px-2 text-xs font-semibold outline-none"
              style={{ borderColor: INK.line, color: INK.text }}
            >
              <option value="grade">{T.select.sortGrade}</option>
              <option value="renown">{T.select.sortRenown}</option>
              <option value="name">{T.select.sortName}</option>
            </select>
            <GameButton size="sm" onClick={randomPick}><Dices size={14} />{T.select.random}</GameButton>
            <span className="ml-auto text-[12px] font-semibold tabular-nums" style={{ color: INK.sub }}>{T.select.count(num(locale, list.length))}</span>
          </div>
          <div className="flex flex-col gap-1.5">
            <FilterRow label={T.select.grade}>
              <Chip active={!grade} onClick={() => setGrade(null)}>{T.select.all}</Chip>
              {GRADES.map((g) => <Chip key={g} active={grade === g} onClick={() => setGrade(grade === g ? null : g)}>{g}</Chip>)}
            </FilterRow>
            <FilterRow label={T.select.cls}>
              <Chip active={!cls} onClick={() => setCls(null)}>{T.select.all}</Chip>
              {CLASS_ORDER.map((c) => (
                <Chip key={c} active={cls === c} onClick={() => setCls(cls === c ? null : c)}>
                  <span style={{ color: CLASSES[c].color }}>{CLASSES[c].hanja}</span>{T.classes[c]}
                </Chip>
              ))}
            </FilterRow>
            <FilterRow label={T.select.region}>
              <Chip active={!region} onClick={() => setRegion(null)}>{T.select.all}</Chip>
              {REGION_ORDER.map((r) => <Chip key={r} active={region === r} onClick={() => setRegion(region === r ? null : r)}>{REGIONS[r][locale]}</Chip>)}
            </FilterRow>
            <FilterRow label={T.select.era}>
              <Chip active={!era} onClick={() => setEra(null)}>{T.select.all}</Chip>
              {ERA_ORDER.map((e) => <Chip key={e} active={era === e} onClick={() => setEra(era === e ? null : e)}>{T.eras[e]}</Chip>)}
              <span className="mx-1 h-4 w-px bg-white/10" aria-hidden />
              <Chip active={reality === 'real'} onClick={() => setReality(reality === 'real' ? null : 'real')}>{T.select.real}</Chip>
              <Chip active={reality === 'fiction'} onClick={() => setReality(reality === 'fiction' ? null : 'fiction')}>{T.select.fiction}</Chip>
            </FilterRow>
          </div>

          {list.length === 0 ? (
            <div className="grid flex-1 place-items-center text-sm" style={{ color: INK.sub }}>{T.select.empty}</div>
          ) : (
            <VirtualGrid
              className="min-h-0 flex-1 pr-1"
              items={list}
              minWidth={232}
              rowHeight={78}
              gap={8}
              resetKey={resetKey}
              getKey={(h) => h.id}
              render={(h) => <HeroCard hero={h} active={h.id === pickedId} onPick={() => pick(h.id)} />}
            />
          )}
        </div>

        {/* 자세히 — 넓은 화면. 아직 고르지 않았으면 이름난 주군 첫 사람을 펼쳐 두어 빈 판으로 두지 않는다 */}
        <aside className="hidden w-[380px] shrink-0 border-l xl:block" style={{ borderColor: INK.line }}>
          {asideHero ? <LordDetail hero={asideHero} difficulty={difficulty} onStart={() => onStart(asideHero.id, difficulty)} /> : <EmptyDetail />}
        </aside>
      </div>

      {/* 자세히 — 좁은 화면은 아래 서랍 */}
      {picked && (
        <div
          className="absolute inset-x-0 bottom-0 z-20 max-h-[82dvh] overflow-y-auto border-t xl:hidden"
          style={{
            borderColor: INK.lineStrong, background: INK.panelSolid,
            transform: sheetOpen ? 'translateY(0)' : 'translateY(calc(100% - 64px))',
            transition: 'transform 260ms cubic-bezier(.2,.9,.3,1)',
          }}
        >
          <button type="button" onClick={() => setSheetOpen((v) => !v)} className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-white/[0.04]">
            <Portrait hero={picked} size={36} ring />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-bold" style={{ color: INK.text }}>{picked.name}</span>
              <span className="block truncate text-[11px]" style={{ color: INK.sub }}>{T.select.picked}</span>
            </span>
            <span className="h-1 w-10 rounded-full bg-white/25" aria-hidden />
          </button>
          <LordDetail hero={picked} difficulty={difficulty} onStart={() => onStart(picked.id, difficulty)} compact />
        </div>
      )}
    </div>
  )
}

function FilterRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
      <span className="w-9 shrink-0 text-[11px] font-bold" style={{ color: INK.mute }}>{label}</span>
      {children}
    </div>
  )
}

function HeroCard({ hero, active, onPick }: { hero: Hero; active: boolean; onPick: () => void }) {
  const { T, locale } = useCheondo()
  const flag = flagEmoji(hero.nat)
  return (
    <button
      type="button"
      onClick={onPick}
      aria-pressed={active}
      className={`flex h-full w-full items-center gap-3 border px-2.5 text-left ${active ? 'border-[#f3d57a] bg-[#d4af37]/[0.14]' : 'border-white/[0.07] bg-white/[0.025] hover:border-[#d4af37]/55 hover:bg-white/[0.05]'}`}
    >
      <Portrait hero={hero} size={56} ring={active} />
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5">
          <span className={`truncate text-[14px] font-extrabold ${active ? 'text-[#f3d57a]' : 'text-[#ece6d6]'}`}>{hero.name}</span>
          <GradeBadge grade={hero.grade} />
        </span>
        <span className="block truncate text-[11px]" style={{ color: INK.sub }}>{hero.title || '\u00a0'}</span>
        <span className="mt-0.5 flex items-center gap-1.5 text-[11px]" style={{ color: INK.mute }}>
          <ClassBadge cls={hero.cls} label={T.classes[hero.cls]} />
          <span aria-hidden>·</span>
          <span className="truncate">{flag} {TERRITORY_BY_ID[hero.home][locale]}</span>
        </span>
      </span>
    </button>
  )
}

function EmptyDetail() {
  const { T } = useCheondo()
  return (
    <div className="grid h-full place-items-center p-8 text-center text-sm" style={{ color: INK.sub }}>
      <div>
        <div className="mx-auto mb-3 grid h-16 w-16 place-items-center border text-3xl font-black" style={{ borderColor: INK.line, color: INK.goldDim }} aria-hidden>主</div>
        {T.select.title}
      </div>
    </div>
  )
}

function LordDetail({ hero, difficulty, onStart, compact }: { hero: Hero; difficulty: Difficulty; onStart: () => void; compact?: boolean }) {
  const { T, locale, roster } = useCheondo()
  const home = TERRITORY_BY_ID[hero.home]
  const natives = (roster.byHome.get(hero.home)?.length ?? 1) - 1
  const s = hero.stats
  return (
    <div className={`flex flex-col gap-4 ${compact ? 'px-4' : 'h-full overflow-y-auto p-5'}`}>
      <div className="flex gap-4">
        <Portrait hero={hero} size={compact ? 104 : 132} ring priority />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <GradeBadge grade={hero.grade} />
            <ClassBadge cls={hero.cls} label={T.classes[hero.cls]} />
          </div>
          <h3 className="mt-1.5 text-xl font-black leading-tight" style={{ color: INK.text }}>{hero.name}</h3>
          <p className="mt-0.5 text-[12px] leading-snug" style={{ color: INK.sub }}>{hero.title}</p>
          <p className="mt-2 text-[12px]" style={{ color: INK.sub }}>
            {flagEmoji(hero.nat)} {formatYear(locale, hero.birth)}{hero.death !== null ? ` – ${formatYear(locale, hero.death)}` : ''}
          </p>
        </div>
      </div>
      <p className="text-[12px] leading-relaxed" style={{ color: INK.sub }}>{T.classDesc[hero.cls]}</p>
      <Panel className="flex items-center justify-center py-2" corners={false}>
        <AbilityRadar stats={{ command: s.command, martial: s.martial, intellect: s.intellect, charm: s.charm }} labels={T.abilities} size={compact ? 180 : 200} color={CLASSES[hero.cls].color} />
      </Panel>
      {hero.derived && <p className="text-[11px]" style={{ color: INK.mute }}>※ {T.select.derived}</p>}
      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
        {VIRTUE_KEYS.map((k) => <StatRow key={k} label={T.virtues[k]} value={s[k]} color="rgba(243,213,122,0.7)" labelWidth={locale === 'en' ? '4.75rem' : '2.5rem'} />)}
      </div>
      <div className="flex flex-col gap-1.5">
        {DISPOSITION_KEYS.map((k) => <DispositionRow key={k} left={T.dispositions[k][0]} right={T.dispositions[k][1]} value={s[k]} labelWidth={locale === 'en' ? '5rem' : '3rem'} />)}
      </div>
      <dl className="grid grid-cols-3 gap-2 text-center">
        <div className="border px-2 py-2" style={{ borderColor: INK.line }}>
          <dt className="text-[10px]" style={{ color: INK.mute }}>{T.select.home}</dt>
          <dd className="truncate text-[13px] font-bold" style={{ color: INK.text }}>{home[locale]}</dd>
          <dd className="text-[10px]" style={{ color: INK.sub }}>{T.select.natives(natives)}</dd>
        </div>
        <div className="border px-2 py-2" style={{ borderColor: INK.line }}>
          <dt className="text-[10px]" style={{ color: INK.mute }}>{T.select.startFame}</dt>
          <dd className="text-[13px] font-bold tabular-nums" style={{ color: INK.text }}>{Math.round(START.fameByGrade[hero.grade] * START.wanderFameRate)}</dd>
        </div>
        <div className="border px-2 py-2" style={{ borderColor: INK.line }}>
          <dt className="text-[10px]" style={{ color: INK.mute }}>{T.sheet.maxTroops}</dt>
          <dd className="text-[13px] font-bold tabular-nums" style={{ color: INK.text }}>{num(locale, maxTroopsOf(hero))}</dd>
        </div>
      </dl>
      {/* 좁은 화면 서랍은 길어서 시작 단추를 아래에 붙여 둔다 */}
      <div className={compact ? 'sticky bottom-0 -mx-4 flex flex-col gap-1.5 border-t px-4 pb-3 pt-2' : 'flex flex-col gap-1.5'} style={compact ? { borderColor: INK.line, background: INK.panelSolid } : undefined}>
        <GameButton variant="primary" size="lg" onClick={onStart} className="w-full">
          {T.select.start}
        </GameButton>
        <p className="text-center text-[11px]" style={{ color: INK.mute }}>{T.difficulty[difficulty]} · {T.select.diffDesc(DIFFICULTY[difficulty].aiFactions, DIFFICULTY[difficulty].limitYears)}</p>
      </div>
    </div>
  )
}
