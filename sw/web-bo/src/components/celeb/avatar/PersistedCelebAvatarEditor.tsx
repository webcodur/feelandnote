'use client'

import { useCallback, useState, type ComponentProps } from 'react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/contexts/ToastContext'
import CelebAvatarEditor from './CelebAvatarEditor'
import CelebAvatarNobgButton from './CelebAvatarNobgButton'
import { saveCelebAvatar } from './saveCelebAvatar'
import { enqueueCelebAvatarBackgroundRemoval } from '@/actions/admin/celeb-nobg'
import { nobgQueuedMessage, nobgQueueFailureMessage } from './nobgJobNotice'
import type { ImageProcessingJob } from '@/lib/image-processing/types'

type EditorProps = ComponentProps<typeof CelebAvatarEditor>
type BackgroundRemovalControls = Pick<ComponentProps<typeof CelebAvatarNobgButton>,
  'job' | 'poll' | 'quiet' | 'disabled' | 'className' | 'onJobChange'>

interface Props extends Omit<EditorProps, 'value' | 'alt' | 'onCroppedFile' | 'onError'> {
  celebId: string
  avatarUrl?: string | null
  name?: string | null
  onSaved?: (url: string) => void
  refreshAfterSave?: boolean
  /** 상세·이미지 작업 화면이 같은 후처리 도구를 쓴다. 작은 목록 칸은 숨긴다. */
  backgroundRemovalControls?: true | BackgroundRemovalControls
}

export default function PersistedCelebAvatarEditor({
  celebId,
  avatarUrl,
  name,
  onSaved,
  refreshAfterSave = true,
  backgroundRemovalControls,
  ...editorProps
}: Props) {
  const router = useRouter()
  const { showToast } = useToast()
  const [localAvatar, setLocalAvatar] = useState({ source: avatarUrl, value: avatarUrl })
  const [localJob, setLocalJob] = useState<ImageProcessingJob | undefined>(undefined)
  const controls = typeof backgroundRemovalControls === 'object' ? backgroundRemovalControls : undefined
  const onJobChange = controls?.onJobChange
  const label = name?.trim() || '인물'
  const currentUrl = localAvatar.source === avatarUrl ? localAvatar.value : avatarUrl
  const currentJob = controls?.job !== undefined ? controls.job : localJob
  const processing = currentJob?.status === 'queued' || currentJob?.status === 'running'

  const updateJob = useCallback((job: ImageProcessingJob) => {
    setLocalJob(job)
    onJobChange?.(job)
  }, [onJobChange])

  const updateAvatar = useCallback((url: string) => {
    setLocalAvatar({ source: avatarUrl, value: url })
    onSaved?.(url)
  }, [avatarUrl, onSaved])

  async function persist(file: File, _previewUrl: string, removeBackground: boolean, reframe: boolean) {
    const url = await saveCelebAvatar(celebId, file, refreshAfterSave)
    updateAvatar(url)
    showToast('success', `${label} 아바타를 저장했습니다.`)
    if (refreshAfterSave) router.refresh()
    // 배경 제거는 저장된 아바타를 내려받아 처리한다. 저장이 끝난 뒤에 접수한다.
    if (removeBackground) await queueBackgroundRemoval(reframe)
  }

  async function queueBackgroundRemoval(reframe: boolean) {
    try {
      const job = await enqueueCelebAvatarBackgroundRemoval(celebId, reframe)
      updateJob(job)
      showToast('success', nobgQueuedMessage(label, job))
    } catch (error) {
      // 아바타 저장은 이미 끝났다. 배경 제거만 실패했음을 알리고 넘어간다.
      console.error('nobg 자동 접수 실패:', error)
      showToast('error', nobgQueueFailureMessage(error))
    }
  }

  return (
    <>
      <CelebAvatarEditor
        {...editorProps}
        disabled={editorProps.disabled || processing}
        value={currentUrl}
        alt={label}
        offerBackgroundRemoval
        onCroppedFile={persist}
        onError={(error) => {
          console.error('아바타 저장 실패:', error)
          showToast('error', error.message)
        }}
      />
      {(backgroundRemovalControls || localJob) && (
        <CelebAvatarNobgButton
          {...controls}
          celebId={celebId}
          avatarUrl={currentUrl}
          name={name}
          disabled={editorProps.disabled || controls?.disabled}
          job={currentJob}
          onJobChange={updateJob}
          onCompleted={updateAvatar}
          className={backgroundRemovalControls ? controls?.className ?? 'mt-2 w-full' : 'hidden'}
        />
      )}
    </>
  )
}
