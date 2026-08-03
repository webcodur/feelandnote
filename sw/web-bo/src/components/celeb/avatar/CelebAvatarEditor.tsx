'use client'

import Image from 'next/image'
import {
  useEffect,
  useRef,
  useState,
  type DragEvent,
  type ReactNode,
} from 'react'
import { Check, ImagePlus, Loader2, Upload, X } from 'lucide-react'
import { createPreviewUrl } from '@/lib/image'
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
  onFileAccepted?: (file: File) => void
  onCroppedFile: (file: File, previewUrl: string) => void | Promise<void>
  onRemove?: () => void
  onError?: (error: Error) => void
}

const IMAGE_ONLY_ERROR = new Error('이미지 파일만 사용할 수 있습니다.')

export default function CelebAvatarEditor({
  value,
  alt,
  className = '',
  previewClassName = '',
  empty,
  children,
  disabled = false,
  removable = false,
  onFileAccepted,
  onCroppedFile,
  onRemove,
  onError,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [dragging, setDragging] = useState(false)
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null)
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved'>('idle')

  useEffect(() => () => {
    if (savedTimerRef.current) clearTimeout(savedTimerRef.current)
  }, [])

  async function acceptFile(file?: File) {
    if (!file || disabled) return
    if (!file.type.startsWith('image/')) {
      onError?.(IMAGE_ONLY_ERROR)
      return
    }

    onFileAccepted?.(file)
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
    setCropImageSrc(null)
    setStatus('saving')

    try {
      const response = await fetch(croppedDataUrl)
      const blob = await response.blob()
      const file = new File([blob], 'avatar.png', { type: 'image/png' })
      await onCroppedFile(file, croppedDataUrl)
      setStatus('saved')
      savedTimerRef.current = setTimeout(() => setStatus('idle'), 1200)
    } catch (error) {
      setStatus('idle')
      onError?.(error instanceof Error ? error : new Error('아바타 처리에 실패했습니다.'))
    }
  }

  const busy = status === 'saving'

  return (
    <>
      <div
        data-dragging={dragging || undefined}
        onDragEnter={(event) => {
          event.preventDefault()
          event.stopPropagation()
          if (!disabled) setDragging(true)
        }}
        onDragOver={(event) => {
          event.preventDefault()
          event.stopPropagation()
        }}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`data-[dragging=true]:bg-accent/10 data-[dragging=true]:ring-2 data-[dragging=true]:ring-accent ${className}`}
      >
        <div className={`group/avatar relative overflow-hidden bg-bg-secondary ${previewClassName}`}>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            disabled={disabled || busy}
            onChange={async (event) => {
              await acceptFile(event.target.files?.[0])
              event.target.value = ''
            }}
            className="hidden"
          />
          <button
            type="button"
            disabled={disabled || busy}
            onClick={() => inputRef.current?.click()}
            aria-label={`${alt} 아바타 이미지 선택`}
            title="클릭하거나 이미지를 끌어다 놓아 아바타 교체"
            className="absolute inset-0 z-10 cursor-pointer rounded-[inherit] disabled:cursor-wait"
          />

          {value ? (
            <Image src={value} alt={alt} fill unoptimized className="object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center">{empty}</div>
          )}

          <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center bg-black/55 opacity-0 transition-opacity duration-150 group-hover/avatar:opacity-100">
            <ImagePlus className="h-4 w-4 text-white" />
          </div>

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
          onCancel={() => setCropImageSrc(null)}
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
