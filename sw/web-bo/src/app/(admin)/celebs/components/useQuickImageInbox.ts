'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { Member } from '@/actions/admin/members'
import { useToast } from '@/contexts/ToastContext'

/**
 * 즉시 등록 대기 — 바깥 브라우저 확장(tools/celeb-image-grabber)이 Alt+클릭으로
 * 밀어넣은 사진을 받아, 위에서부터 처음 만나는 빈 자리에 배정한다.
 *
 * 편집 창이 떠 있는 동안에는 다음 사진을 꺼내지 않는다. 대기열은 서버가 들고 있으므로
 * 연달아 클릭한 사진도 순서대로 나온다.
 */

export type ImageSlot = 'avatar' | 'portrait'

/** 사진이 도착했는지 확인하는 간격. */
const POLL_MS = 1200

export interface EmptySlot {
  celeb: Member
  slot: ImageSlot
}

export interface IncomingImage {
  celebId: string
  slot: ImageSlot
  file: File
}

interface Options {
  celebs: Member[]
  avatarUrls: Record<string, string | null>
  portraitUrls: Record<string, string | null>
  /** 켜면 대표사진을 건너뛰고 얼굴 사진만 채운다. */
  avatarOnly: boolean
  enabled: boolean
}

export function useQuickImageInbox({
  celebs,
  avatarUrls,
  portraitUrls,
  avatarOnly,
  enabled,
}: Options) {
  const [incoming, setIncoming] = useState<IncomingImage | null>(null)
  const clearIncoming = useCallback(() => setIncoming(null), [])
  const { showToast } = useToast()

  const nextTarget = findNextEmptySlot({ celebs, avatarUrls, portraitUrls, avatarOnly })
  const nextTargetRef = useRef(nextTarget)
  useEffect(() => {
    nextTargetRef.current = nextTarget
  }, [nextTarget])

  useEffect(() => {
    if (!enabled || incoming) return
    let cancelled = false
    let timer: ReturnType<typeof setTimeout> | undefined

    async function checkInbox() {
      try {
        const response = await fetch('/api/celebs/quick-image', { cache: 'no-store' })
        if (!cancelled && response.status === 200) {
          const blob = await response.blob()
          const target = nextTargetRef.current
          if (!target) {
            showToast('error', '사진이 도착했지만 이 페이지에는 빈 자리가 없습니다.')
          } else {
            setIncoming({
              celebId: target.celeb.id,
              slot: target.slot,
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

  return { nextTarget, incoming, clearIncoming }
}

/**
 * 카드 순서대로 훑어 처음 만나는 빈 자리를 찾는다. 한 인물의 얼굴 사진을 채우면
 * 같은 인물의 대표사진으로, 둘 다 차면 다음 인물로 넘어간다.
 */
function findNextEmptySlot({
  celebs,
  avatarUrls,
  portraitUrls,
  avatarOnly,
}: Omit<Options, 'enabled'>): EmptySlot | null {
  for (const celeb of celebs) {
    if (!avatarUrls[celeb.id]) return { celeb, slot: 'avatar' }
    if (!avatarOnly && !portraitUrls[celeb.id]) return { celeb, slot: 'portrait' }
  }
  return null
}
