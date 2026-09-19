'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useToast } from '@/contexts/ToastContext'

/**
 * 즉시 등록 대기 — 바깥 브라우저 확장(tools/celeb-image-grabber)이 Alt+클릭으로
 * 밀어넣은 사진을 받아, 화면이 정해 둔 «대상» 자리로 넘긴다.
 *
 * 대상은 이 훅이 정하지 않는다. 사진이 도착한 순간 호출부의 resolveTarget을 불러
 * 그때의 대상을 묻는다(숫자키로 고른 자리, 없으면 화면에 가장 크게 보이는 행).
 * 예전처럼 목록 위에서부터 빈 자리를 찾아 채우지 않는다 — 사람이 보고 있는 곳으로 간다.
 *
 * 편집 창이 떠 있는 동안에는 다음 사진을 꺼내지 않는다. 대기열은 서버가 들고 있으므로
 * 연달아 클릭한 사진도 순서대로 나온다.
 */

export type ImageSlot = 'avatar' | 'portrait' | 'awakened'

/** 사진이 도착했는지 확인하는 간격. */
const POLL_MS = 1200

export interface ImageTarget {
  celebId: string
  slot: ImageSlot
}

export interface IncomingImage extends ImageTarget {
  file: File
}

interface Options {
  /** 사진이 도착한 순간 어디로 넣을지 묻는다. 없으면 사진을 버리고 알린다. */
  resolveTarget: () => ImageTarget | null
  enabled: boolean
}

export function useQuickImageInbox({ resolveTarget, enabled }: Options) {
  const [incoming, setIncoming] = useState<IncomingImage | null>(null)
  const clearIncoming = useCallback(() => setIncoming(null), [])
  const { showToast } = useToast()

  // 폴링 클로저가 낡은 대상을 쥐지 않도록 최신 함수를 ref로 넘긴다.
  const resolveTargetRef = useRef(resolveTarget)
  useEffect(() => {
    resolveTargetRef.current = resolveTarget
  })

  useEffect(() => {
    if (!enabled || incoming) return
    let cancelled = false
    let timer: ReturnType<typeof setTimeout> | undefined

    async function checkInbox() {
      try {
        const response = await fetch('/api/celebs/quick-image', { cache: 'no-store' })
        if (!cancelled && response.status === 200) {
          const blob = await response.blob()
          const target = resolveTargetRef.current()
          if (!target) {
            showToast('error', '사진이 도착했지만 받을 자리를 찾지 못했습니다.')
          } else {
            setIncoming({
              ...target,
              file: new File([blob], 'quick-image', { type: blob.type || 'image/png' }),
            })
            return
          }
        }
      } catch {
        // 개발 서버가 잠깐 끊긴 경우다. 다음 차례에 다시 확인한다.
      }
      if (!cancelled) timer = setTimeout(checkInbox, POLL_MS)
    }

    timer = setTimeout(checkInbox, 300)
    return () => {
      cancelled = true
      if (timer) clearTimeout(timer)
    }
  }, [enabled, incoming, showToast])

  return { incoming, clearIncoming }
}
