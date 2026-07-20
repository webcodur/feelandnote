'use client'

/**
 * 롱폼 배치 — 편 경계·장 표지·기준점.
 *
 * 담화는 발언 순서가 곧 영상 순서라 팩션처럼 블록을 재배치할 일이 없다. 여기서 정하는 것은 두 가지다.
 * - 기준점({turn:n})은 "앞선 발언 n개까지"를 가리키는 자리표다. 경계·표지는 그 자리에 걸린다.
 * - 편 경계({cut})를 꽂으면 그 지점에서 롱폼이 여러 편으로 갈라진다.
 * - 장 표지({era})는 그 자리에 문구 카드 한 장을 끼운다.
 */

import type { DiscourseScript, DiscourseLongformItem } from '@/lib/discourse-types'
import { ChevronUp, ChevronDown, Trash2, Plus } from '@/components/faction/shared/icons'
import { longformPartNumbers, splitName } from '../../shared/timing'
import type { EditLang } from '../../shared/editLang'

type Props = {
  script: DiscourseScript
  update: (patch: Partial<DiscourseScript>) => void
  editLang: EditLang
}

export function DiscourseLongformPanel({ script, update, editLang }: Props) {
  const layout = script.longformLayout ?? []
  const turnCount = (script.turns ?? []).length
  const parts = longformPartNumbers(script)

  const setLayout = (next: DiscourseLongformItem[]) =>
    update({ longformLayout: next.length ? next : undefined })

  const setItem = (i: number, item: DiscourseLongformItem) => setLayout(layout.map((x, idx) => (idx === i ? item : x)))
  const add = (item: DiscourseLongformItem) => setLayout([...layout, item])
  const remove = (i: number) => setLayout(layout.filter((_, idx) => idx !== i))
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir
    if (j < 0 || j >= layout.length) return
    const next = [...layout]
    ;[next[i], next[j]] = [next[j], next[i]]
    setLayout(next)
  }

  // 각 칸이 걸리는 발언 자리 — 앞선 기준점이 정한다
  const cursorAt = (i: number): number => {
    let cursor = 0
    for (let k = 0; k < i; k++) {
      const it = layout[k]
      if ('turn' in it) cursor = it.turn
    }
    return cursor
  }

  return (
    <section className="space-y-2 rounded-lg border border-border bg-bg-card/40 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-xs font-semibold text-text-secondary">롱폼 배치</h2>
        <span className="text-[11px] text-text-dim">
          {parts.length > 1 ? `롱폼이 ${parts.length}편으로 갈라집니다` : '경계가 없어 통짜 한 편입니다'}
        </span>
        <span className="ms-auto flex items-center gap-1.5">
          <button onClick={() => add({ turn: turnCount })} className="flex items-center gap-1 rounded-md border border-border bg-bg-card px-2 py-1 text-[11px] font-semibold text-text-secondary hover:border-accent hover:text-accent">
            <Plus size={12} /> 기준점
          </button>
          <button onClick={() => add({ era: { label: '' } })} className="flex items-center gap-1 rounded-md border border-border bg-bg-card px-2 py-1 text-[11px] font-semibold text-text-secondary hover:border-accent hover:text-accent">
            <Plus size={12} /> 장 표지
          </button>
          <button onClick={() => add({ cut: true })} className="flex items-center gap-1 rounded-md border border-border bg-bg-card px-2 py-1 text-[11px] font-semibold text-text-secondary hover:border-accent hover:text-accent">
            <Plus size={12} /> 편 경계
          </button>
        </span>
      </div>

      {layout.length === 0 && (
        <p className="text-[11px] text-text-dim">
          비어 있습니다. 발언 순서 그대로 한 편이 나갑니다. 중간에 문구 카드를 끼우거나 편을 가르려면 위 단추를 쓰세요.
        </p>
      )}

      <div className="space-y-1.5">
        {layout.map((it, i) => {
          const cursor = cursorAt(i)
          const at = cursor >= turnCount ? '맨 뒤' : `${cursor + 1}번 발언 앞`
          return (
            <div key={i} className="flex items-center gap-2 rounded-md border border-border bg-bg-card p-2">
              <span className="w-5 shrink-0 text-center font-mono text-[10px] text-text-dim">{i + 1}</span>

              {'turn' in it && (
                <span className="flex min-w-0 flex-1 items-center gap-1.5 text-xs text-text-dim">
                  <span className="shrink-0 rounded bg-bg-secondary px-1.5 py-0.5 text-[10px] font-semibold text-text-secondary">기준점</span>
                  앞선 발언
                  <input
                    type="number" min={0} max={turnCount} value={it.turn}
                    onChange={e => setItem(i, { turn: Math.max(0, Math.min(turnCount, Number(e.target.value) || 0)) })}
                    className="w-16 rounded-md border border-border bg-bg-card px-2 py-1 text-xs focus:border-accent focus:outline-none"
                  />
                  개까지 — 아래 칸들이 {it.turn >= turnCount ? '맨 뒤' : `${it.turn + 1}번 발언 앞`}에 걸립니다
                </span>
              )}

              {'cut' in it && (
                <span className="flex min-w-0 flex-1 items-center gap-1.5 text-xs text-accent">
                  <span className="shrink-0 rounded bg-accent/15 px-1.5 py-0.5 text-[10px] font-semibold">편 경계</span>
                  여기서 롱폼이 다음 편으로 갈라집니다 ({at})
                </span>
              )}

              {'era' in it && (
                <span className="flex min-w-0 flex-1 items-center gap-1.5">
                  <span className="shrink-0 rounded bg-warning px-1.5 py-0.5 text-[10px] font-semibold text-warning-text" title={`${at}에 문구 카드 한 장이 끼워집니다`}>장 표지</span>
                  {editLang !== 'en' && (
                    <textarea
                      rows={2} value={it.era.label}
                      placeholder={'문구\n첫 줄=앞부분, 둘째 줄부터=뒷부분'}
                      onChange={e => setItem(i, { era: { ...it.era, label: e.target.value } })}
                      className="min-w-0 flex-1 resize-y rounded-md border border-border bg-bg-card px-2 py-1 text-xs focus:border-accent focus:outline-none"
                    />
                  )}
                  {editLang !== 'ko' && (
                    <textarea
                      rows={2} value={it.era.labelEn ?? ''}
                      placeholder="EN"
                      onChange={e => setItem(i, { era: { ...it.era, labelEn: e.target.value || undefined } })}
                      className="min-w-0 flex-1 resize-y rounded-md border border-border/60 bg-bg-card/50 px-2 py-1 text-xs text-text-secondary focus:border-accent focus:outline-none"
                    />
                  )}
                  <span className="w-24 shrink-0 truncate text-[10px] text-text-dim" title={at}>{at}</span>
                </span>
              )}

              <span className="flex shrink-0 items-center gap-0.5">
                <button onClick={() => move(i, -1)} disabled={i === 0} className="rounded p-1 text-text-secondary hover:bg-bg-hover hover:text-accent disabled:opacity-30" title="위로">
                  <ChevronUp size={13} />
                </button>
                <button onClick={() => move(i, 1)} disabled={i === layout.length - 1} className="rounded p-1 text-text-secondary hover:bg-bg-hover hover:text-accent disabled:opacity-30" title="아래로">
                  <ChevronDown size={13} />
                </button>
                <button onClick={() => remove(i)} className="rounded p-1 text-danger-text hover:bg-danger" title="이 칸 지우기">
                  <Trash2 size={13} />
                </button>
              </span>
            </div>
          )
        })}
      </div>

      {/* 편별 명칭 — 편이 갈릴 때만 */}
      {parts.length > 1 && (
        <div className="space-y-1.5 border-t border-border pt-2">
          <div className="text-[11px] font-semibold text-text-secondary">롱폼 편별 영상 명칭 (비우면 공통 명칭)</div>
          {parts.map(p => {
            const v = script.titleByLvPart?.[p] ?? ''
            const { head } = splitName(v)
            return (
              <div key={p} className="flex items-start gap-2">
                <label className="mt-1.5 w-14 shrink-0 text-xs text-text-dim">{p}편 -</label>
                <textarea
                  rows={2} value={v}
                  placeholder={head || '이 편만의 영상 명칭'}
                  onChange={e => {
                    const next = { ...(script.titleByLvPart ?? {}) }
                    if (e.target.value.trim()) next[p] = e.target.value
                    else delete next[p]
                    update({ titleByLvPart: Object.keys(next).length ? next : undefined })
                  }}
                  className="min-w-0 flex-1 resize-y rounded-md border border-border bg-bg-card px-2 py-1 text-xs focus:border-accent focus:outline-none"
                />
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
