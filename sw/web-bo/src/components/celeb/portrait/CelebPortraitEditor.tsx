'use client'

import Image from 'next/image'
import { useRef, useState, type DragEvent, type ReactNode } from 'react'
import { ImagePlus, Loader2, Move, Upload, X } from 'lucide-react'
import { createPreviewUrl } from '@/lib/image'
import ImageCropModal from '@/components/ui/ImageCropModal'

interface Props {
  value?: string | null
  alt: string
  className?: string
  empty?: ReactNode
  compact?: boolean
  onCroppedFile: (file: File, previewUrl: string) => void | Promise<void>
  onRemove?: () => void
  onFileAccepted?: () => void
  onError?: (error: Error) => void
}

const IMAGE_ONLY_ERROR = new Error('이미지 파일만 업로드 가능합니다.')

export default function CelebPortraitEditor({
  value,
  alt,
  className = 'group/portrait relative aspect-square w-[260px] shrink-0 overflow-hidden rounded-xl border-2 border-dashed border-border bg-bg-secondary hover:border-accent hover:bg-accent/5 data-[dragging=true]:border-accent data-[dragging=true]:bg-accent/10 data-[dragging=true]:ring-2 data-[dragging=true]:ring-accent/30',
  empty,
  compact = false,
  onCroppedFile,
  onRemove,
  onFileAccepted,
  onError,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null)
  const [processing, setProcessing] = useState(false)

  async function acceptFile(file?: File) {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      onError?.(IMAGE_ONLY_ERROR)
      return
    }

    onFileAccepted?.()
    setCropImageSrc(await createPreviewUrl(file))
  }

  function handleDragLeave(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    event.stopPropagation()
    const nextTarget = event.relatedTarget as Node | null
    if (nextTarget && event.currentTarget.contains(nextTarget)) return
    setDragging(false)
  }

  async function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    event.stopPropagation()
    setDragging(false)
    await acceptFile(event.dataTransfer.files?.[0])
  }

  async function handleCropComplete(croppedDataUrl: string) {
    setProcessing(true)
    try {
      const response = await fetch(croppedDataUrl)
      const blob = await response.blob()
      const file = new File([blob], 'portrait.png', { type: 'image/png' })
      await onCroppedFile(file, croppedDataUrl)
      setCropImageSrc(null)
    } catch (error) {
      onError?.(error instanceof Error ? error : new Error('대표 화보 처리에 실패했습니다.'))
    } finally {
      setProcessing(false)
    }
  }

  return (
    <>
      <div
        data-dragging={dragging || undefined}
        onDragEnter={(event) => {
          event.preventDefault()
          event.stopPropagation()
          setDragging(true)
        }}
        onDragOver={(event) => {
          event.preventDefault()
          event.stopPropagation()
        }}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={className}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          onChange={async (event) => {
            await acceptFile(event.target.files?.[0])
            event.target.value = ''
          }}
          className="hidden"
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          aria-label={`${alt} 선택`}
          title="클릭하거나 이미지를 끌어다 놓아 대표 화보 편집"
          className="absolute inset-0 z-10 cursor-pointer rounded-[inherit]"
        />

        {value ? (
          <Image src={value} alt={alt} fill unoptimized className="object-cover" />
        ) : empty ? (
          <div className="flex h-full w-full items-center justify-center">{empty}</div>
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-text-secondary">
            <div className="rounded-full border border-border bg-bg-card p-3">
              <Upload className="h-5 w-5" />
            </div>
            <span className="text-xs font-medium text-text-primary">대표 화보 놓기</span>
            <span className="text-[10px]">1:1 · 위치와 확대 조정</span>
          </div>
        )}

        {value && (
          <div className="pointer-events-none absolute inset-0 z-20 flex flex-col items-center justify-center gap-2 bg-black/55 text-white opacity-0 transition-opacity duration-150 group-hover/portrait:opacity-100">
            <ImagePlus className="h-5 w-5" />
            {!compact && <span className="text-xs font-medium">교체하고 위치 조정</span>}
          </div>
        )}

        {dragging && (
          <div className={`pointer-events-none absolute z-30 flex flex-col items-center justify-center rounded-lg border border-accent bg-bg-card/95 text-accent ${compact ? 'inset-1' : 'inset-3 gap-2'}`}>
            <Move className={compact ? 'h-5 w-5' : 'h-6 w-6'} />
            {!compact && <span className="text-xs font-semibold">놓아서 위치 편집</span>}
          </div>
        )}

        {processing && (
          <div className="pointer-events-none absolute inset-0 z-40 flex items-center justify-center bg-black/70">
            <Loader2 className="h-6 w-6 animate-spin text-accent" />
          </div>
        )}

        {value && onRemove && !processing && (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation()
              onRemove()
            }}
            aria-label={`${alt} 제거`}
            className="absolute end-2 top-2 z-40 rounded-full bg-black/70 p-1.5 text-white hover:bg-red-600"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {cropImageSrc && (
        <ImageCropModal
          imageSrc={cropImageSrc}
          aspectRatio={1}
          cropShape="rect"
          enableAutoCrop={false}
          restrictPosition
          title="대표 화보 위치 조정"
          description="사진을 끌어 위치를 옮기고 아래 막대로 확대하세요."
          onComplete={handleCropComplete}
          onCancel={() => setCropImageSrc(null)}
        />
      )}
    </>
  )
}
