import { facetLabel, facetValueLabel, SORT_LABEL, type SortKey } from '../constants'
import type { Facet } from '../utils'

type Props = {
  facets: Facet[]
  activeFacets: Record<string, string[]>
  toggleFacet: (key: string, value: string) => void
  clearFacets: () => void
  activeFacetCount: number
  sortKey: SortKey
  setSortKey: (k: SortKey) => void
  previewOnly: boolean
  setPreviewOnly: (v: boolean) => void
  shownCount: number
  totalCount: number
}

export function VoiceFilterBar({
  facets,
  activeFacets,
  toggleFacet,
  clearFacets,
  activeFacetCount,
  sortKey,
  setSortKey,
  previewOnly,
  setPreviewOnly,
  shownCount,
  totalCount,
}: Props) {
  return (
    <div className="space-y-2">
      {/* 정렬 · 미리듣기 토글 · 결과 수 · 초기화 */}
      <div className="flex items-center gap-2 flex-wrap text-[11px]">
        <span className="text-text-secondary">정렬</span>
        <select
          value={sortKey}
          onChange={e => setSortKey(e.target.value as SortKey)}
          className="bg-bg-main border border-border rounded px-1.5 py-0.5 text-[11px] focus:outline-none focus:border-accent"
        >
          {(Object.keys(SORT_LABEL) as SortKey[]).map(k => (
            <option key={k} value={k}>{SORT_LABEL[k]}</option>
          ))}
        </select>

        <button
          type="button"
          onClick={() => setPreviewOnly(!previewOnly)}
          className={`px-2 py-0.5 rounded border ${
            previewOnly
              ? 'bg-purple-500/20 text-purple-200 border-purple-500/60 font-semibold'
              : 'bg-bg-main border-border text-text-dim hover:text-text-secondary'
          }`}
        >
          ▶ 미리듣기 있는 것만
        </button>

        <span className="ml-auto text-text-dim">
          {shownCount}
          <span className="opacity-60"> / {totalCount}</span>
        </span>
        {activeFacetCount > 0 && (
          <button
            type="button"
            onClick={clearFacets}
            className="px-2 py-0.5 rounded border border-border text-text-dim hover:text-text-secondary"
          >
            필터 초기화 ({activeFacetCount})
          </button>
        )}
      </div>

      {/* 패싯 칩 묶음 — 성별·나이·억양·언어·용도·분류 등 */}
      {facets.map(f => {
        const sel = activeFacets[f.key] ?? []
        return (
          <div key={f.key} className="flex items-start gap-1.5 flex-wrap">
            <span className="text-[10px] text-text-secondary font-semibold shrink-0 w-10 pt-0.5">
              {facetLabel(f.key)}
            </span>
            <div className="flex items-center gap-1 flex-wrap flex-1">
              {f.values.map(val => {
                const on = sel.includes(val)
                return (
                  <button
                    key={val}
                    type="button"
                    onClick={() => toggleFacet(f.key, val)}
                    className={`px-1.5 py-0.5 rounded text-[10px] border ${
                      on
                        ? 'bg-accent/20 text-accent border-accent/60 font-semibold'
                        : 'bg-bg-main border-border/60 text-text-dim hover:text-text-secondary hover:border-border'
                    }`}
                  >
                    {facetValueLabel(val)}
                  </button>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
