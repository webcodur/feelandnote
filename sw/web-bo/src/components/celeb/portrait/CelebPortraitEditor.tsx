'use client'

import Image from 'next/image'
import { useState, type DragEvent, type ReactNode } from 'react'
import { Loader2, Move, Upload, X } from 'lucide-react'
import { CELEB_HERO_PHOTO_SPEC } from '@feelandnote/shared/constants/celeb-hero-photo'
import { useImageIntake } from '@/components/celeb/useImageIntake'
import ImageCropModal from '@/components/ui/ImageCropModal'

interface Props {
  value?: string | null
  alt: string
  className?: string
  empty?: ReactNode
  compact?: boolean
  openOnClick?: boolean
  loadImmediately?: boolean
  highPriority?: boolean
  pasteActive?: boolean
  /** 바깥에서 밀어넣은 사진. 값이 바뀌면 곧바로 위치 조정 창이 열린다. */
  incomingFile?: File | null
  /** 밀어넣은 사진의 위치 조정 창이 닫혔을 때(저장·취소·열기 실패) 알린다. */
  onIncomingDone?: () => void
  /** 파일이 아닌 경로를 전달하는 외부 드래그 소스의 MIME 형식. */
  externalDropType?: string
  /** 외부 드래그 소스에서 받은 값을 사진 파일로 받아들이는 호출부에 넘긴다. */
  onExternalDrop?: (value: string) => void | Promise<void>
  onActivate?: () => void
  onCroppedFile: (file: File, previewUrl: string) => void | Promise<void>
  onRemove?: () => void
  onFileAccepted?: () => void
  onError?: (error: Error) => void
  aspectRatio?: number
  aspectLabel?: string
  emptyLabel?: string
  cropTitle?: string
  cropDescription?: string
  processingErrorMessage?: string
}

export default function CelebPortraitEditor({
  value,
  alt,
  className,
  empty,
  compact = false,
  openOnClick = false,
  loadImmediately = false,
  highPriority = false,
  pasteActive = false,
  incomingFile = null,
  onIncomingDone,
  externalDropType,
  onExternalDrop,
  onActivate,
  onCroppedFile,
  onRemove,
  onFileAccepted,
  onError,
  aspectRatio = CELEB_HERO_PHOTO_SPEC.aspectRatio,
  aspectLabel = CELEB_HERO_PHOTO_SPEC.aspectLabel,
  emptyLabel = '대표 화보 놓기',
  cropTitle = '대표 화보 위치 조정',
  cropDescription = '사진을 끌어 위치를 옮기고 아래 막대로 확대하세요.',
  processingErrorMessage = '대표 화보 처리에 실패했습니다.',
}: Props) {
  const usesDefaultFrame = className === undefined
  const frameClassName = className ?? 'group/portrait relative shrink-0 overflow-hidden rounded-xl border-2 border-dashed border-border bg-bg-secondary hover:border-accent hover:bg-accent/5 data-[dragging=true]:border-accent data-[dragging=true]:bg-accent/10 data-[dragging=true]:ring-2 data-[dragging=true]:ring-accent/30'
  const [dragging, setDragging] = useState(false)
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null)
  const [processing, setProcessing] = useState(false)

  const { acceptFile } = useImageIntake({
    onPreviewReady: setCropImageSrc,
    pasteActive,
    incomingFile,
    onIncomingDone,
    onFileAccepted: onFileAccepted && (() => onFileAccepted()),
    onError,
  })

  function acceptsDrag(event: DragEvent<HTMLDivElement>): boolean {
    return event.dataTransfer.types.includes('Files')
      || (!!externalDropType && event.dataTransfer.types.includes(externalDropType))
  }

  function handleDragLeave(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    event.stopPropagation()
    const nextTarget = event.relatedTarget as Node | null
    if (nextTarget && event.currentTarget.contains(nextTarget)) return
    setDragging(false)
  }

  async function handleDrop(event: DragEvent<HTMLDivElement>) {
    if (!acceptsDrag(event)) return
    event.preventDefault()
    event.stopPropagation()
    setDragging(false)
    const externalValue = externalDropType
      ? event.dataTransfer.getData(externalDropType)
      : ''
    if (externalValue && onExternalDrop) {
      try {
        await onExternalDrop(externalValue)
      } catch (error) {
        onError?.(error instanceof Error ? error : new Error('사진을 불러오지 못했습니다.'))
      }
      return
    }
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
      onError?.(error instanceof Error ? error : new Error(processingErrorMessage))
    } finally {
      setProcessing(false)
      onIncomingDone?.()
    }
  }

  return (
    <>
      <div
        data-dragging={dragging || undefined}
        role={onActivate ? 'button' : undefined}
        tabIndex={onActivate ? 0 : undefined}
        aria-pressed={onActivate ? pasteActive : undefined}
        aria-label={onActivate ? `${alt} 붙여넣기 대상 선택` : undefined}
        onClick={onActivate}
        onKeyDown={onActivate ? (event) => {
          if (event.key !== 'Enter' && event.key !== ' ') return
          event.preventDefault()
          onActivate()
        } : undefined}
        onDragEnter={(event) => {
          if (!acceptsDrag(event)) return
          event.preventDefault()
          event.stopPropagation()
          setDragging(true)
        }}
        onDragOver={(event) => {
          if (!acceptsDrag(event)) return
          event.preventDefault()
          event.stopPropagation()
          event.dataTransfer.dropEffect = 'copy'
        }}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`${frameClassName} ${pasteActive ? 'border-accent ring-2 ring-accent ring-offset-2 ring-offset-bg-card' : ''} ${onActivate ? 'cursor-pointer' : ''}`}
        style={usesDefaultFrame ? {
          width: CELEB_HERO_PHOTO_SPEC.desktopWidthPx,
          aspectRatio,
        } : undefined}
      >
        {value ? openOnClick ? (
          <a
            href={value}
            target="_blank"
            rel="noreferrer"
            onClick={onActivate ? (event) => event.preventDefault() : undefined}
            aria-label={`${alt} 원본 이미지 새 탭에서 열기`}
            className="absolute inset-0 z-10 cursor-pointer"
          >
            <Image
              src={value}
              alt={alt}
              fill
              unoptimized
              loading={loadImmediately ? 'eager' : 'lazy'}
              fetchPriority={highPriority ? 'high' : 'auto'}
              className="object-cover"
            />
          </a>
        ) : (
          <Image
            src={value}
            alt={alt}
            fill
            unoptimized
            loading={loadImmediately ? 'eager' : 'lazy'}
            fetchPriority={highPriority ? 'high' : 'auto'}
            className="object-cover"
          />
        ) : empty ? (
          <div className="flex h-full w-full items-center justify-center">{empty}</div>
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-text-secondary">
            <div className="rounded-full border border-border bg-bg-card p-3">
              <Upload className="h-5 w-5" />
            </div>
            <span className="text-xs font-medium text-text-primary">{emptyLabel}</span>
            <span className="text-[10px]">{aspectLabel} · 위치와 확대 조정</span>
          </div>
        )}

        {value && !openOnClick && (
          <div className="pointer-events-none absolute inset-0 z-20 flex flex-col items-center justify-center gap-2 bg-black/55 text-white opacity-0 group-hover/portrait:opacity-100">
            <Move className="h-5 w-5" />
            {!compact && <span className="text-xs font-medium">드래그해서 교체</span>}
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

        {pasteActive && !processing && (
          <div className="pointer-events-none absolute bottom-2 left-1/2 z-30 -translate-x-1/2 whitespace-nowrap rounded-full bg-accent px-3 py-1 text-xs font-bold text-white shadow-lg">
            선택됨 · Ctrl+V
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
          aspectRatio={aspectRatio}
          cropShape="rect"
          enableAutoCrop={false}
          restrictPosition
          title={cropTitle}
          description={cropDescription}
          onComplete={handleCropComplete}
          onCancel={() => {
            setCropImageSrc(null)
            onIncomingDone?.()
          }}
        />
      )}
    </>
  )
}
