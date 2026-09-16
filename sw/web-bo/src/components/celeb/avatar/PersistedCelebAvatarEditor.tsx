'use client'

import { useState, type ComponentProps } from 'react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/contexts/ToastContext'
import CelebAvatarEditor from './CelebAvatarEditor'
import { saveCelebAvatar } from './saveCelebAvatar'
import { enqueueCelebAvatarBackgroundRemoval } from '@/actions/admin/celeb-nobg'
import type { ImageProcessingJob } from '@/lib/image-processing/types'

type EditorProps = ComponentProps<typeof CelebAvatarEditor>

interface Props extends Omit<EditorProps, 'value' | 'alt' | 'onCroppedFile' | 'onError'> {
  celebId: string
  avatarUrl?: string | null
  name?: string | null
  onSaved?: (url: string) => void
  refreshAfterSave?: boolean
  /** 자르기 창에서 배경 제거를 걸었을 때 접수한 작업을 알린다. 진행 표시를 쥔 화면이 받는다. */
  onBackgroundRemovalQueued?: (job: ImageProcessingJob) => void
}

export default function PersistedCelebAvatarEditor({
  celebId,
  avatarUrl,
  name,
  onSaved,
  refreshAfterSave = true,
  onBackgroundRemovalQueued,
  ...editorProps
}: Props) {
  const router = useRouter()
  const { showToast } = useToast()
  const [localAvatar, setLocalAvatar] = useState({ source: avatarUrl, value: avatarUrl })
  const label = name?.trim() || '인물'
  const currentUrl = localAvatar.source === avatarUrl ? localAvatar.value : avatarUrl

  async function persist(file: File, _previewUrl: string, removeBackground: boolean) {
    const url = await saveCelebAvatar(celebId, file, refreshAfterSave)
    setLocalAvatar({ source: avatarUrl, value: url })
    onSaved?.(url)
    showToast('success', `${label} 아바타를 저장했습니다.`)
    if (refreshAfterSave) router.refresh()
    // 배경 제거는 저장된 아바타를 내려받아 처리한다. 저장이 끝난 뒤에 접수한다.
    if (removeBackground) await queueBackgroundRemoval()
  }

  async function queueBackgroundRemoval() {
    try {
      const job = await enqueueCelebAvatarBackgroundRemoval(celebId)
      onBackgroundRemovalQueued?.(job)
      showToast(
        'success',
        job.status === 'running'
          ? `${label} 배경 제거를 시작했습니다.`
          : `${label} 배경 제거를 대기열 ${job.queuePosition}번째로 접수했습니다.`
      )
    } catch (error) {
      // 아바타 저장은 이미 끝났다. 배경 제거만 실패했음을 알리고 넘어간다.
      console.error('nobg 자동 접수 실패:', error)
      showToast('error', error instanceof Error ? error.message : '배경 제거 작업을 접수하지 못했습니다.')
    }
  }

  return (
    <CelebAvatarEditor
      {...editorProps}
      value={currentUrl}
      alt={label}
      offerBackgroundRemoval
      onCroppedFile={persist}
      onError={(error) => {
        console.error('아바타 저장 실패:', error)
        showToast('error', error.message)
      }}
    />
  )
}
