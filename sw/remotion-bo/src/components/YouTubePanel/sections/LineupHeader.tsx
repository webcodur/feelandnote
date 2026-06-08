import type { EpisodeMeta } from '@feelandnote/shared/lib/youtube-meta'
import type { ChannelAuth } from '../types'
import { BTN_PRIMARY, BTN_SECONDARY } from '../constants'

export function LineupHeader({ auth, lineup, editing, draft, onEdit, onCancel, onSave, onDraftChange, onRefresh, saving }: {
  auth: { ko: ChannelAuth; en: ChannelAuth }
  lineup: EpisodeMeta | null
  editing: boolean
  draft: EpisodeMeta | null
  onEdit: () => void
  onCancel: () => void
  onSave: () => void
  onDraftChange: (d: EpisodeMeta) => void
  onRefresh: () => void
  saving: boolean
}) {
  if (editing && draft) {
    const relKo = draft.shortsRelation?.ko ?? ''
    const relEn = draft.shortsRelation?.en ?? ''
    return (
      <div className="space-y-2 p-2 rounded bg-bg-main border border-accent/40">
        <div className="flex items-center gap-2 text-sm">
          <label className="text-text-secondary w-24 shrink-0">쇼츠 수식어(KO)</label>
          <input
            value={relKo}
            onChange={e => onDraftChange({ ...draft, shortsRelation: { ko: e.target.value, en: relEn } })}
            placeholder="예: 인생책"
            className="flex-1 bg-bg-card border border-border rounded px-2 py-0.5 text-sm text-text-primary"
          />
        </div>
        <div className="flex items-center gap-2 text-sm">
          <label className="text-text-secondary w-24 shrink-0">쇼츠 수식어(EN)</label>
          <input
            value={relEn}
            onChange={e => onDraftChange({ ...draft, shortsRelation: { ko: relKo, en: e.target.value } })}
            placeholder="e.g. lifelong favorite"
            className="flex-1 bg-bg-card border border-border rounded px-2 py-0.5 text-sm text-text-primary"
          />
        </div>
        <div className="flex gap-2">
          <button onClick={onSave} disabled={saving} className={`${BTN_PRIMARY} text-sm font-semibold ${saving ? 'opacity-50' : ''}`}>저장</button>
          <button onClick={onCancel} className={`${BTN_SECONDARY} text-sm font-semibold`}>취소</button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-3 text-sm">
        <span className="flex items-center gap-1.5">
          <span className={`w-2 h-2 rounded-full ${auth.ko.authenticated ? 'bg-green-500' : 'bg-red-500'}`} />
          KO
        </span>
        <span className="flex items-center gap-1.5">
          <span className={`w-2 h-2 rounded-full ${auth.en.authenticated ? 'bg-green-500' : 'bg-red-500'}`} />
          EN
        </span>
        {lineup ? (
          <>
            <button onClick={onEdit} className="text-text-secondary hover:text-accent text-sm font-semibold">[수정]</button>
          </>
        ) : (
          <>
            <span className="text-warning-text text-sm font-semibold">편성표 미등록</span>
            <button onClick={onEdit} className="text-accent text-sm font-semibold hover:underline">[등록]</button>
          </>
        )}
        <button onClick={onRefresh} className="ml-auto text-text-secondary hover:text-text-primary text-sm font-semibold">새로고침</button>
      </div>
      {lineup && (
        <div className="text-sm font-semibold text-text-secondary space-y-0.5">
          <div>쇼츠 수식어(KO): {lineup.shortsRelation?.ko ?? ''}</div>
          <div>쇼츠 수식어(EN): {lineup.shortsRelation?.en ?? ''}</div>
        </div>
      )}
    </div>
  )
}
