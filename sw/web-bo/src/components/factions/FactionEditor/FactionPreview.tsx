'use client'

import { useState } from 'react'
import { factionSequenceOf, type FactionScript, type FactionGroup, type FactionCluster, type FactionPerson, type FactionImageCrop } from '@/lib/faction-types'
import { imageSrc, initial, totalSec, cueCount, factionStepsOf, longformPartCount, longformSegments, longformSliceGroup, ERA_SEC, CHAPTER_BLACK_SEC, CHAPTER_COVER_SEC } from '../shared/timing'
import { formatMmss } from '@feelandnote/shared/bo/editor'
import { MediaThumb, cropToStyle } from '@feelandnote/shared/bo/media'
import { Eye, EyeOff } from '@feelandnote/shared/bo/icons'
import { factionSceneCaptionPages } from '@feelandnote/shared/lib/faction-scene-timing'

type Props = {
  script: FactionScript
  series: string
  episodeName: string
  /** 미리보기에서 세력 영상 제외/복원 토글 (groupIndex). 없으면 읽기 전용 */
  onToggleDisabled?: (groupIndex: number) => void
}

// 렌더러 clustersOf 미러 — 인물은 항상 그룹(clusters) 안에 있다
function clustersOf(g: FactionGroup): FactionCluster[] {
  return g.clusters ?? []
}

// 통합 명칭(앞부분\n뒷부분)을 첫 줄(앞부분)·나머지(뒷부분)로 분리
function splitName(v?: string): { head: string; rest: string } {
  const lines = (v ?? '').split('\n')
  return { head: (lines[0] ?? '').trim(), rest: lines.slice(1).join(' ').trim() }
}

// 화보 카드 자리 표시 — 이미지 있으면 썸네일, 없으면 칩. label은 통합 명칭(첫 줄=앞부분, 나머지=뒷부분)
function CoverChip({ image, label, color, series, episodeName }: {
  image?: string
  label?: string
  color: string
  series: string
  episodeName: string
}) {
  const src = imageSrc(series, episodeName, image)
  const { head, rest } = splitName(label)
  return (
    <div className="flex items-center gap-2">
      {src ? (
        <MediaThumb src={src} alt="" className="h-10 w-16 rounded object-cover" style={{ border: `1px solid ${color}` }} />
      ) : (
        <span className="rounded border border-dashed border-border px-2 py-1 text-[11px] text-text-dim">화보 없음</span>
      )}
      {head && <span className="truncate text-xs font-semibold text-text-primary">{head}</span>}
      {rest && <span className="truncate text-xs" style={{ color }}>{rest}</span>}
    </div>
  )
}

// 인물 한 명 셀
function PersonCell({ person, series, episodeName, isLeader, inheritedImage, inheritedImageCrop }: {
  person: FactionPerson
  series: string
  episodeName: string
  inheritedImage?: string
  inheritedImageCrop?: FactionImageCrop
  /** 세력 첫 인물(수장) 여부 — quoteMode 자동(미지정) 판정용 */
  isLeader?: boolean
}) {
  const ownImage = person.image && person.image !== inheritedImage ? person.image : undefined
  const imageInherited = !!inheritedImage && !ownImage
  const effectiveImage = ownImage ?? inheritedImage
  const effectiveImageCrop = ownImage ? person.imageCrop : inheritedImageCrop
  const src = imageSrc(series, episodeName, effectiveImage)
  // 대사 처리 스텝(직함·수식어·음성) — 켜진 것만 배지로. 음성 켜지면 강조색.
  const steps = factionStepsOf(person, true, isLeader)
  const stepLabels = [steps.credit && '직함', steps.epithet && '수식', steps.voice && '음성'].filter(Boolean)
  const badge = {
    t: stepLabels.length ? stepLabels.join('·') : '없음',
    c: steps.voice ? 'bg-accent/20 text-accent' : 'bg-bg-secondary text-text-dim',
  }
  return (
    <div
      className="flex w-16 shrink-0 flex-col items-center gap-1"
      style={person.disabled ? { opacity: 0.4, filter: 'saturate(0.4)' } : undefined}
    >
      {src ? (
        <span className="relative">
          <MediaThumb src={src} alt="" className="h-14 w-14 rounded-full object-cover" style={cropToStyle(effectiveImageCrop)} />
          {imageInherited && (
            <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 rounded bg-sky-950/90 px-1 text-[8px] font-bold text-sky-200">
              상속
            </span>
          )}
        </span>
      ) : (
        <span className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-danger-text bg-bg-secondary text-sm font-bold text-text-secondary">
          {initial(person.name)}
        </span>
      )}
      <span className="flex items-center gap-0.5">
        <span className={`rounded px-1 text-[9px] font-semibold ${badge.c}`} title={`대사 처리: ${badge.t}`}>{badge.t}</span>
        {(person as any).longformOnly && <span className="rounded bg-accent/20 px-1 text-[9px] font-semibold text-accent" title="롱폼 전용 — 쇼츠에서 제외">L</span>}
      </span>
      <span className="w-full truncate text-center text-[11px] text-text-secondary">{person.name || '?'}</span>
      {person.lines?.length ? (
        <span className="w-full truncate text-center text-[10px] text-text-dim">{person.lines.filter(Boolean).join(' · ')}</span>
      ) : null}
      {person.quote ? (
        <span title={person.quote} className="w-full truncate text-center text-[10px] italic text-text-dim">“{person.quote}”</span>
      ) : null}
    </div>
  )
}

// 세력 한 블록(타이틀 + 묶음별 화보·인물) — 전체 흐름·롱폼 편 흐름이 공유
function GroupBlock({ g, gi, series, episodeName, onToggleDisabled }: {
  g: FactionGroup
  gi: number
  series: string
  episodeName: string
  onToggleDisabled?: (groupIndex: number) => void
}) {
  const color = g.color ?? '#92400e'
  const clusters = clustersOf(g)
  // 비활성화 세력은 영상에서 빠진다 — 흐리게 표시하고 배지를 단다
  return (
    <div className="space-y-2" style={g.disabled ? { opacity: 0.4, filter: 'saturate(0.4)' } : undefined}>
      {/* solo가 아니면 세력 타이틀 표시 */}
      {!g.solo && (
        <div className="flex items-center gap-2 rounded-md bg-bg-secondary px-3 py-2">
          <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: color }} />
          {(() => {
            const { head, rest } = splitName(g.name)
            return (
              <>
                <span className="truncate text-sm font-semibold text-text-primary">{head || '세력명 없음'}</span>
                {rest && <span className="truncate text-xs" style={{ color }}>{rest}</span>}
              </>
            )
          })()}
          {g.disabled && <span className="shrink-0 rounded bg-danger/20 px-1.5 text-[10px] font-semibold text-danger-text">영상 제외</span>}
          {onToggleDisabled && (
            <button
              onClick={() => onToggleDisabled(gi)}
              className="ml-auto shrink-0 rounded border border-border p-1 text-text-secondary hover:bg-bg-hover"
              title={g.disabled ? '이 세력을 다시 영상에 포함' : '이 세력을 영상에서 제외'}
            >
              {g.disabled ? <Eye size={13} /> : <EyeOff size={13} />}
            </button>
          )}
        </div>
      )}

      {/* 수평 sequence 순서대로 그룹과 개별 장면을 같은 층위에 펼친다. */}
      {factionSequenceOf(g).map((item, sequenceIndex) => {
        if (item.kind === 'cut') {
          return (
            <div key={`cut-${sequenceIndex}`} className="flex items-center gap-2 py-1" aria-label="쇼츠 편 경계">
              <span className="h-px flex-1 bg-sky-500/50" />
              <span className="shrink-0 rounded border border-sky-500/50 bg-sky-500/10 px-2 py-0.5 text-[9px] font-black text-sky-500">쇼츠 편 경계 · 롱폼 연속</span>
              <span className="h-px flex-1 bg-sky-500/50" />
            </div>
          )
        }
        if (item.kind === 'scene') {
          const scene = item.scene
          const captionPages = factionSceneCaptionPages(scene.caption)
          return (
            <div key={item.id} className="rounded-md border-s-2 border-teal-500 bg-teal-500/10 px-3 py-2 text-center">
              <p className="text-[10px] font-bold text-teal-500">개별 장면 · 인물·대사 없음</p>
              <p className="text-xs font-bold text-text-primary">{scene.title || '개별 장면'}</p>
              {captionPages.length > 0 ? (
                <div className="mt-1.5 space-y-1 text-left">
                  {captionPages.map((page, pageIndex) => (
                    <div key={`${pageIndex}-${page}`} className="flex gap-1.5 rounded bg-bg-main/45 px-2 py-1.5">
                      <span className="shrink-0 rounded bg-teal-500/15 px-1 text-[9px] font-black text-teal-400">{pageIndex + 1}</span>
                      <p className="whitespace-pre-line text-[10px] leading-relaxed text-text-secondary">{page}</p>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          )
        }
        const ci = item.clusterIndex
        const c = clusters[ci]
        if (!c) return null
        const people = c.people ?? []
        return (
          <div key={`cluster-${ci}-${sequenceIndex}`} className="space-y-1.5 rounded-md bg-bg-main/40 p-2 relative" style={c.disabled ? { opacity: 0.4, filter: 'saturate(0.4)' } : undefined}>
            {c.disabled && <div className="absolute top-2 right-2 rounded bg-danger/20 px-1.5 text-[10px] font-semibold text-danger-text z-10">영상 제외</div>}
            {!g.solo && (
              <CoverChip image={c.image} label={c.label} color={color} series={series} episodeName={episodeName} />
            )}
            <div className="flex gap-2 overflow-x-auto pb-1">
              {people.map((p, pi) => (
                <PersonCell
                  key={pi}
                  person={p}
                  series={series}
                  episodeName={episodeName}
                  inheritedImage={g.solo ? undefined : c.image}
                  inheritedImageCrop={g.solo ? undefined : c.imageCrop}
                  isLeader={ci === 0 && pi === 0}
                />
              ))}
              {people.length === 0 && <span className="text-xs text-text-dim">인물 없음</span>}
            </div>
          </div>
        )
      })}
    </div>
  )
}

export function FactionPreview({ script, series, episodeName, onToggleDisabled }: Props) {
  const groups = script.groups ?? []

  // 롱폼 편 선택 — 편 경계(cut)가 있을 때만 선택 버튼 노출. null = 전체(쇼츠·통짜 롱폼) 흐름
  const [lvPartSel, setLvPartSel] = useState<number | null>(null)
  const lvCount = longformPartCount(script)
  const lvPart = lvCount > 1 ? lvPartSel : null
  // 선택한 편의 구간(세력 블록·시대 문구 나열) — 렌더(buildCues)와 동일 규칙으로 가른다
  const steps = lvPart != null ? longformSegments(script)[lvPart - 1] ?? [] : null

  // 요약 — 편 선택 시 그 편 세력만으로 계산(시대 문구 카드 시간 포함). 각 편은 자체 인트로·아웃트로
  const partGroups = steps ? steps.flatMap(s => {
    if (!('gi' in s)) return []
    const group = longformSliceGroup(script, s)
    return group ? [group] : []
  }) : groups
  const eraN = steps ? steps.filter(s => 'era' in s).length : 0
  const chapterN = steps ? steps.filter(s => 'chapter' in s).length : 0
  const scoped = steps ? { ...script, groups: partGroups } : script
  // 타이틀·시작문구 — 편 선택 시 편별 값(비우면 공통)
  const title = (lvPart != null ? script.titleByLvPart?.[lvPart] : undefined) || script.title
  const logline = lvPart != null
    ? (script.loglineByLvPart?.[lvPart] || script.logline)
    : (script.logline || script.loglineByLvPart?.[1])

  return (
    <div>
      {/* 롱폼 편 선택 — 경계가 있을 때만 */}
      {lvCount > 1 && (
        <div className="mb-3 flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => setLvPartSel(null)}
            className={`rounded-md border px-2.5 py-1 text-xs font-semibold ${lvPart == null ? 'border-accent bg-accent/10 text-accent' : 'border-border bg-bg-card text-text-secondary hover:bg-bg-hover'}`}
          >
            전체
          </button>
          {Array.from({ length: lvCount }, (_, k) => k + 1).map(p => (
            <button
              key={p}
              onClick={() => setLvPartSel(p)}
              className={`rounded-md border px-2.5 py-1 text-xs font-semibold ${lvPart === p ? 'border-accent bg-accent/10 text-accent' : 'border-border bg-bg-card text-text-secondary hover:bg-bg-hover'}`}
            >
              롱폼 {p}편
            </button>
          ))}
        </div>
      )}

      {/* 요약 */}
      <div className="mb-3 flex items-center gap-3 text-xs text-text-secondary">
        <span>총 길이 {formatMmss(totalSec(scoped) + eraN * ERA_SEC + chapterN * (CHAPTER_BLACK_SEC + CHAPTER_COVER_SEC))}</span>
        <span>·</span>
        <span>컷 {cueCount(scoped) + eraN + chapterN * 2}개</span>
      </div>

      {/* 9:16 흐름 박스 */}
      <div className="mx-auto w-full max-w-[360px] overflow-hidden rounded-lg border border-border bg-bg-card">
        <div className="flex flex-col" style={{ aspectRatio: '9 / 16', minHeight: 480 }}>
          <div className="flex-1 space-y-3 overflow-y-auto p-3">
            {/* 타이틀 카드 — 영상 명칭 통합(첫 줄=앞부분, 나머지=뒷부분). 편 선택 시 편별 명칭 */}
            <div className="rounded-md bg-bg-secondary p-4 text-center">
              {(() => {
                const { head, rest } = splitName(title)
                return (
                  <>
                    <p className="text-base font-bold text-text-primary">{head || '영상 명칭 없음'}</p>
                    {rest && <p className="text-xs text-text-secondary">{rest}</p>}
                  </>
                )
              })()}
              {logline && <p className="mt-1 text-xs text-accent">{logline}</p>}
            </div>

            {/* 흐름 — 전체는 세력 배열 순서, 롱폼 편 선택 시 그 편 구간(시대 문구 카드 포함) 순서 */}
            {steps ? (
              steps.map((st, k) => {
                if ('era' in st) {
                  const { head, rest } = splitName(st.era.label)
                  return (
                    <div key={k} className="rounded-md border-s-2 border-amber-500 bg-amber-500/10 p-3 text-center">
                      <p className="text-sm font-bold text-text-primary">{head || '시대 문구'}</p>
                      {rest && <p className="text-xs text-amber-600">{rest}</p>}
                    </div>
                  )
                }
                if ('chapter' in st) {
                  const { head, rest } = splitName(st.chapter.title)
                  return (
                    <div key={k} className="rounded-md border-s-2 border-purple-500 bg-purple-500/10 p-3 text-center">
                      <p className="text-[10px] font-bold text-purple-500">챕터 전환 · 검정 브릿지 + 챕터 표지</p>
                      <p className="text-sm font-bold text-text-primary">{head || '챕터'}</p>
                      {rest && <p className="text-xs text-purple-400">{rest}</p>}
                    </div>
                  )
                }
                const g = groups[st.gi]
                const slice = g ? longformSliceGroup(script, st) : undefined
                if (!slice) return null
                return <GroupBlock key={k} g={slice} gi={st.gi} series={series} episodeName={episodeName} onToggleDisabled={onToggleDisabled} />
              })
            ) : (
              groups.map((g, gi) => (
                <GroupBlock key={gi} g={g} gi={gi} series={series} episodeName={episodeName} onToggleDisabled={onToggleDisabled} />
              ))
            )}

            {/* 마무리 — 별도 종료 화면 없이 마지막 인물 컷에서 서서히 어두워지며 끝난다 */}
            <div className="rounded-md border border-dashed border-border bg-bg-main/40 p-3 text-center">
              <p className="text-xs text-text-dim">마지막 인물에서 서서히 어두워지며 종료</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
