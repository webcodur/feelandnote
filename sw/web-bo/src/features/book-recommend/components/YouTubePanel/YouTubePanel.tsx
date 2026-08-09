'use client'

import type { Props } from './types'
import { BTN_PRIMARY, BTN_SECONDARY } from './constants'
import { useYouTubePanel } from './useYouTubePanel'
import { LineupHeader } from './sections/LineupHeader'
import { VariantRow } from './sections/VariantRow'
import { SoloUploadBox } from './sections/SoloUploadBox'

export function YouTubePanel({ series, name }: Props) {
  const {
    status, loading, epKo, epEn,
    dryRun, setDryRun,
    uploadMsg, uploadLog, uploadActive,
    openVariant, setOpenVariant,
    editMeta,
    editingLineup, setEditingLineup,
    lineupDraft, setLineupDraft,
    saving,
    visibleVariantKeys,
    fetchStatus,
    handleUpload, handleCancelUpload, handleSaveMeta,
    handleDbSync, handleResetVariant, handleSaveLineup,
    updateMeta, updateLinks,
  } = useYouTubePanel(series, name)

  // --- 렌더링 ---

  if (loading) return <div className="text-text-secondary text-sm">로딩...</div>
  if (!status) return <div className="text-error-text text-sm">상태 조회 실패</div>

  const { auth, lineup, variants } = status
  const disabled = !auth.ko.authenticated && !auth.en.authenticated
  const hasUploads = Boolean(lineup?.uploads && Object.keys(lineup.uploads).length > 0)

  return (
    <div className="relative space-y-4">
      {/* 인증 + 편성 정보 */}
      <LineupHeader
        auth={auth}
        lineup={lineup}
        editing={editingLineup}
        draft={lineupDraft}
        onEdit={() => {
          setEditingLineup(true)
          setLineupDraft(
            lineup
              ? {
                  ...lineup,
                  shortsRelation: { ko: lineup.shortsRelation?.ko ?? '', en: lineup.shortsRelation?.en ?? '' },
                }
              : { shortsRelation: { ko: '', en: '' } }
          )
        }}
        onCancel={() => setEditingLineup(false)}
        onSave={handleSaveLineup}
        onDraftChange={setLineupDraft}
        onRefresh={fetchStatus}
        saving={saving}
      />

      {(!auth.ko.authenticated || !auth.en.authenticated) && (
        <div className="text-sm font-semibold text-error-text space-y-0.5">
          {!auth.ko.authenticated && <p>KO 채널 미인증 — pnpm youtube:auth</p>}
          {!auth.en.authenticated && <p>EN 채널 미인증 — pnpm youtube:auth -- --channel en</p>}
        </div>
      )}

      {/* Variant 아코디언 — visibleVariantKeys 순서 유지 */}
      <div className="space-y-1">
        {visibleVariantKeys.map((key) => {
          const v = variants.find(x => x.key === key)
          if (!v) return null
          const isOpen = openVariant === key
          const meta = editMeta[key]
          const hasOverride = status.meta?.[key] != null

          return (
            <VariantRow
              key={key}
              variant={v}
              series={series}
              name={name}
              isOpen={isOpen}
              meta={meta}
              hasOverride={hasOverride}
              disabled={disabled}
              onToggle={() => setOpenVariant(isOpen ? null : key)}
              onUpdateMeta={(field, value) => updateMeta(key, field, value)}
              onUpdateLinks={(links) => updateLinks(key, links)}
              onReset={() => handleResetVariant(key)}
              onUpload={() => handleUpload(v.lang, v.type, v.shortsIndex)}
            />
          )
        })}
      </div>

      {/* 1권 모드(SOLO) 업로드 — variant 그리드와 별도 박스 */}
      <SoloUploadBox
        epKo={epKo}
        epEn={epEn}
        disabled={disabled}
        onUpload={(lang, bookIndex) => handleUpload(lang, 'solo', undefined, bookIndex)}
      />

      {/* 하단 액션 바 */}
      <div className="flex items-center gap-2 pt-2 border-t border-border">
        <button onClick={handleSaveMeta} disabled={saving} className={`${BTN_SECONDARY} ${saving ? 'opacity-50' : ''}`}>
          메타 저장
        </button>
        <button onClick={() => handleUpload()} disabled={disabled} className={`${BTN_PRIMARY} ${disabled ? 'opacity-30 cursor-default' : ''}`}>
          전체 업로드
        </button>
        <button onClick={() => handleUpload('ko')} disabled={disabled} className={`${BTN_SECONDARY} ${disabled ? 'opacity-30 cursor-default' : ''}`}>
          KO만
        </button>
        <button onClick={() => handleUpload('en')} disabled={disabled} className={`${BTN_SECONDARY} ${disabled ? 'opacity-30 cursor-default' : ''}`}>
          EN만
        </button>
        <button
          onClick={handleDbSync}
          disabled={!hasUploads}
          title="lineup.json의 uploads를 celebs.youtube_videos(DB)에 반영"
          className={`${BTN_SECONDARY} ${!hasUploads ? 'opacity-30 cursor-default' : ''}`}
        >
          DB 투입
        </button>
        <label className="ml-auto flex items-center gap-1.5 text-sm font-semibold text-text-secondary cursor-pointer select-none">
          <input type="checkbox" checked={dryRun} onChange={e => setDryRun(e.target.checked)} className="accent-accent" />
          드라이런
        </label>
      </div>
      {uploadMsg && (
        <div className="flex items-center gap-2">
          <p className={`text-sm font-semibold ${uploadActive ? 'text-accent animate-pulse' : 'text-text-secondary'}`}>{uploadMsg}</p>
          {uploadActive && (
            <button onClick={handleCancelUpload} className="text-sm font-semibold text-red-400 hover:text-red-300 border border-red-400/40 rounded px-1.5 py-0.5">
              중단
            </button>
          )}
        </div>
      )}
      {uploadLog && uploadLog.length > 0 && (
        <pre className="bg-bg-main border border-border rounded p-2 text-sm font-semibold font-bold font-mono text-text-secondary max-h-48 overflow-y-auto whitespace-pre-wrap">
          {uploadLog.join('\n')}
        </pre>
      )}
    </div>
  )
}
