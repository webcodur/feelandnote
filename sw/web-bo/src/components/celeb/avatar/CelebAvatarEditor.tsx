'use client'

import Image from 'next/image'
import {
  useEffect,
  useRef,
  useState,
  type DragEvent,
  type ReactNode,
} from 'react'
import { Check, Loader2, Move, Upload, X } from 'lucide-react'
import { useImageIntake } from '@/components/celeb/useImageIntake'
import ImageCropModal from '@/components/ui/ImageCropModal'

interface Props {
  value?: string | null
  alt: string
  className?: string
  previewClassName?: string
  empty?: ReactNode
  children?: ReactNode
  disabled?: boolean
  removable?: boolean
  openOnClick?: boolean
  loadImmediately?: boolean
  highPriority?: boolean
  pasteActive?: boolean
  showSavedState?: boolean
  /** 바깥에서 밀어넣은 사진. 값이 바뀌면 곧바로 자르기 창이 열린다. */
  incomingFile?: File | null
  /** 밀어넣은 사진의 자르기 창이 닫혔을 때(저장·취소·열기 실패) 알린다. */
  onIncomingDone?: () => void
  /** 파일이 아닌 경로를 전달하는 외부 드래그 소스의 MIME 형식. */
  externalDropType?: string
  /** 외부 드래그 소스에서 받은 값을 사진 파일로 받아들이는 호출부에 넘긴다. */
  onExternalDrop?: (value: string) => void | Promise<void>
  onActivate?: () => void
  onFileAccepted?: (file: File) => void
  onCroppedFile: (file: File, previewUrl: string) => void | Promise<void>
  onRemove?: () => void
  onError?: (error: Error) => void
}

export default function CelebAvatarEditor({
  value,
  alt,
  className = '',
  previewClassName = '',
  empty,
  children,
  disabled = false,
  removable = false,
  openOnClick = false,
  loadImmediately = false,
  highPriority = false,
  pasteActive = false,
  showSavedState = true,
  incomingFile = null,
  onIncomingDone,
  externalDropType,
  onExternalDrop,
  onActivate,
  onFileAccepted,
  onCroppedFile,
  onRemove,
  onError,
}: Props) {
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [dragging, setDragging] = useState(false)
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null)
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved'>('idle')

  useEffect(() => () => {
    if (savedTimerRef.current) clearTimeout(savedTimerRef.current)
  }, [])

  const { acceptFile } = useImageIntake({
    onPreviewReady: setCropImageSrc,
    disabled,
    pasteActive,
    incomingFile,
    onIncomingDone,
    onFileAccepted,
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
    setCropImageSrc(null)
    setStatus('saving')

    try {
      const response = await fetch(croppedDataUrl)
      const blob = await response.blob()
      const file = new File([blob], 'avatar.png', { type: 'image/png' })
      await onCroppedFile(file, croppedDataUrl)
      if (!showSavedState) {
        setStatus('idle')
        return
      }
      setStatus('saved')
      savedTimerRef.current = setTimeout(() => setStatus('idle'), 1200)
    } catch (error) {
      setStatus('idle')
      onError?.(error instanceof Error ? error : new Error('아바타 처리에 실패했습니다.'))
    } finally {
      onIncomingDone?.()
    }
  }

  const busy = status === 'saving'

  return (
    <>
      <div
        data-dragging={dragging || undefined}
        onDragEnter={(event) => {
          if (!acceptsDrag(event)) return
          event.preventDefault()
          event.stopPropagation()
          if (!disabled) setDragging(true)
        }}
        onDragOver={(event) => {
          if (!acceptsDrag(event)) return
          event.preventDefault()
          event.stopPropagation()
          event.dataTransfer.dropEffect = 'copy'
        }}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`data-[dragging=true]:bg-accent/10 data-[dragging=true]:ring-2 data-[dragging=true]:ring-accent ${className}`}
      >
        <div
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
          className={`group/avatar relative overflow-hidden bg-bg-secondary ${pasteActive ? 'border-accent ring-2 ring-accent ring-offset-2 ring-offset-bg-card' : ''} ${onActivate ? 'cursor-pointer' : ''} ${previewClassName}`}
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
          ) : (
            <div className="flex h-full w-full items-center justify-center">{empty}</div>
          )}

          {!openOnClick && (
            <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center bg-black/55 opacity-0 group-hover/avatar:opacity-100">
              <Move className="h-4 w-4 text-white" />
            </div>
          )}

          {busy && (
            <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center bg-black/70">
              <Loader2 className="h-5 w-5 animate-spin text-accent" />
            </div>
          )}
          {status === 'saved' && (
            <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center bg-green-950/75">
              <Check className="h-5 w-5 text-green-300" />
            </div>
          )}
          {pasteActive && !busy && status !== 'saved' && (
            <div className="pointer-events-none absolute bottom-2 left-1/2 z-30 -translate-x-1/2 whitespace-nowrap rounded-full bg-accent px-3 py-1 text-xs font-bold text-white shadow-lg">
              선택됨 · Ctrl+V
            </div>
          )}
          {removable && value && onRemove && !busy && (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation()
                onRemove()
              }}
              aria-label={`${alt} 아바타 제거`}
              className="absolute end-1 top-1 z-40 rounded-full bg-black/70 p-1 text-white hover:bg-red-600"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
        {children}
      </div>

      {cropImageSrc && (
        <ImageCropModal
          imageSrc={cropImageSrc}
          aspectRatio={1}
          allowTransparentPadding
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

export function AvatarUploadEmpty() {
  return (
    <div className="flex flex-col items-center gap-1 text-text-secondary">
      <Upload className="h-4 w-4" />
      <span className="text-[10px]">800×800</span>
    </div>
  )
}
