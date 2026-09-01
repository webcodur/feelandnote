'use client'

import { useState, type ComponentProps } from 'react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/contexts/ToastContext'
import CelebPortraitEditor from '@/components/celeb/portrait/CelebPortraitEditor'
import {
  removeCelebAwakenedImage,
  saveCelebAwakenedImage,
} from './saveCelebAwakenedImage'

type EditorProps = ComponentProps<typeof CelebPortraitEditor>

interface Props extends Omit<
  EditorProps,
  | 'value'
  | 'alt'
  | 'onCroppedFile'
  | 'onError'
  | 'onRemove'
  | 'aspectRatio'
  | 'aspectLabel'
  | 'emptyLabel'
  | 'cropTitle'
  | 'cropDescription'
  | 'processingErrorMessage'
> {
  celebId: string
  awakenedImageUrl?: string | null
  name?: string | null
  onSaved?: (url: string | null) => void
  refreshAfterSave?: boolean
  removable?: boolean
}

export default function PersistedCelebAwakenedImageEditor({
  celebId,
  awakenedImageUrl,
  name,
  onSaved,
  refreshAfterSave = true,
  removable = true,
  ...editorProps
}: Props) {
  const router = useRouter()
  const { showToast } = useToast()
  const [localImage, setLocalImage] = useState({
    source: awakenedImageUrl,
    value: awakenedImageUrl,
  })
  const [removing, setRemoving] = useState(false)
  const label = name?.trim() || '인물'
  const currentUrl = localImage.source === awakenedImageUrl
    ? localImage.value
    : awakenedImageUrl

  async function persist(file: File) {
    const url = await saveCelebAwakenedImage(celebId, file, refreshAfterSave)
    setLocalImage({ source: awakenedImageUrl, value: url })
    onSaved?.(url)
    showToast('success', `${label} 각성 이미지를 저장했습니다.`)
    if (refreshAfterSave) router.refresh()
  }

  async function remove() {
    if (removing || !currentUrl) return
    if (!window.confirm(`${label} 각성 이미지를 제거할까요?`)) return

    setRemoving(true)
    try {
      await removeCelebAwakenedImage(celebId, refreshAfterSave)
      setLocalImage({ source: awakenedImageUrl, value: null })
      onSaved?.(null)
      showToast('success', `${label} 각성 이미지를 제거했습니다.`)
      if (refreshAfterSave) router.refresh()
    } catch (error) {
      console.error('각성 이미지 제거 실패:', error)
      showToast('error', error instanceof Error ? error.message : '각성 이미지를 제거하지 못했습니다.')
    } finally {
      setRemoving(false)
    }
  }

  return (
    <CelebPortraitEditor
      {...editorProps}
      value={currentUrl}
      alt={`${label} 각성 이미지`}
      aspectRatio={1}
      aspectLabel="1:1"
      emptyLabel="각성 이미지 놓기"
      cropTitle="각성 이미지 위치 조정"
      cropDescription="정사각형 안에서 핵심 연출이 잘 보이도록 위치와 확대를 조정하세요."
      processingErrorMessage="각성 이미지 처리에 실패했습니다."
      onCroppedFile={persist}
      onRemove={removable && !removing ? remove : undefined}
      onError={(error) => {
        console.error('각성 이미지 저장 실패:', error)
        showToast('error', error.message)
      }}
    />
  )
}
