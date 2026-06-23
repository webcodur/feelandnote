'use client'

import type { FactionScript } from '@/lib/faction-types'
import { imageSrc, initial } from './timing'
import { ChevronLeft, ChevronRight, X } from './icons'

/** 시작 화면에 띄울 후보 인물 (slug 가 있는 인물만) */
export type HeroCandidate = { slug: string; name: string; image?: string }

/** 편 구역 정의 — key 0 = 공통(편별 미지정 시 폴백) */
const PART_TABS: { key: number; label: string; hint: string }[] = [
  { key: 0, label: '공통', hint: '편별로 지정 안 한 편이 이걸 쓴다' },
  { key: 1, label: '1편', hint: '비우면 공통 사용' },
  { key: 2, label: '2편', hint: '비우면 공통 사용' },
]

type Props = {
  script: FactionScript
  candidates: HeroCandidate[]
  series: string
  episodeName: string
  onChange: (patch: Partial<FactionScript>) => void
  /** 지정하면 그 편 한 줄만 그린다(편 묶음 안에서 사용). 미지정이면 공통·1편·2편 전체 */
  part?: number
}

/**
 * 시작 화면(인트로) 핵심 인물 편집.
 * 편별(공통·1편·2편)로 인물을 골라 좌→우 순서대로 배치한다. 인물은 사진 썸네일로 보여 누구인지 바로 안다.
 * part를 주면 그 편 한 줄만 그려 편 묶음 안에 끼워 쓴다.
 */
export function FactionHeroPicker({ script, candidates, series, episodeName, onChange, part }: Props) {
  const heroesOf = (part: number): string[] =>
    part === 0 ? (script.heroes ?? []) : (script.heroesByPart?.[part] ?? [])

  const setHeroes = (part: number, next: string[]) => {
    if (part === 0) {
      onChange({ heroes: next.length ? next : undefined })
      return
    }
    const cur: Record<number, string[]> = { ...(script.heroesByPart ?? {}) }
    if (next.length) cur[part] = next
    else delete cur[part]
    onChange({ heroesByPart: Object.keys(cur).length ? cur : undefined })
  }

  const addHero = (part: number, slug: string) => {
    const cur = heroesOf(part)
    if (slug && !cur.includes(slug)) setHeroes(part, [...cur, slug])
  }
  const removeHero = (part: number, slug: string) =>
    setHeroes(part, heroesOf(part).filter(s => s !== slug))
  const moveHero = (part: number, i: number, dir: -1 | 1) => {
    const cur = [...heroesOf(part)]
    const j = i + dir
    if (j < 0 || j >= cur.length) return
    ;[cur[i], cur[j]] = [cur[j], cur[i]]
    setHeroes(part, cur)
  }
  const infoOf = (slug: string) => candidates.find(c => c.slug === slug)

  // part 지정 시 그 편 한 줄만, 미지정이면 전체
  const tabs = part != null ? PART_TABS.filter(t => t.key === part) : PART_TABS
  const single = part != null

  return (
    <div className="space-y-3">
      {!single && (
        <div className="flex items-baseline gap-2">
          <p className="text-xs font-semibold text-text-secondary">시작 화면 인물</p>
          <span className="text-[10px] text-text-dim">시작 화면에 사진 그리드로 깔린다. 비우면 제목 글자만 뜬다</span>
        </div>
      )}

      {tabs.map(tab => {
        const list = heroesOf(tab.key)
        return (
          <div key={tab.key} className={single ? 'flex items-start gap-3' : 'flex items-start gap-3 rounded-md border border-border bg-bg-card/40 p-2.5'}>
            {/* 편 라벨 — 단일 모드는 묶음이 이미 그 편이라 '시작'으로 표기 */}
            <div className="w-16 shrink-0 pt-1">
              <div className="text-xs font-bold text-text-secondary">{single ? '시작' : tab.label}</div>
              <div className="text-[10px] leading-tight text-text-dim">{single ? '이 편 시작 화면' : tab.hint}</div>
            </div>

            {/* 선택 인물 썸네일 카드들 + 추가 */}
            <div className="flex flex-1 flex-wrap items-stretch gap-2">
              {list.map((slug, i) => {
                const info = infoOf(slug)
                const src = imageSrc(series, episodeName, info?.image)
                return (
                  <div key={slug} className="relative w-20 overflow-hidden rounded-md border border-border bg-bg-card">
                    {/* 썸네일 — 세로 인물샷 */}
                    <div className="h-24 w-full overflow-hidden bg-bg-secondary">
                      {src ? (
                        <img src={src} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <span className="flex h-full w-full items-center justify-center text-xl font-bold text-text-secondary">
                          {initial(info?.name ?? slug)}
                        </span>
                      )}
                    </div>
                    {/* 순번 배지 */}
                    <span className="absolute left-1 top-1 rounded bg-black/60 px-1.5 text-[10px] font-bold text-white">{i + 1}</span>
                    {/* 제거 */}
                    <button
                      onClick={() => removeHero(tab.key, slug)}
                      className="absolute right-0.5 top-0.5 rounded bg-black/55 p-0.5 text-white hover:bg-danger"
                      title="제거"
                    >
                      <X size={12} />
                    </button>
                    {/* 이름 + 순서 이동 */}
                    <div className="flex items-center justify-between gap-0.5 px-1 py-0.5">
                      <button
                        onClick={() => moveHero(tab.key, i, -1)}
                        disabled={i === 0}
                        className="shrink-0 text-text-secondary hover:text-accent disabled:opacity-25"
                        title="앞으로"
                      >
                        <ChevronLeft size={14} />
                      </button>
                      <span className="min-w-0 flex-1 truncate text-center text-[11px]" title={info?.name ?? slug}>{info?.name ?? slug}</span>
                      <button
                        onClick={() => moveHero(tab.key, i, 1)}
                        disabled={i === list.length - 1}
                        className="shrink-0 text-text-secondary hover:text-accent disabled:opacity-25"
                        title="뒤로"
                      >
                        <ChevronRight size={14} />
                      </button>
                    </div>
                  </div>
                )
              })}

              {/* 인물 추가 — 후보 중 아직 안 고른 인물 */}
              <select
                value=""
                onChange={e => { addHero(tab.key, e.target.value); e.target.value = '' }}
                className="h-24 w-20 shrink-0 rounded-md border border-dashed border-border bg-bg-card text-center text-xs text-text-secondary hover:border-accent"
                title="시작 화면에 넣을 인물 추가"
              >
                <option value="">+ 추가</option>
                {candidates.filter(c => !list.includes(c.slug)).map(c => (
                  <option key={c.slug} value={c.slug}>{c.name}</option>
                ))}
              </select>

              {list.length === 0 && (
                <span className="self-center text-[11px] text-text-dim">
                  {tab.key === 0 ? '없음 — 제목 글자로 시작' : '없음 — 공통 인물 사용'}
                </span>
              )}
            </div>

            {/* 가로/세로 배치 — 전역 토글. 가로: 한 줄에 나란히(각 칸 세로로 김), 세로: 위아래로(각 칸 가로로 김) */}
            {single && (
              <label className="flex w-16 shrink-0 cursor-pointer flex-col items-center gap-1 self-center text-center text-[10px] text-text-secondary" title="시작/마지막 화면 항목 배치 — 가로(각 칸 세로로 김, 인물 사진용) / 세로(각 칸 가로로 김, 가로 로고용)">
                <select
                  value={script.heroLayout ?? 'row'}
                  onChange={e => onChange({ heroLayout: e.target.value === 'row' ? undefined : e.target.value as 'column' | 'grid' })}
                  className="w-full rounded border border-border bg-bg-card px-1 py-1 text-[11px]"
                >
                  <option value="row">가로</option>
                  <option value="column">세로</option>
                  <option value="grid">2열</option>
                </select>
                배치
              </label>
            )}

            {/* 마지막 화면에도 시작 화면을 동일하게 — 전역 토글(어느 편에서 켜도 전체 적용) */}
            {single && (
              <label className="flex w-24 shrink-0 cursor-pointer flex-col items-center gap-1 self-center text-center text-[10px] text-text-secondary" title="켜면 영상 끝에 시작 화면(인물 그리드)을 한 번 더 띄운다">
                <input
                  type="checkbox"
                  checked={!!script.outroSameAsIntro}
                  onChange={e => onChange({ outroSameAsIntro: e.target.checked || undefined })}
                  className="h-4 w-4 accent-accent"
                />
                마지막 화면에도 사용
              </label>
            )}
          </div>
        )
      })}
    </div>
  )
}
