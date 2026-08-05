'use client'

import { useState, type ComponentProps } from 'react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/contexts/ToastContext'
import CelebAvatarEditor from './CelebAvatarEditor'
import { saveCelebAvatar } from './saveCelebAvatar'

type EditorProps = ComponentProps<typeof CelebAvatarEditor>

interface Props extends Omit<EditorProps, 'value' | 'alt' | 'onCroppedFile' | 'onError'> {
  celebId: string
  avatarUrl?: string | null
  name?: string | null
  onSaved?: (url: string) => void
  refreshAfterSave?: boolean
}

export default function PersistedCelebAvatarEditor({
  celebId,
  avatarUrl,
  name,
  onSaved,
  refreshAfterSave = true,
  ...editorProps
}: Props) {
  const router = useRouter()
  const { showToast } = useToast()
  const [localAvatar, setLocalAvatar] = useState({ source: avatarUrl, value: avatarUrl })
  const label = name?.trim() || '인물'
  const currentUrl = localAvatar.source === avatarUrl ? localAvatar.value : avatarUrl

  async function persist(file: File) {
    const url = await saveCelebAvatar(celebId, file, refreshAfterSave)
    setLocalAvatar({ source: avatarUrl, value: url })
    onSaved?.(url)
    showToast('success', `${label} 아바타를 저장했습니다.`)
    if (refreshAfterSave) router.refresh()
  }

  return (
    <CelebAvatarEditor
      {...editorProps}
      value={currentUrl}
      alt={label}
      onCroppedFile={persist}
      onError={(error) => {
        console.error('아바타 저장 실패:', error)
        showToast('error', error.message)
      }}
    />
  )
}
