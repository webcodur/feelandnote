'use client'

/**
 * 원천 독백 보기 — 담화 통합의 고유 이득.
 *
 * 담화 대사는 사람이 이 인물의 (가상) 독백 원문을 읽고 다시 쓴 것이다. 이 화면은 그 원문을
 * 대조용으로 보여줄 뿐, 여기서 고칠 수 없다 — 독백 자체를 고치려면 셀럽 프로필 쪽에서 손대야 한다.
 *
 * 겉모양은 「대사 뽑기」 패널(DiscourseLinesPanel)의 닫기 버튼·배경·스크롤을 본떴다.
 * 화면 오른쪽에 뜨는 점만 다르다(task 지정 — 원고를 보면서 나란히 대조하기 위함).
 */

import { useEffect, useState } from 'react'
import type { Speaker } from '@/lib/discourse-types'
import { X } from '@feelandnote/shared/bo/icons'
import type { EditLang } from '@feelandnote/shared/bo/editor'
import { getSourceMonologues, type SourceMonologue } from '@/actions/admin/discourses/script'

export function SourceMonologuePanel({
  cast, editLang, onClose,
}: {
  cast: Speaker[]
  editLang: EditLang
  onClose: () => void
}) {
  const [items, setItems] = useState<SourceMonologue[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // 이 패널은 열릴 때마다 새로 마운트되므로(부모가 조건부 렌더) items·error 초기값은
    // useState 선언만으로 이미 비어 있다 — 여기서 다시 비울 필요가 없다.
    let cancelled = false
    const slugs = cast.map(c => c.slug).filter((s): s is string => !!s)
    getSourceMonologues(slugs)
      .then(res => { if (!cancelled) setItems(res) })
      .catch(e => { if (!cancelled) setError(e instanceof Error ? e.message : String(e)) })
    return () => { cancelled = true }
  }, [cast])

  const showKo = editLang !== 'en'
  const showEn = editLang !== 'ko'

  return (
    <div className="fixed inset-0 z-50 flex items-stretch justify-end bg-black/60 p-4" onClick={onClose}>
      <div
        className="flex h-full w-full max-w-md flex-col overflow-hidden rounded-xl border border-border bg-bg-main shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div>
            <h2 className="text-sm font-bold">원천 독백</h2>
            <p className="text-[11px] text-text-dim">
              담화 대사는 이 인물의 글을 사람이 읽고 다시 쓴 것입니다. 여기서는 고칠 수 없습니다.
            </p>
          </div>
          <button onClick={onClose} className="rounded p-1 text-text-secondary hover:bg-bg-hover hover:text-accent" title="닫기">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          {error && <p className="text-xs text-danger-text">원천 독백을 불러오지 못했습니다 — {error}</p>}
          {!error && !items && <p className="text-xs text-text-dim">불러오는 중...</p>}
          {!error && items && items.length === 0 && (
            <p className="text-xs text-text-dim">등장 인물 중 셀럽 DB에 연결된 인물이 없습니다.</p>
          )}
          {!error && items?.map(m => (
            <section key={m.slug} className="space-y-2 rounded-lg border border-border bg-bg-card/40 p-3">
              <h3 className="text-xs font-bold text-text-primary">{m.name}</h3>
              {showKo && (
                <div>
                  <p className="mb-1 text-[10px] font-semibold text-text-dim">한국어</p>
                  <p className="whitespace-pre-wrap text-xs leading-relaxed text-text-secondary">
                    {m.monologue?.trim() || '원천 독백이 아직 없습니다.'}
                  </p>
                </div>
              )}
              {showEn && (
                <div>
                  <p className="mb-1 text-[10px] font-semibold text-text-dim">영문</p>
                  <p className="whitespace-pre-wrap text-xs leading-relaxed text-text-secondary">
                    {m.monologueEn?.trim() || '원천 독백이 아직 없습니다.'}
                  </p>
                </div>
              )}
            </section>
          ))}
        </div>
      </div>
    </div>
  )
}
