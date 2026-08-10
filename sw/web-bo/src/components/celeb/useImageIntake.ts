'use client'

import { useCallback, useEffect, useRef } from 'react'
import { createPreviewUrl, getClipboardImageFile } from '@/lib/image'

/**
 * 셀럽 사진 편집기(얼굴 사진·대표사진)가 사진을 받아들이는 세 경로를 한곳에서 처리한다.
 *  - 끌어다 놓기: 호출부가 acceptFile을 직접 부른다.
 *  - 붙여넣기: 자리를 선택해 둔 편집기가 창 전체의 Ctrl+V를 받는다.
 *  - 밀어넣기: 즉시 등록 창구가 보낸 사진을 받는다(tools/celeb-image-grabber).
 *
 * 콜백은 ref로 잡아 최신 것을 쓴다. 호출부가 인라인 함수를 넘겨도 사진 한 장에
 * 편집 창이 한 번만 열리게 하려는 것이다. 의존성에 그대로 넣으면 부모가 다시
 * 그려질 때마다 같은 사진으로 편집 창이 되풀이해 열린다.
 */

const IMAGE_ONLY_ERROR = new Error('이미지 파일만 사용할 수 있습니다.')

interface Options {
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
}

interface Intake {
  /** 편집 창을 열었으면 true. 호출부가 후속 처리를 이어갈지 판단한다. */
  acceptFile: (file?: File) => Promise<boolean>
}

export function useImageIntake({
  onPreviewReady,
  disabled = false,
  pasteActive = false,
  incomingFile = null,
  onIncomingDone,
  onFileAccepted,
  onError,
}: Options): Intake {
  const latest = useRef({ onPreviewReady, disabled, onIncomingDone, onFileAccepted, onError })
  useEffect(() => {
    latest.current = { onPreviewReady, disabled, onIncomingDone, onFileAccepted, onError }
  })

  const acceptFile = useCallback(async (file?: File): Promise<boolean> => {
    const { onPreviewReady, disabled, onFileAccepted, onError } = latest.current
    if (!file || disabled) return false
    if (!file.type.startsWith('image/')) {
      onError?.(IMAGE_ONLY_ERROR)
      return false
    }

    onFileAccepted?.(file)
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

  return { acceptFile }
}
