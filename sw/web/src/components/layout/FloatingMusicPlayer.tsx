'use client'

import { useEffect, useRef, useState } from 'react'
import { Music } from 'lucide-react'
import { Z_INDEX } from '@/constants/zIndex'
import { useGameAudioContext } from '@/contexts/GameAudioContext'
import { useFactionMusicContext } from '@/contexts/FactionMusicContext'

/** 현재 화면의 BGM을 한 개 아이콘으로 재생·일시정지한다. */
export default function FloatingMusicPlayer() {
  const { controls: gameAudio } = useGameAudioContext()
  const { music: factionMusic } = useFactionMusicContext()
  const factionAudioRef = useRef<HTMLAudioElement | null>(null)
  const [playingFactionId, setPlayingFactionId] = useState<string | null>(null)

  // 팩션을 바꾸거나 화면을 떠나면 이전 음원을 즉시 멈춘다.
  useEffect(() => {
    const audio = factionAudioRef.current
    return () => audio?.pause()
  }, [factionMusic?.id, factionMusic?.url])

  const label = gameAudio?.trackLabel || factionMusic?.title || 'Music'
  const isPlaying = gameAudio?.isPlaying ?? playingFactionId === factionMusic?.id
  const zIndex = gameAudio ? Z_INDEX.floatingPlayerGame : Z_INDEX.floatingPlayer

  const toggle = () => {
    if (gameAudio) {
      gameAudio.togglePlay()
      return
    }

    const audio = factionAudioRef.current
    if (!audio) return
    if (audio.paused) {
      void audio.play().catch(() => {})
    } else {
      audio.pause()
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={toggle}
        aria-label={label}
        aria-pressed={isPlaying}
        title={label}
        className={`fixed bottom-20 end-4 flex size-11 items-center justify-center rounded-full border shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent md:bottom-4 ${
          isPlaying
            ? 'border-accent bg-accent/20 text-accent hover:bg-accent/30'
            : 'border-accent/30 bg-bg-card/95 text-accent hover:border-accent hover:bg-accent/10'
        }`}
        style={{ zIndex }}
      >
        <Music size={19} aria-hidden="true" />
      </button>

      {factionMusic && (
        <audio
          key={factionMusic.id}
          ref={factionAudioRef}
          src={factionMusic.url}
          preload="none"
          onPlay={() => setPlayingFactionId(factionMusic.id)}
          onPause={() => setPlayingFactionId(null)}
          onEnded={() => setPlayingFactionId(null)}
        />
      )}
    </>
  )
}
