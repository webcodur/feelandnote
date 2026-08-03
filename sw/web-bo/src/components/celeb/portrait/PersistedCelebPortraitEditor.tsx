'use client'

import { useState, type ComponentProps } from 'react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/contexts/ToastContext'
import CelebPortraitEditor from './CelebPortraitEditor'
import { saveCelebPortrait } from './saveCelebPortrait'

type EditorProps = ComponentProps<typeof CelebPortraitEditor>

interface Props extends Omit<EditorProps, 'value' | 'alt' | 'onCroppedFile' | 'onError'> {
  celebId: string
  portraitUrl?: string | null
  name?: string | null
  onSaved?: (url: string) => void
}

export default function PersistedCelebPortraitEditor({
  celebId,
  portraitUrl,
  name,
  onSaved,
  ...editorProps
}: Props) {
  const router = useRouter()
  const { showToast } = useToast()
  const [localPortrait, setLocalPortrait] = useState({ source: portraitUrl, value: portraitUrl })
  const label = name?.trim() || '인물'
  const currentUrl = localPortrait.source === portraitUrl ? localPortrait.value : portraitUrl

  async function persist(file: File) {
    const url = await saveCelebPortrait(celebId, file)
    setLocalPortrait({ source: portraitUrl, value: url })
    onSaved?.(url)
    showToast('success', `${label} 대표사진을 저장했습니다.`)
    router.refresh()
  }

  return (
    <CelebPortraitEditor
      {...editorProps}
      value={currentUrl}
      alt={`${label} 대표사진`}
      onCroppedFile={persist}
      onError={(error) => {
        console.error('대표사진 저장 실패:', error)
        showToast('error', error.message)
      }}
    />
  )
}
