'use client'

/**
 * 발언 원문 모아보기 — 이 담화에서 인물이 **실제로 한 말**과 그 출처를 한 화면에서 관리한다.
 *
 * 원문은 담화 전체를 놓고 한꺼번에 정리하는 자료라, 발언 하나하나의 설정 폼에 끼워 넣지 않는다
 * (26.07.27 유저 지시 — 매 단락마다 박지 말고 따로 떼어 둘 것).
 *
 * 화면에서 큰따옴표 안은 인물이 실제로 한 말이다. 재구성 대사에는 따옴표를 쓰지 않는다 —
 * 그래서 원문을 적어 두면 그 발언이 사료로 승격되고, 출처가 비면 그 사실을 여기서 한눈에 잡는다.
 */

import { useState } from 'react'
import type { Speaker, Turn } from '@/lib/discourse-types'
import { X } from '@feelandnote/shared/bo/icons'
import { castColorOf } from './sections/CastColorBar'

const orUndef = (v: string) => (v.trim() ? v : undefined)

type Props = {
  cast: Speaker[]
  turns: Turn[]
  setTurn: (index: number, next: Turn) => void
  onClose: () => void
}

export function TurnOriginPanel({ cast, turns, setTurn, onClose }: Props) {
  /** 원문이 적힌 발언만 보기 — 정리하다 보면 적은 것만 훑고 싶어진다 */
  const [onlyFilled, setOnlyFilled] = useState(false)

  const filled = turns.filter(t => t.origin?.trim()).length
  const missingRef = turns.filter(t => t.origin?.trim() && !t.originRef?.trim()).length
  const rows = turns.map((turn, i) => ({ turn, i })).filter(({ turn }) => !onlyFilled || turn.origin?.trim())

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="flex max-h-full w-full max-w-3xl flex-col overflow-hidden rounded-lg border border-border bg-bg-card shadow-xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold">발언 원문 · 출처</h2>
          <span className="text-[11px] text-text-dim">
            {filled}/{turns.length}개 적힘
            {missingRef > 0 && <span className="ms-1.5 font-bold text-warning-text">· 출처 없는 원문 {missingRef}개</span>}
          </span>
          <label className="ms-auto flex items-center gap-1.5 text-[11px] text-text-secondary">
            <input type="checkbox" checked={onlyFilled} onChange={e => setOnlyFilled(e.target.checked)} />
            적힌 것만
          </label>
          <button onClick={onClose} className="rounded p-1 text-text-secondary hover:bg-bg-hover hover:text-accent" title="닫기">
            <X size={16} />
          </button>
        </div>

        <p className="border-b border-border bg-bg-main/40 px-4 py-2 text-[11px] leading-relaxed text-text-dim">
          영상에서 큰따옴표 안은 인물이 실제로 한 말입니다. 재구성 대사에는 따옴표를 쓰지 않으니, 사료가 있는 발언만 여기에 적습니다.
        </p>

        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
          {rows.map(({ turn, i }) => {
            const speaker = cast[turn.cast]
            const color = castColorOf(speaker, turn.cast)
            const hasOrigin = !!turn.origin?.trim()
            return (
              <div
                key={i}
                className="space-y-1.5 rounded-md border border-border bg-bg-main/40 p-2.5"
                style={{ borderInlineStartWidth: 4, borderInlineStartColor: color }}
              >
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold" style={{ color }}>{i + 1}. {speaker?.name || '?'}</span>
                  {hasOrigin && !turn.originRef?.trim() && (
                    <span className="rounded bg-warning/20 px-1.5 py-0.5 text-[10px] font-bold text-warning-text">출처 없음</span>
                  )}
                </div>

                {/* 영상에 나가는 대사 — 대조용이라 여기서는 고치지 않는다 */}
                <p className="line-clamp-2 rounded bg-bg-card px-2 py-1 text-[11px] leading-snug text-text-secondary" title={turn.text}>
                  {turn.text || '(대사 없음)'}
                </p>

                <textarea
                  rows={2}
                  value={turn.origin ?? ''}
                  placeholder="인물이 실제로 한 말 그대로. 재구성이면 비워 두세요"
                  onChange={e => setTurn(i, { ...turn, origin: orUndef(e.target.value) })}
                  className="w-full resize-y rounded-md border border-border bg-bg-card px-2 py-1.5 text-xs focus:border-accent focus:outline-none"
                />
                <input
                  value={turn.originRef ?? ''}
                  placeholder="출처 — X, 2024-03-01 / 사기 진시황본기"
                  onChange={e => setTurn(i, { ...turn, originRef: orUndef(e.target.value) })}
                  className="w-full rounded-md border border-border bg-bg-card px-2 py-1.5 text-xs focus:border-accent focus:outline-none"
                />
              </div>
            )
          })}

          {rows.length === 0 && (
            <p className="p-4 text-center text-xs text-text-dim">
              {onlyFilled ? '원문이 적힌 발언이 아직 없습니다.' : '아직 발언이 없습니다.'}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
