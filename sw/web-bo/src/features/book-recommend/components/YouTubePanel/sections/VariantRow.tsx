import type { YouTubeLink } from '@feelandnote/shared/lib/youtube-meta'
import type { VariantInfo, MetaEntry } from '../types'
import { BTN_SECONDARY, TAG } from '../constants'
import { formatSize } from '../utils'

export function VariantRow({ variant: v, series, name, isOpen, meta, hasOverride, disabled, onToggle, onUpdateMeta, onUpdateLinks, onReset, onUpload }: {
  variant: VariantInfo
  series: string
  name: string
  isOpen: boolean
  meta: MetaEntry | undefined
  hasOverride: boolean
  disabled: boolean
  onToggle: () => void
  onUpdateMeta: (field: 'title' | 'description', value: string) => void
  onUpdateLinks: (links: YouTubeLink[]) => void
  onReset: () => void
  onUpload: () => void
}) {
  const langLabel = v.lang.toUpperCase()
  const typeLabel = v.type === 'longform'
    ? '롱폼'
    : (v.shortsIndex <= 1 ? '쇼츠' : `쇼츠 ${v.shortsIndex}`)
  const baseName = name.endsWith('-en') ? name.slice(0, -3) : name
  const label = baseName.split('-').map(w => w[0].toUpperCase() + w.slice(1)).join('')

  return (
    <div className="rounded bg-bg-main border border-border overflow-hidden">
      {/* 접힌 헤더 */}
      <div className="flex items-center gap-3 p-2 hover:bg-bg-hover">
        <div role="button" tabIndex={0} onClick={onToggle} onKeyDown={e => e.key === 'Enter' && onToggle()}
          className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer">
          <span className="text-text-secondary text-sm font-semibold w-4">{isOpen ? '▾' : '▸'}</span>
          {/* 썸네일 */}
          <div className="w-12 h-8 rounded bg-bg-card overflow-hidden shrink-0 flex items-center justify-center">
            {v.thumb ? (
              <img src={`/api/${series}/youtube/thumb/${label}/${v.lang.toUpperCase()}/${v.thumb.name}`} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-text-secondary text-sm font-semibold">—</span>
            )}
          </div>
          <span className={`${TAG} ${v.lang === 'ko' ? 'bg-blue-900/40 text-blue-400' : 'bg-purple-900/40 text-purple-400'}`}>
            {langLabel}
          </span>
          <span className="font-semibold text-text-primary text-sm">{typeLabel}</span>
          {v.video ? (
            <span className="text-text-secondary text-sm font-semibold">{formatSize(v.video.size)}</span>
          ) : (
            <span className="text-warning-text text-sm font-semibold">렌더 필요</span>
          )}
          {v.srt && <span className={`${TAG} bg-bg-card text-text-secondary`}>SRT</span>}
          {v.thumb && <span className={`${TAG} bg-bg-card text-text-secondary`}>THUMB</span>}
          {hasOverride && <span className={`${TAG} bg-accent/20 text-accent`}>커스텀</span>}
        </div>
        <button
          onClick={onUpload}
          disabled={disabled || !v.video}
          className={`${BTN_SECONDARY} text-sm font-semibold shrink-0 ${disabled || !v.video ? 'opacity-30 cursor-default' : ''}`}
        >업로드</button>
      </div>

      {/* 펼친 편집 영역 */}
      {isOpen && meta && (
        <div className="px-3 pb-3 space-y-2 border-t border-border">
          <div className="pt-2">
            <label className="text-sm font-semibold font-bold text-text-secondary uppercase tracking-wider">제목</label>
            <input
              value={meta.title}
              onChange={e => onUpdateMeta('title', e.target.value)}
              className="w-full bg-bg-card border border-border rounded px-2 py-1 text-sm text-text-primary font-mono mt-0.5"
            />
          </div>
          <div>
            <label className="text-sm font-semibold font-bold text-text-secondary uppercase tracking-wider">설명</label>
            <textarea
              value={meta.description}
              onChange={e => onUpdateMeta('description', e.target.value)}
              rows={v.type === 'longform' ? 16 : 6}
              className="w-full bg-bg-card border border-border rounded px-2 py-1 text-sm font-semibold text-text-primary font-mono mt-0.5 leading-relaxed resize-y"
            />
          </div>
          {/* 링크 편집 */}
          <div>
            <label className="text-sm font-semibold font-bold text-text-secondary uppercase tracking-wider">링크</label>
            <div className="space-y-1 mt-1">
              {(meta.links ?? []).map((link, i) => (
                <div key={i} className="flex items-center gap-1.5">
                  <input
                    value={link.label}
                    onChange={e => {
                      const next = [...meta.links]; next[i] = { ...next[i], label: e.target.value }; onUpdateLinks(next)
                    }}
                    placeholder="라벨"
                    className="w-32 bg-bg-card border border-border rounded px-2 py-0.5 text-sm font-semibold text-text-primary"
                  />
                  <input
                    value={link.url}
                    onChange={e => {
                      const next = [...meta.links]; next[i] = { ...next[i], url: e.target.value }; onUpdateLinks(next)
                    }}
                    placeholder="https://..."
                    className="flex-1 bg-bg-card border border-border rounded px-2 py-0.5 text-sm font-semibold text-text-primary font-mono"
                  />
                  <button onClick={() => { const next = meta.links.filter((_, j) => j !== i); onUpdateLinks(next) }}
                    className="text-red-400 text-sm font-semibold hover:text-red-300 shrink-0 px-1">✕</button>
                </div>
              ))}
              <button
                onClick={() => onUpdateLinks([...(meta.links ?? []), { label: '', url: '' }])}
                className="text-accent text-sm font-semibold hover:underline">
                + 링크 추가
              </button>
            </div>
          </div>
          <div className="flex justify-end">
            <button onClick={onReset} className={`${BTN_SECONDARY} text-sm font-semibold`}>기본값 복원</button>
          </div>
        </div>
      )}
    </div>
  )
}
