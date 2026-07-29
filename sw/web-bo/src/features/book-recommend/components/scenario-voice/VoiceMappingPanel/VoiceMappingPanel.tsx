'use client'

import { SAVE_SCOPE_LABEL } from './constants'
import { StatusGrid } from './sections/StatusGrid'
import { VoiceFilterBar } from './sections/VoiceFilterBar'
import { VoiceList } from './sections/VoiceList'
import type { SaveScope } from './types'
import { useVoiceMapping } from './useVoiceMapping'

export function VoiceMappingPanel() {
  const {
    locale,
    dbError,
    open,
    setOpen,
    filter,
    setFilter,
    facets,
    activeFacets,
    toggleFacet,
    clearFacets,
    activeFacetCount,
    sortKey,
    setSortKey,
    previewOnly,
    setPreviewOnly,
    totalCount,
    scope,
    setScope,
    savingScope,
    saveStatus,
    voicesLoading,
    voicesError,
    filtered,
    previewingId,
    currentJsonId,
    currentDbId,
    currentJsonName,
    currentDbName,
    mismatch,
    dirty,
    playPreview,
    apply,
  } = useVoiceMapping()

  return (
    <div className="relative border border-border/40 rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-bg-hover"
      >
        <span className={`text-[10px] text-text-dim shrink-0 ${open ? 'rotate-90' : ''}`}>▶</span>
        <span className="text-[11px] font-bold text-text-secondary select-none">인물 보이스</span>
        <span className="text-[10px] text-purple-300/80 font-mono flex-1 truncate ml-1">
          {currentJsonId ? (currentJsonName ?? currentJsonId) : '미배정'}
        </span>
        {mismatch && (
          <span className="text-[10px] text-amber-300/90 shrink-0">DB와 다름</span>
        )}
      </button>

      {open && (
        <div className="border-t border-border bg-bg-card p-3 space-y-3">
          {/* 현황 */}
          <StatusGrid
            locale={locale}
            currentJsonId={currentJsonId}
            currentJsonName={currentJsonName}
            currentDbId={currentDbId}
            currentDbName={currentDbName}
            dbError={dbError}
          />

          {/* 저장 범위 + 검색 */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] text-text-secondary">저장 범위:</span>
            {(['episode', 'db', 'both'] as SaveScope[]).map(s => (
              <button
                key={s}
                type="button"
                onClick={() => setScope(s)}
                className={`px-2 py-0.5 rounded text-[10px] border ${
                  scope === s
                    ? 'bg-purple-500/20 text-purple-200 border-purple-500/60 font-semibold'
                    : 'bg-bg-main border-border text-text-dim hover:text-text-secondary'
                }`}
              >
                {SAVE_SCOPE_LABEL[s]}
              </button>
            ))}
          </div>

          <input
            type="text"
            placeholder="이름·ID·라벨로 검색"
            value={filter}
            onChange={e => setFilter(e.target.value)}
            className="w-full bg-bg-main border border-border rounded px-2 py-1 text-sm focus:outline-none focus:border-accent"
          />

          {/* 필터·정렬 — 성별·나이·억양·언어·용도·분류 묶음 칩 + 정렬 + 미리듣기 토글 */}
          {!voicesLoading && !voicesError && facets.length > 0 && (
            <VoiceFilterBar
              facets={facets}
              activeFacets={activeFacets}
              toggleFacet={toggleFacet}
              clearFacets={clearFacets}
              activeFacetCount={activeFacetCount}
              sortKey={sortKey}
              setSortKey={setSortKey}
              previewOnly={previewOnly}
              setPreviewOnly={setPreviewOnly}
              shownCount={filtered.length}
              totalCount={totalCount}
            />
          )}

          {/* 보이스 목록 */}
          <VoiceList
            voicesLoading={voicesLoading}
            voicesError={voicesError}
            filtered={filtered}
            currentJsonId={currentJsonId}
            currentDbId={currentDbId}
            previewingId={previewingId}
            savingScope={savingScope}
            playPreview={playPreview}
            apply={apply}
          />

          {dirty && (
            <p className="text-[10px] text-amber-300/80">
              에피소드에 다른 미저장 변경이 남아 있습니다. 적용 시 전체 JSON이 함께 저장됩니다.
            </p>
          )}
          {saveStatus && (
            <p className="text-[11px] text-text-secondary">{saveStatus}</p>
          )}
        </div>
      )}
    </div>
  )
}
