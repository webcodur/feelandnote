'use client'

import { LyreIcon, LyreSilentIcon } from '@/components/ui/icons/neo-pantheon'
import { useSound } from '@/contexts/SoundContext'
import Button from '@/components/ui/Button'

const ICON_BUTTON_CLASS = 'w-9 h-9 flex items-center justify-center rounded-lg hover:bg-white/5'

export default function SoundToggle() {
  const { isSoundEnabled, toggleSound, playSound } = useSound()

  return (
    <Button
      unstyled
      noSound
      onClick={() => {
        const isNowEnabled = toggleSound()
        if (isNowEnabled) playSound('volumeCheck', true)
      }}
      className={`${ICON_BUTTON_CLASS} hidden md:flex`}
      title={isSoundEnabled ? '사운드 끄기' : '사운드 켜기'}
    >
      {isSoundEnabled ? <LyreIcon size={20} /> : <LyreSilentIcon size={20} />}
    </Button>
  )
}
