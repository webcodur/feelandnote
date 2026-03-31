'use client'

import { DraggableImage } from './ImageThumb'

/** 미배정 이미지 풀 사이드바 — 롱폼/쇼츠 공용 */
export function ImagePool({ images, imageBaseUrl, onDrop, onDelete, onOpenFolder }: {
  images: string[]
  imageBaseUrl: string
  /** 이미지 추가 버튼 클릭 시 (풀에서 직접 추가) */
  onDrop?: (fileName: string) => void
  /** 이미지 삭제 (휴지통) */
  onDelete?: (fileName: string) => void
  /** 폴더 열기 버튼 */
  onOpenFolder?: () => void
}) {
  return (
    <div className="w-[600px] shrink-0 border-l border-border/30 p-3 space-y-2 overflow-y-auto max-h-[90vh] sticky top-0 self-start bg-bg-card/30">
      <div className="flex items-center gap-2 text-[10px] text-text-secondary font-semibold uppercase tracking-wide">
        <span>미배정 {images.length}장</span>
        {onOpenFolder && (
          <button onClick={onOpenFolder} className="text-[10px] text-accent hover:text-accent-hover normal-case font-normal" title="이미지 폴더 열기">
            📂
          </button>
        )}
      </div>
      {images.length > 0 ? (
        <div className="grid grid-cols-2 gap-1.5">
          {images.map(fn => (
            <DraggableImage
              key={fn}
              fileName={fn}
              imageBaseUrl={imageBaseUrl}
              onDrop={() => onDrop?.(fn)}
              onDelete={onDelete ? () => onDelete(fn) : undefined}
            />
          ))}
        </div>
      ) : (
        <div className="text-[10px] text-text-secondary italic">없음</div>
      )}
    </div>
  )
}
