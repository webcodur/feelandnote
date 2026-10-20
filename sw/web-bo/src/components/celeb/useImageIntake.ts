'use client'

import { useCallback, useEffect, useRef, useState, type DragEvent } from 'react'
import { createPreviewUrl, getClipboardImageFile } from '@/lib/image'
import { acceptsCelebImageDrop, readCelebImageDrag, writeCelebImageDrag } from './image-drag'

/**
 * 셀럽 사진 편집기(얼굴 사진·대표사진)가 사진을 받아들이는 세 경로를 한곳에서 처리한다.
 *  - 끌어다 놓기: 파일과 다른 이미지 칸에서 가져온 사진을 같은 크롭 경로로 받는다.
 *  - 붙여넣기: 자리를 선택해 둔 편집기가 창 전체의 Ctrl+V를 받는다.
 *  - 밀어넣기: 즉시 등록 창구가 보낸 사진을 받는다(tools/celeb-image-grabber).
 *
 * 콜백은 ref로 잡아 최신 것을 쓴다. 호출부가 인라인 함수를 넘겨도 사진 한 장에
 * 편집 창이 한 번만 열리게 하려는 것이다. 의존성에 그대로 넣으면 부모가 다시
 * 그려질 때마다 같은 사진으로 편집 창이 되풀이해 열린다.
 */

const IMAGE_ONLY_ERROR = new Error('이미지 파일만 사용할 수 있습니다.')

interface Options {
  /** 다른 이미지 칸으로 끌어갈 현재 이미지. 저장본·미저장 미리보기를 모두 받는다. */
  imageSrc?: string | null
  /** 사진을 미리보기 주소로 바꿔 넘긴다. 편집 창을 여는 것은 호출부 몫이다. */
  onPreviewReady: (previewUrl: string) => void
  disabled?: boolean
  /** 이 자리가 선택돼 있으면 창 어디서 붙여넣어도 여기로 들어온다. */
  pasteActive?: boolean
  /** 즉시 등록 창구가 밀어넣은 사진. 값이 바뀌면 곧바로 편집 창이 열린다. */
  incomingFile?: File | null
  /** 밀어넣은 사진의 편집 창이 닫혔을 때(저장·취소·열기 실패) 알린다. */
  onIncomingDone?: () => void
  onFileAccepted?: (file: File) => void
  onError?: (error: Error) => void
  externalDropType?: string
  onExternalDrop?: (value: string) => void | Promise<void>
}

interface Intake {
  /** 편집 창을 열었으면 true. 호출부가 후속 처리를 이어갈지 판단한다. */
  acceptFile: (file?: File, notifyFileAccepted?: boolean) => Promise<boolean>
  dragging: boolean
  dragSourceProps: {
    draggable: boolean
    onDragStart: (event: DragEvent<HTMLElement>) => void
  }
  dropTargetProps: {
    onDragEnter: (event: DragEvent<HTMLDivElement>) => void
    onDragOver: (event: DragEvent<HTMLDivElement>) => void
    onDragLeave: (event: DragEvent<HTMLDivElement>) => void
    onDrop: (event: DragEvent<HTMLDivElement>) => Promise<void>
  }
}

export function useImageIntake({
  imageSrc,
  onPreviewReady,
  disabled = false,
  pasteActive = false,
  incomingFile = null,
  onIncomingDone,
  onFileAccepted,
  onError,
  externalDropType,
  onExternalDrop,
}: Options): Intake {
  const [dragging, setDragging] = useState(false)
  const latest = useRef({ onPreviewReady, disabled, onIncomingDone, onFileAccepted, onError })
  useEffect(() => {
    latest.current = { onPreviewReady, disabled, onIncomingDone, onFileAccepted, onError }
  })

  const acceptFile = useCallback(async (file?: File, notifyFileAccepted = true): Promise<boolean> => {
    const { onPreviewReady, disabled, onFileAccepted, onError } = latest.current
    if (!file || disabled) return false
    if (!file.type.startsWith('image/')) {
      onError?.(IMAGE_ONLY_ERROR)
      return false
    }

    if (notifyFileAccepted) onFileAccepted?.(file)
    onPreviewReady(await createPreviewUrl(file))
    return true
  }, [])

  useEffect(() => {
    if (!pasteActive) return

    function handlePaste(event: ClipboardEvent) {
      const target = event.target as HTMLElement | null
      if (target?.closest('input, textarea, [contenteditable="true"]')) return

      const file = getClipboardImageFile(event)
      if (!file) return
      event.preventDefault()
      void acceptFile(file)
    }

    window.addEventListener('paste', handlePaste)
    return () => window.removeEventListener('paste', handlePaste)
  }, [acceptFile, pasteActive])

  useEffect(() => {
    if (!incomingFile) return
    void acceptFile(incomingFile).then((opened) => {
      if (!opened) latest.current.onIncomingDone?.()
    })
  }, [acceptFile, incomingFile])

  return {
    acceptFile,
    dragging,
    dragSourceProps: {
      draggable: Boolean(imageSrc) && !disabled,
      onDragStart(event) {
        if (!imageSrc || disabled) {
          event.preventDefault()
          return
        }
        event.dataTransfer.effectAllowed = 'copy'
        writeCelebImageDrag(event.dataTransfer, imageSrc)
      },
    },
    dropTargetProps: {
      onDragEnter(event) {
        if (!acceptsCelebImageDrop(event.dataTransfer.types, externalDropType)) return
        event.preventDefault()
        event.stopPropagation()
        if (!disabled) setDragging(true)
      },
      onDragOver(event) {
        if (!acceptsCelebImageDrop(event.dataTransfer.types, externalDropType)) return
        event.preventDefault()
        event.stopPropagation()
        event.dataTransfer.dropEffect = disabled ? 'none' : 'copy'
      },
      onDragLeave(event) {
        event.preventDefault()
        event.stopPropagation()
        const next = event.relatedTarget as Node | null
        if (next && event.currentTarget.contains(next)) return
        setDragging(false)
      },
      async onDrop(event) {
        if (!acceptsCelebImageDrop(event.dataTransfer.types, externalDropType)) return
        event.preventDefault()
        event.stopPropagation()
        setDragging(false)
        if (disabled) return
        const file = event.dataTransfer.files?.[0]
        try {
          const externalValue = externalDropType ? event.dataTransfer.getData(externalDropType) : ''
          if (externalValue && onExternalDrop) {
            await onExternalDrop(externalValue)
            return
          }
          const copied = await readCelebImageDrag(event.dataTransfer)
          // 칸끼리 복사할 때는 파일명으로 인물 이름을 바꾸지 않는다.
          if (copied) await acceptFile(copied, false)
          else await acceptFile(file)
        } catch (error) {
          latest.current.onError?.(error instanceof Error ? error : new Error('사진을 불러오지 못했습니다.'))
        }
      },
    },
  }
}
