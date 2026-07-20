'use client'

/**
 * 대사 뽑기 — 인물을 번호로 매기고, 발언을 순서대로 「번호: 대사」로 펼쳐 보여준다.
 *
 * 밖에서(GPT 등) 대사를 편하게 손보라고 만든 출력 전용 통로다. 붙여넣어 되돌리는 기능은 없다 —
 * 여기서 뽑은 글은 사람이 읽고 고치는 초안이고, 실제 반영은 발언 목록에서 직접 한다.
 *
 * 예:
 *   1은 일론 머스크
 *   2는 샘 알트만
 *
 *   1: 이봐 샘. 우리 같은 방에서 시작했잖아.
 *   2: 일론. 그 질문은 먼저 당신이 받아야 합니다.
 *   1: 구조를 논의한 거하고 명분을 버린 건 다르다.
 */

import { useMemo, useState } from 'react'
import type { Speaker, Turn } from '@/lib/discourse-types'
import { X, Copy } from '@/components/faction/shared/icons'
import { splitName } from '../shared/timing'
import type { EditLang } from '../shared/editLang'

/** 인물 표기 — 통합 명칭이면 앞부분만, 없으면 번호 */
const nameOf = (s: Speaker, i: number) => splitName(s.name).head || s.name?.trim() || `${i + 1}번`

/** 숫자 뒤 은/는 — 한글 발음 끝소리 받침으로 가른다(일=ㄹ→은, 이→는 …). 인물은 소수라 1~10이면 충분 */
const JOSA_EUN: Record<number, boolean> = { 1: true, 2: false, 3: true, 4: false, 5: false, 6: true, 7: true, 8: true, 9: false, 10: true }
const eunNeun = (n: number) => (JOSA_EUN[n] ?? true) ? '은' : '는'

export function DiscourseLinesPanel({
  cast, turns, editLang, onClose,
}: {
  cast: Speaker[]
  turns: Turn[]
  editLang: EditLang
  onClose: () => void
}) {
  const isEn = editLang === 'en'
  const text = useMemo(() => {
    const roster = cast.map((s, i) => `${i + 1}${eunNeun(i + 1)} ${nameOf(s, i)}`).join('\n')
    const lines = turns
      .map(t => `${t.cast + 1}: ${((isEn ? t.textEn : t.text) ?? '').trim()}`)
      .join('\n')
    return `${roster}\n\n${lines}`
  }, [cast, turns, isEn])

  const [copied, setCopied] = useState(false)
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch { /* 클립보드 거부 — 사용자가 직접 선택 복사 */ }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        className="flex max-h-[88vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-border bg-bg-main shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div>
            <h2 className="text-sm font-bold">대사 뽑기{isEn ? ' (영문)' : ''}</h2>
            <p className="text-[11px] text-text-dim">인물은 번호로, 발언은 순서대로 펼칩니다. 밖에서 고치기 편한 초안입니다.</p>
          </div>
          <button onClick={onClose} className="rounded p-1 text-text-secondary hover:bg-bg-hover hover:text-accent" title="닫기">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 space-y-2 overflow-y-auto p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-text-secondary">인물 {cast.length}명 · 발언 {turns.length}개</span>
            <button
              onClick={copy}
              className="flex items-center gap-1.5 rounded-md border border-border bg-bg-card px-2.5 py-1 text-xs font-semibold text-text-secondary hover:border-accent hover:text-accent"
            >
              <Copy size={13} /> {copied ? '복사됨' : '전체 복사'}
            </button>
          </div>
          <textarea
            readOnly
            value={text}
            onFocus={e => e.currentTarget.select()}
            className="h-[56vh] w-full resize-none rounded-md border border-border bg-bg-card/60 p-3 font-mono text-xs leading-relaxed text-text-secondary focus:border-accent focus:outline-none"
          />
        </div>
      </div>
    </div>
  )
}
