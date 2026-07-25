'use client'

import { useState } from 'react'
import type { FactionScript } from '@/lib/faction-types'
import { imageSrc, initial } from '../shared/timing'
import { ChevronLeft, ChevronRight, ChevronDown, X, ImageIcon } from '@/components/icons'
import { MediaThumb, ImagePicker } from '@/components/media'

/** 시작 화면에 띄울 후보 인물 (slug 가 있는 인물만) */
export type HeroCandidate = { slug: string; name: string; image?: string }

/** 'logo:<경로>' 접두 — 인물이 아니라 임의 이미지 한 장을 시작 화면에 깐다 */
const LOGO_PREFIX = 'logo:'

const DEFAULT_PART_COUNT = 2

const partTab = (part: number) => ({
  key: part,
  label: part === 0 ? '공통' : `${part}편`,
  hint: part === 0 ? '편별로 지정 안 한 편이 이걸 쓴다' : '비우면 공통 사용',
})

type Props = {
  script: FactionScript
  candidates: HeroCandidate[]
  series: string
  episodeName: string
  onChange: (patch: Partial<FactionScript>) => void
  /** 지정하면 그 편 한 줄만 그린다(편 묶음 안에서 사용). 미지정이면 공통·1편…N편 전체 */
  part?: number
  /** 편 묶음을 한꺼번에 표시할 때 사용할 쇼츠 편 수 */
  partCount?: number
}

/**
 * 시작 화면(인트로) 핵심 인물 편집.
 * 편별(공통·1편…N편)로 인물을 골라 좌→우 순서대로 배치한다. 인물은 사진 썸네일로 보여 누구인지 바로 안다.
 * part를 주면 그 편 한 줄만 그려 편 묶음 안에 끼워 쓴다.
 */
export function FactionHeroPicker({ script, candidates, series, episodeName, onChange, part, partCount }: Props) {
  // 이미지 한 장 고르기 모달 — 어느 편(part)에 추가할지. null 이면 닫힘.
  const [pickPart, setPickPart] = useState<number | null>(null)

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
  // 이미지 한 장 추가 — 'logo:<경로>' 항목으로. 한 장만 넣으면 시작 화면을 그 이미지가 가득 채운다.
  const addImage = (part: number, path: string) => {
    const item = `${LOGO_PREFIX}${path}`
    const cur = heroesOf(part)
    if (path && !cur.includes(item)) setHeroes(part, [...cur, item])
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

  // part 지정 시 그 편 한 줄만, 미지정이면 사용자가 정한 전체 편
  const count = Math.max(1, partCount ?? script.shortsPartCount ?? DEFAULT_PART_COUNT)
  const tabs = part != null
    ? [partTab(part)]
    : [partTab(0), ...Array.from({ length: count }, (_, index) => partTab(index + 1))]
  const single = part != null

  return (
    <div className="space-y-3">
      {!single && (
        <div className="flex items-baseline gap-2">
          <p className="text-xs font-semibold text-text-secondary">시작 화면</p>
          <span className="text-[10px] text-text-dim">인물 사진 또는 이미지 한 장을 깐다. 이미지 한 장만 넣으면 화면을 가득 채운다. 비우면 제목 글자만 뜬다</span>
        </div>
      )}

      {tabs.map(tab => {
        const list = heroesOf(tab.key)
        return (
          <div key={tab.key} className={single ? 'flex items-start gap-3' : 'flex items-start gap-3 rounded-md border border-border bg-bg-card/40 p-2.5'}>
            {/* 편 라벨 — 단일 모드는 묶음이 이미 그 편이라 '시작'으로 표기 */}
            <div className="w-20 shrink-0 pt-1">
              {single ? (
                <div className="whitespace-nowrap text-xs text-text-dim">시작 화면 -</div>
              ) : (
                <>
                  <div className="text-xs font-bold text-text-secondary">{tab.label}</div>
                  <div className="text-[10px] leading-tight text-text-dim">{tab.hint}</div>
                </>
              )}
            </div>

            {/* 선택 인물 썸네일 카드들 + 추가 */}
            <div className="flex flex-1 flex-wrap items-stretch gap-2">
              {list.map((slug, i) => {
                const isLogo = slug.startsWith(LOGO_PREFIX)
                const info = isLogo ? undefined : infoOf(slug)
                const src = isLogo
                  ? imageSrc(series, episodeName, slug.slice(LOGO_PREFIX.length))
                  : imageSrc(series, episodeName, info?.image)
                const label = isLogo ? '이미지' : (info?.name ?? slug)
                return (
                  <div key={slug} className="relative w-20 overflow-hidden rounded-md border border-border bg-bg-card">
                    {/* 썸네일 — 인물샷 또는 임의 이미지 한 장 */}
                    <div className="h-24 w-full overflow-hidden bg-bg-secondary">
                      {src ? (
                        <MediaThumb src={src} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <span className="flex h-full w-full items-center justify-center text-xl font-bold text-text-secondary">
                          {initial(label)}
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
                      <span className="min-w-0 flex-1 truncate text-center text-[11px]" title={label}>{label}</span>
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
              <div
                className="relative flex h-24 w-20 shrink-0 flex-col items-center justify-center gap-1 rounded-md border border-dashed border-border bg-bg-card text-xs text-text-secondary hover:border-accent"
                title="시작 화면에 넣을 인물 추가"
              >
                <span>+ 인물</span>
                <ChevronDown size={14} className="text-text-dim" />
                <select
                  value=""
                  onChange={e => { addHero(tab.key, e.target.value); e.target.value = '' }}
                  className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                >
                  <option value="">+ 인물</option>
                  {candidates.filter(c => !list.includes(c.slug)).map(c => (
                    <option key={c.slug} value={c.slug}>{c.name}</option>
                  ))}
                </select>
              </div>

              {/* 이미지 한 장 추가 — 인물 대신 임의 이미지로 시작 화면을 채운다 */}
              <button
                onClick={() => setPickPart(tab.key)}
                className="flex h-24 w-20 shrink-0 flex-col items-center justify-center gap-1 rounded-md border border-dashed border-border bg-bg-card text-xs text-text-secondary hover:border-accent"
                title="시작 화면에 깔 이미지 한 장 추가(이미지 풀에서 선택 또는 업로드)"
              >
                <ImageIcon size={18} />
                + 이미지
              </button>

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

          </div>
        )
      })}

      {/* 이미지 한 장 고르기 — 이미지 풀에서 선택 또는 업로드. 고르면 'logo:<경로>' 항목으로 들어간다. */}
      {pickPart != null && (
        <ImagePicker
          value={undefined}
          onChange={next => { if (next) { addImage(pickPart, next); setPickPart(null) } }}
          series={series}
          episodeName={episodeName}
          onClose={() => setPickPart(null)}
        />
      )}
    </div>
  )
}
