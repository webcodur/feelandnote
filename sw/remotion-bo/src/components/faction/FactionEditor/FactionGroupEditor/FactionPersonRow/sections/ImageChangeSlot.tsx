import { Trash2 } from '@feelandnote/shared/bo/icons'
import type { FactionImageCrop } from '@/lib/faction-types'
import { imageSrc } from '../../../../shared/timing'
import { MediaThumb, useImageDrop, cropToStyle, FACTION_IMAGE_DND } from '@feelandnote/shared/bo/media'

/** 대사 중 사진 전환 슬롯 — 이미지 풀 DND + 썸네일 + 모달 picker 지원 (quoteImage와 동일 UX) */
export function ImageChangeSlot({
  ic,
  chunkText,
  chunks = [],
  onChunkChange,
  onImageChange,
  onRemove,
  onOpenPicker,
  onFilterChange,
  series,
  episodeName,
  theme,
}: {
  ic: { chunk: number; image: string; crop?: FactionImageCrop; filter?: string }
  chunkText?: string
  chunks?: string[]
  onChunkChange: (chunk: number) => void
  onImageChange: (image: string) => void
  onRemove: () => void
  onOpenPicker: () => void
  onFilterChange?: (filter: string | undefined) => void
  series: string
  episodeName: string
  theme?: { bg: string, text: string, border: string, badgeBg: string, badgeText: string }
}) {
  const icSrc = imageSrc(series, episodeName, ic.image)
  const { dragOver: icDragOver, dropProps: icDropProps } = useImageDrop(FACTION_IMAGE_DND, (path: string) => {
    onImageChange(path)
  })

  return (
    <div className={`flex flex-row w-[280px] shrink-0 rounded border bg-bg-card shadow-sm overflow-hidden ${theme ? theme.border : 'border-border'}`}>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onOpenPicker() }}
        {...icDropProps}
        title="클릭: 사진 선택 · 풀에서 끌어다 놓기: 연결"
        className={`relative aspect-[4/3] w-28 shrink-0 flex items-center justify-center group bg-black/5 border-r ${theme ? theme.border : 'border-border'} ${icDragOver ? 'border-accent ring-2 ring-accent' : ''}`}
      >
        {icSrc ? (
          <MediaThumb
            src={icSrc}
            alt=""
            className="h-full w-full object-cover"
            style={cropToStyle(ic.crop)}
          />
        ) : (
          <span className="text-[10px] text-text-dim">{icDragOver ? '놓기' : '사진 선택'}</span>
        )}
      </button>

      <div className="flex flex-col flex-1 min-w-0">
        <div className={`flex items-center justify-between px-1.5 py-1 border-b ${theme ? `${theme.badgeBg} ${theme.border}` : 'bg-bg-hover border-border'}`}>
          <span className={`text-[10px] font-black ${theme ? theme.badgeText : 'text-text-secondary'}`}>#{ic.chunk + 1} 전환</span>
          <div className="flex items-center gap-1">
            {onFilterChange && (
              <select
                value={ic.filter ?? ''}
                onChange={e => onFilterChange(e.target.value || undefined)}
                onClick={e => e.stopPropagation()}
                className="text-[9px] px-1 py-0.5 rounded border border-border bg-bg-main text-text-secondary hover:border-accent focus:border-accent focus:outline-none"
                title="이미지 필터"
              >
                <option value="">원본</option>
                <option value="vintage">필름</option>
                <option value="sepia">세피아</option>
                <option value="grayscale">흑백</option>
                <option value="duotone">투톤</option>
                <option value="fade">페이드</option>
              </select>
            )}
            {ic.image && (
              <button 
                type="button" 
                onClick={(e) => { e.stopPropagation(); onImageChange('') }} 
                className="text-[10px] text-text-dim hover:text-amber-600 bg-black/5 hover:bg-amber-100 rounded px-1.5 py-0.5 ml-0.5 transition-colors flex items-center justify-center" 
                title="이미지 연결만 해제 (앵커는 유지)"
              >
                △
              </button>
            )}
            <button type="button" onClick={(e) => { e.stopPropagation(); onRemove() }} className="text-text-dim hover:text-danger-text p-0.5 ml-0.5" title="이 전환 앵커를 완전히 삭제">
              <Trash2 size={12} />
            </button>
          </div>
        </div>
        
        <div className="flex flex-col p-1.5 bg-bg-main flex-1 justify-center gap-1">
          <div className="text-[10px] font-bold text-yellow-600 truncate px-1" title={chunkText || '빈 청크'}>
            &quot;{chunkText || '빈 청크'}&quot;
          </div>
          <div className="flex items-center bg-bg-hover rounded px-0.5 py-0.5">
            <select
              value={ic.chunk}
              onChange={(e) => onChunkChange(Number(e.target.value))}
              onClick={(e) => e.stopPropagation()}
              className="w-full rounded border border-border bg-bg-main px-1 py-0.5 text-[10px] focus:border-accent focus:outline-none"
              title="이 대사 구절부터 왼쪽 사진으로 전환"
            >
              {chunks.length > 0 ? chunks.map((c, i) => (
                <option key={i} value={i}>
                  [{i + 1}] {c.trim() ? (c.length > 8 ? c.slice(0, 8) + '…' : c) : '(빈 줄)'}
                </option>
              )) : (
                <option value={0}>[1] (빈 줄)</option>
              )}
            </select>
          </div>
        </div>
      </div>
    </div>
  )
}
