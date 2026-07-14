import { Trash2 } from '../../../../shared/icons'
import type { FactionImageCrop } from '@/lib/faction-types'
import { imageSrc, cropToStyle } from '../../../../shared/timing'
import { FactionMediaThumb } from '../../../../shared/FactionMediaThumb'
import { useFactionImageDrop } from '../../../../shared/useFactionImageDrop'

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
}) {
  const icSrc = imageSrc(series, episodeName, ic.image)
  const { dragOver: icDragOver, dropProps: icDropProps } = useFactionImageDrop((path: string) => {
    onImageChange(path)
  })

  return (
    <div className="flex flex-col w-28 shrink-0 rounded border border-border bg-bg-card shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-1.5 py-1 bg-bg-hover border-b border-border">
        <span className="text-[10px] font-black text-text-secondary">#{ic.chunk + 1} 전환</span>
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
          <button type="button" onClick={(e) => { e.stopPropagation(); onRemove() }} className="text-text-dim hover:text-danger-text p-0.5">
            <Trash2 size={12} />
          </button>
        </div>
      </div>
      
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onOpenPicker() }}
        {...icDropProps}
        title="클릭: 사진 선택 · 풀에서 끌어다 놓기: 연결"
        className={`relative aspect-[4/3] w-full flex items-center justify-center group bg-black/5 ${icDragOver ? 'border-accent ring-2 ring-accent' : ''}`}
      >
        {icSrc ? (
          <FactionMediaThumb
            src={icSrc}
            alt=""
            className="h-full w-full object-cover"
            style={cropToStyle(ic.crop)}
          />
        ) : (
          <span className="text-[10px] text-text-dim">{icDragOver ? '놓기' : '사진 선택'}</span>
        )}
      </button>

      <div className="flex flex-col p-1 bg-bg-main border-t border-border">
        <div className="text-[10px] font-bold text-yellow-600 truncate px-1 pb-1">
          &quot;{chunkText || '빈 청크'}&quot;
        </div>
        <div className="flex items-center bg-bg-hover rounded px-0.5 py-0.5 mt-0.5">
          <select
            value={ic.chunk}
            onChange={(e) => onChunkChange(Number(e.target.value))}
            onClick={(e) => e.stopPropagation()}
            className="w-full rounded border border-border bg-bg-main px-1 py-0.5 text-[10px] focus:border-accent focus:outline-none"
            title="이 대사 구절부터 아래 사진으로 전환"
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
  )
}
