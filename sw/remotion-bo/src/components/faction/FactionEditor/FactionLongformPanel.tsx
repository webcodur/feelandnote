'use client'

import type { FactionScript, FactionLongformItem, FactionGroup } from '../../../lib/faction-types'
import type { EditLang } from '../FactionEditor'
import { totalPeople, formatMmss, totalSec, longformPartCount, longformSegments, ERA_SEC } from '../shared/timing'
import { FactionMusicPicker } from '../shared/FactionMusicPicker'
import { PartTextField } from './sections/PartTextField'

/** 세력 색 위 글자색 — 밝으면 검정, 어두우면 흰색 */
function contrast(hex?: string): string {
  const h = (hex ?? '#92400e').replace('#', '')
  if (h.length < 6) return '#ffffff'
  const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16)
  return 0.299 * r + 0.587 * g + 0.114 * b > 150 ? '#1a1a1a' : '#ffffff'
}

const head = (s?: string) => (s ?? '').split('\n')[0]?.trim() ?? ''

/**
 * 롱폼 편성 패널 — 쇼츠 편성(편1·편2)과 별개로 롱폼 전용 순서를 직접 짠다.
 * 세력 블록을 위/아래로 옮겨 원하는 순서(예: 시조-4강-유럽-중국-기타)로 배치하고,
 * 사이사이 「시대 문구」 카드와 「편 경계」를 끼울 수 있다. 세력 내부 구성·쇼츠·음원은 건드리지 않는다.
 * 편 경계를 꽂으면 롱폼이 그 지점에서 여러 편(1편·2편…)으로 갈라지고, 편별 명칭·시작문구를 따로 둘 수 있다.
 * 비워두면(직접 배치 안 함) 롱폼은 세력 카드 배열 순서를 그대로 따른다.
 */
export function FactionLongformPanel({
  script,
  onChange,
  onJump,
  musicList,
  editLang,
}: {
  script: FactionScript
  onChange: (patch: Partial<FactionScript>) => void
  onJump: (groupIndex: number) => void
  musicList: string[]
  editLang: EditLang
}) {
  const layout: FactionLongformItem[] = script.longformLayout ?? []
  const active = script.groups.map((g, i) => ({ g, i })).filter(x => !x.g.disabled)

  const setLayout = (next: FactionLongformItem[]) =>
    onChange({ longformLayout: next.length ? next : undefined })
  // 세력 한 개 필드 갱신 — 롱폼 곡 지정에 쓴다
  const setGroupPatch = (gi: number, patch: Partial<FactionGroup>) =>
    onChange({ groups: script.groups.map((g, idx) => (idx === gi ? { ...g, ...patch } : g)) })
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir
    if (j < 0 || j >= layout.length) return
    const next = [...layout]
    ;[next[i], next[j]] = [next[j], next[i]]
    setLayout(next)
  }
  const removeAt = (i: number) => setLayout(layout.filter((_, k) => k !== i))
  const addGroup = (gi: number) => setLayout([...layout, { group: gi }])
  const addEra = () => setLayout([...layout, { era: { label: '시대\n문구' } }])
  const addCut = () => setLayout([...layout, { cut: true }])
  const setEra = (i: number, label: string) =>
    setLayout(layout.map((it, k) => (k === i && 'era' in it ? { era: { ...it.era, label } } : it)))

  // 편 경계(cut) 유무·편 개수 — 경계가 있으면 롱폼이 여러 편으로 갈라진다
  const lvCount = longformPartCount(script)
  const hasCut = lvCount > 1
  // 편별 길이 추정 — 구간의 세력만 모아 기존 추정 함수 재사용 + 시대 문구 카드 시간
  const segments = longformSegments(script)
  const lvPartSec = (p: number): number => {
    const steps = segments[p - 1] ?? []
    const gs = steps.flatMap(s => ('gi' in s ? [script.groups[s.gi]].filter(Boolean) : []))
    const eraN = steps.filter(s => 'era' in s).length
    return totalSec({ ...script, groups: gs }) + eraN * ERA_SEC
  }

  // 직접 배치 시작 — 현재 활성 세력을 배열 순서대로 깔아준다.
  const initFromGroups = () => setLayout(active.map(x => ({ group: x.i })))

  // 배치에 든 세력 인덱스 / 아직 안 든 활성 세력
  const placed = new Set(layout.flatMap(it => ('group' in it ? [it.group] : [])))
  const unplaced = active.filter(x => !placed.has(x.i))

  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <div className="flex items-center gap-3 bg-bg-card px-4 py-3">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-amber-500/20 text-sm font-bold text-amber-500">롱</span>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <span className="shrink-0 text-base font-bold text-text-primary">롱폼 편성</span>
            <span className="truncate text-[11px] text-text-dim">{layout.length ? '세력 순서를 직접 배치 · 사이에 시대 문구 카드·편 경계' : '직접 배치 안 함 — 롱폼은 세력 카드 배열 순서를 따른다'}</span>
          </div>
        </div>
        <span className="ml-auto flex shrink-0 items-center gap-2 text-xs text-text-dim">
          <span>세력 {active.length}</span>
          <span>인물 {totalPeople(script)}</span>
          <span className="font-mono">{formatMmss(totalSec(script))}</span>
        </span>
      </div>

      <div className="space-y-2 border-t border-border bg-bg-main/20 p-3">
        {layout.length === 0 ? (
          <button onClick={initFromGroups} className="w-full rounded-md border border-dashed border-amber-500/60 px-3 py-2 text-xs font-bold text-amber-600 hover:bg-amber-500/10">
            직접 배치 시작 — 현재 세력 순서로 깔기
          </button>
        ) : (
          <>
            {/* 롱폼 순서 — 세력 블록·시대 문구 카드·편 경계를 위/아래로 옮긴다 */}
            <div className="flex flex-col gap-1">
              {/* 경계가 있으면 맨 앞에 1편 라벨 — 어느 편에 속하는지 한눈에 */}
              {hasCut && (
                <div className="px-1 text-[10px] font-bold text-sky-600">1편 · {formatMmss(lvPartSec(1))}</div>
              )}
              {layout.map((it, i) => {
                if ('cut' in it) {
                  // 이 경계까지의 cut 수 + 1 = 경계 뒤에 시작하는 편 번호
                  const partNo = layout.slice(0, i + 1).filter(x => 'cut' in x).length + 1
                  return (
                    <div key={i} className="flex items-center gap-1.5 rounded border border-dashed border-sky-500/60 bg-sky-500/10 px-2 py-1">
                      <span className="h-px flex-1 bg-sky-500/40" />
                      <span className="shrink-0 text-[10px] font-bold text-sky-600">
                        편 경계 — 여기서 {partNo}편 시작 · {formatMmss(lvPartSec(partNo))}
                      </span>
                      <span className="h-px flex-1 bg-sky-500/40" />
                      <MoveBtns onUp={() => move(i, -1)} onDown={() => move(i, 1)} onRemove={() => removeAt(i)} />
                    </div>
                  )
                }
                if ('era' in it) {
                  return (
                    <div key={i} className="flex items-center gap-1.5 rounded border-l-2 border-amber-500 bg-amber-500/10 px-2 py-1">
                      <span className="shrink-0 text-[10px] font-bold text-amber-600">시대 문구</span>
                      <textarea
                        value={it.era.label}
                        onChange={e => setEra(i, e.target.value)}
                        rows={2}
                        placeholder={'4강\n패권을 다투다'}
                        className="min-w-0 flex-1 resize-none rounded border border-border bg-bg-card px-2 py-1 text-xs leading-tight focus:border-accent focus:outline-none"
                        title="시대 문구 (첫 줄=앞부분/크게, 둘째 줄=뒷부분/강조색)"
                      />
                      <MoveBtns onUp={() => move(i, -1)} onDown={() => move(i, 1)} onRemove={() => removeAt(i)} />
                    </div>
                  )
                }
                const g = script.groups[it.group]
                const color = g?.color ?? '#92400e'
                return (
                  <div key={i} className="flex items-center gap-1.5">
                    <button
                      onClick={() => onJump(it.group)}
                      className="flex min-w-0 flex-1 items-center gap-2 rounded px-2 py-1 text-left transition hover:brightness-110 hover:ring-2 hover:ring-white/30"
                      style={{ backgroundColor: color, color: contrast(color) }}
                      title={g ? `${head(g.name)}로 이동` : '없는 세력'}
                    >
                      <span className="shrink-0 text-[10px] opacity-70">세력</span>
                      <span className="min-w-0 truncate text-xs font-bold">{g ? head(g.name) : `(삭제된 세력 #${it.group})`}</span>
                    </button>
                    <MoveBtns onUp={() => move(i, -1)} onDown={() => move(i, 1)} onRemove={() => removeAt(i)} />
                  </div>
                )
              })}
            </div>

            {/* 추가 도구 — 시대 문구 / 편 경계 / 안 든 세력 */}
            <div className="flex flex-wrap items-center gap-1.5 border-t border-border/60 pt-2">
              <button onClick={addEra} className="rounded border border-amber-500/60 px-2 py-1 text-[11px] font-bold text-amber-600 hover:bg-amber-500/10">+ 시대 문구</button>
              <button onClick={addCut} title="편 경계 — 롱폼을 이 지점에서 다음 편으로 가른다 (각 편은 자체 시작·종료 화면)" className="rounded border border-sky-500/60 px-2 py-1 text-[11px] font-bold text-sky-600 hover:bg-sky-500/10">+ 편 경계</button>
              {unplaced.length > 0 && <span className="text-[11px] text-text-dim">안 든 세력:</span>}
              {unplaced.map(x => (
                <button
                  key={x.i}
                  onClick={() => addGroup(x.i)}
                  className="rounded px-2 py-0.5 text-[11px] font-bold hover:brightness-110"
                  style={{ backgroundColor: x.g.color ?? '#92400e', color: contrast(x.g.color) }}
                  title={`${head(x.g.name)} 추가`}
                >
                  + {head(x.g.name)}
                </button>
              ))}
            </div>

            {/* 편별 설정 — 경계가 있을 때만. 각 롱폼 편의 영상 명칭·시작문구(비우면 공통 값) */}
            {hasCut && (
              <div className="space-y-2 border-t border-border/60 pt-2">
                <div className="text-[10px] font-semibold text-text-dim">롱폼 편별 설정 — 편 경계로 가른 각 편의 명칭·시작문구 (비우면 공통)</div>
                {Array.from({ length: lvCount }, (_, k) => k + 1).map(p => (
                  <div key={p} className="space-y-2 rounded-md border border-border/60 bg-bg-card/30 p-2.5">
                    <div className="flex items-baseline gap-2">
                      <span className="text-[11px] font-bold text-sky-600">롱폼 {p}편</span>
                      <span className="font-mono text-[10px] text-text-dim">{formatMmss(lvPartSec(p))}</span>
                    </div>
                    <PartTextField part={p} label="영상 명칭" keys={{ common: 'title', byPart: 'titleByPart' }} multiline script={script} update={onChange} editLang={editLang} />
                    <PartTextField part={p} label="시작문구" keys={{ common: 'logline', byPart: 'loglineByPart' }} multiline multilineHint="시작문구 (개행하면 위·아래 두 줄)" script={script} update={onChange} editLang={editLang} />
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* 세력별 배경음악 (롱폼) — 세력 진입 시 곡 교체(미지정=직전 곡 유지). 순서 배치와 무관하게 항상 지정 가능 */}
        {active.length > 0 && (
          <div className="space-y-1 border-t border-border/60 pt-2">
            <div className="text-[10px] font-semibold text-text-dim">세력별 배경음악 (롱폼)</div>
            {active.map(({ g, i }) => (
              <div key={i} className="flex items-center gap-2">
                <span className="h-3 w-3 shrink-0 rounded-sm" style={{ backgroundColor: g.color ?? '#92400e' }} />
                <span className="w-28 shrink-0 truncate text-[11px] font-semibold text-text-primary" title={head(g.name)}>{head(g.name)}</span>
                <FactionMusicPicker
                  file={g.music}
                  vol={g.musicVolume}
                  musicList={musicList}
                  onFile={v => setGroupPatch(i, { music: v })}
                  onVol={v => setGroupPatch(i, { musicVolume: v })}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

/** 한 항목의 위/아래 이동 + 삭제 버튼 묶음 */
function MoveBtns({ onUp, onDown, onRemove }: { onUp: () => void; onDown: () => void; onRemove: () => void }) {
  const cls = 'rounded border border-border px-1.5 py-1 text-[11px] leading-none text-text-secondary hover:bg-bg-hover'
  return (
    <div className="flex shrink-0 items-center gap-1">
      <button onClick={onUp} className={cls} title="위로">▲</button>
      <button onClick={onDown} className={cls} title="아래로">▼</button>
      <button onClick={onRemove} className={`${cls} text-text-dim`} title="빼기">✕</button>
    </div>
  )
}
