'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Music, Pause, Play, X } from 'lucide-react'
import { useLocale } from 'next-intl'
import { Z_INDEX } from '@/constants/zIndex'
import { getMyMusicList, type MusicTrack } from '@/actions/contents/getMyMusicList'
import { useGameAudioContext } from '@/contexts/GameAudioContext'
import { useFactionMusicContext } from '@/contexts/FactionMusicContext'

interface FactionTrack {
  id: string
  title: string
  creator: string | null
  previewUrl: string
}

type ListTrack = MusicTrack | FactionTrack

const isFactionTrack = (track: ListTrack): track is FactionTrack => track.id.startsWith('faction:')

/** 우하단 아이콘에서 현재 테마곡과 사용자의 감상목록을 고르는 작은 음악 목록. */
export default function FloatingMusicPlayer() {
  const locale = useLocale()
  const { controls: gameAudio } = useGameAudioContext()
  const { music: factionMusic } = useFactionMusicContext()
  const [isOpen, setIsOpen] = useState(false)
  const [tracks, setTracks] = useState<MusicTrack[]>([])
  const [loading, setLoading] = useState(false)
  const [playingId, setPlayingId] = useState<string | null>(null)
  const [selection, setSelection] = useState<{ contextKey: string | null; trackId: string | null }>({
    contextKey: null,
    trackId: null,
  })
  const loadedRef = useRef(false)
  const pendingPlayRef = useRef(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const buttonRef = useRef<HTMLButtonElement | null>(null)
  const panelRef = useRef<HTMLDivElement | null>(null)

  const factionTrack: FactionTrack | null = factionMusic
    ? {
        id: `faction:${factionMusic.id}`,
        title: factionMusic.title,
        creator: null,
        previewUrl: factionMusic.url,
      }
    : null
  const factionContextKey = factionTrack?.id ?? null
  const listTracks: ListTrack[] = [
    ...(factionTrack ? [factionTrack] : []),
    ...tracks,
  ]
  const preservePlayingPersonalTrack = Boolean(
    playingId &&
    playingId === selection.trackId &&
    !playingId.startsWith('faction:') &&
    listTracks.some((track) => track.id === playingId),
  )
  const selectedId = preservePlayingPersonalTrack
    ? playingId
    : selection.contextKey === factionContextKey
      ? selection.trackId ?? factionTrack?.id ?? null
      : factionTrack?.id ?? selection.trackId
  const currentTrack = listTracks.find((track) => track.id === selectedId) ?? listTracks[0] ?? null
  const isPlaying = gameAudio?.isPlaying ?? playingId === currentTrack?.id
  const label = gameAudio?.trackLabel || factionMusic?.title || (locale === 'ko' ? '음악' : 'Music')
  const playLabel = locale === 'ko' ? '재생' : 'Play'
  const pauseLabel = locale === 'ko' ? '일시정지' : 'Pause'
  const themeLabel = locale === 'ko' ? '세력도감 테마' : 'Atlas theme'
  const libraryLabel = locale === 'ko' ? '내 감상목록' : 'My listening list'
  const recommendedLabel = locale === 'ko' ? '추천' : 'Recommended'
  const emptyLabel = locale === 'ko' ? '감상목록이 비어 있습니다.' : 'Your listening list is empty.'
  const loginLabel = locale === 'ko' ? '로그인하면 내 감상목록을 볼 수 있습니다.' : 'Sign in to see your listening list.'

  const loadLibrary = useCallback(() => {
    if (loadedRef.current) return
    loadedRef.current = true
    setLoading(true)
    getMyMusicList()
      .then(setTracks)
      .finally(() => setLoading(false))
  }, [])

  const togglePanel = () => {
    setIsOpen((open) => {
      const next = !open
      if (next) loadLibrary()
      return next
    })
  }

  useEffect(() => {
    if (!isOpen) return
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node
      if (!panelRef.current?.contains(target) && !buttonRef.current?.contains(target)) {
        setIsOpen(false)
      }
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false)
        buttonRef.current?.focus()
      }
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [isOpen])

  useEffect(() => {
    if (!pendingPlayRef.current) return
    pendingPlayRef.current = false
    void audioRef.current?.play().catch(() => {})
  }, [selectedId])

  useEffect(() => {
    const audio = audioRef.current
    return () => audio?.pause()
  }, [currentTrack?.id])

  const selectTrack = (track: ListTrack) => {
    if (!track.previewUrl) return
    if (selectedId === track.id) {
      if (audioRef.current?.paused) {
        void audioRef.current.play().catch(() => {})
      } else {
        audioRef.current?.pause()
      }
      return
    }
    pendingPlayRef.current = true
    setSelection({ contextKey: factionContextKey, trackId: track.id })
  }

  const selectGameAudio = () => {
    gameAudio?.togglePlay()
  }

  const buttonZIndex = gameAudio ? Z_INDEX.floatingPlayerGame : Z_INDEX.floatingPlayer
  const panelZIndex = buttonZIndex

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={togglePanel}
        aria-label={label}
        aria-expanded={isOpen}
        title={label}
        className={`fixed bottom-20 end-4 flex size-11 items-center justify-center rounded-full border shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent md:bottom-4 ${
          isOpen || isPlaying
            ? 'border-accent bg-accent/20 text-accent hover:bg-accent/30'
            : 'border-accent/30 bg-bg-card/95 text-accent hover:border-accent hover:bg-accent/10'
        }`}
        style={{ zIndex: buttonZIndex }}
      >
        <Music size={19} aria-hidden="true" />
      </button>

      {isOpen && (
        <div
          ref={panelRef}
          role="dialog"
          aria-label={label}
          className="fixed bottom-36 end-3 w-[min(88vw,22rem)] overflow-hidden rounded-xl border border-border bg-bg-card/95 shadow-2xl backdrop-blur-xl md:bottom-20 md:end-4"
          style={{ zIndex: panelZIndex }}
        >
          <div className="flex items-center justify-between border-b border-border px-3 py-2">
            <span className="flex min-w-0 items-center gap-2 truncate text-xs font-semibold text-text-primary">
              <Music size={14} className="shrink-0 text-accent" aria-hidden="true" />
              {label}
            </span>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              aria-label={locale === 'ko' ? '닫기' : 'Close'}
              className="flex size-6 shrink-0 items-center justify-center rounded text-text-secondary hover:bg-white/10 hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              <X size={14} aria-hidden="true" />
            </button>
          </div>

          <div className="max-h-[min(60vh,24rem)] overflow-y-auto p-2">
            {gameAudio && (
              <section>
                <p className="px-2 pb-1 pt-0.5 text-[10px] font-semibold uppercase tracking-wider text-accent/80">
                  {locale === 'ko' ? '게임 배경음악' : 'Game BGM'}
                </p>
                <button
                  type="button"
                  onClick={selectGameAudio}
                  className="flex w-full items-center gap-2 rounded-lg bg-accent/10 px-2.5 py-2 text-start text-xs text-text-primary hover:bg-accent/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent"
                >
                  {gameAudio.isPlaying ? <Pause size={14} className="shrink-0 text-accent" /> : <Play size={14} className="shrink-0 text-accent" />}
                  <span className="min-w-0 flex-1 truncate">{gameAudio.trackLabel || label}</span>
                  <span className="text-[10px] text-text-secondary">{gameAudio.isPlaying ? pauseLabel : playLabel}</span>
                </button>
              </section>
            )}

            {factionTrack && (
              <section className={gameAudio ? 'mt-3' : undefined}>
                <p className="px-2 pb-1 pt-0.5 text-[10px] font-semibold uppercase tracking-wider text-accent/80">
                  {themeLabel}
                </p>
                <MusicListRow
                  track={factionTrack}
                  active={selectedId === factionTrack.id && isPlaying}
                  recommended={selectedId === factionTrack.id && !isPlaying}
                  recommendedLabel={recommendedLabel}
                  playLabel={playLabel}
                  pauseLabel={pauseLabel}
                  onSelect={() => selectTrack(factionTrack)}
                />
              </section>
            )}

            <section className={factionTrack || gameAudio ? 'mt-3' : undefined}>
              <p className="px-2 pb-1 pt-0.5 text-[10px] font-semibold uppercase tracking-wider text-accent/80">
                {libraryLabel}
              </p>
              {loading && <p className="px-2 py-3 text-xs text-text-secondary">{locale === 'ko' ? '불러오는 중…' : 'Loading…'}</p>}
              {!loading && tracks.length === 0 && (
                <p className="px-2 py-3 text-xs leading-relaxed text-text-secondary">
                  {loginLabel}<br />{emptyLabel}
                </p>
              )}
              {!loading && tracks.map((track) => (
                <MusicListRow
                  key={track.id}
                  track={track}
                  active={selectedId === track.id && isPlaying}
                  recommended={false}
                  recommendedLabel={recommendedLabel}
                  playLabel={playLabel}
                  pauseLabel={pauseLabel}
                  onSelect={() => selectTrack(track)}
                />
              ))}
            </section>
          </div>
        </div>
      )}

      {currentTrack?.previewUrl && (
        <audio
          key={currentTrack.id}
          ref={audioRef}
          src={currentTrack.previewUrl}
          preload="none"
          onPlay={() => setPlayingId(currentTrack.id)}
          onPause={() => setPlayingId(null)}
          onEnded={() => setPlayingId(null)}
        />
      )}
    </>
  )
}

function MusicListRow({
  track,
  active,
  recommended,
  recommendedLabel,
  playLabel,
  pauseLabel,
  onSelect,
}: {
  track: ListTrack
  active: boolean
  recommended: boolean
  recommendedLabel: string
  playLabel: string
  pauseLabel: string
  onSelect: () => void
}) {
  const playable = isFactionTrack(track) || !!track.previewUrl
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={!playable}
      aria-pressed={active}
      className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-start focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent ${
        active
          ? 'bg-accent/15 text-accent'
          : recommended
            ? 'bg-accent/10 text-text-primary ring-1 ring-inset ring-accent/40'
            : 'text-text-primary hover:bg-white/8'
      } ${!playable ? 'cursor-default opacity-50' : ''}`}
    >
      <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-white/8">
        {active ? <Pause size={12} /> : <Play size={12} className="ms-0.5" />}
      </span>
      <span className="min-w-0 flex-1 truncate">
        <span className="block truncate text-xs">{track.title}</span>
        {track.creator && <span className="block truncate text-[10px] text-text-secondary">{track.creator}</span>}
      </span>
      {recommended && <span className="shrink-0 text-[10px] text-accent">{recommendedLabel}</span>}
      {active && <span className="shrink-0 text-[10px] text-accent">{pauseLabel}</span>}
      {!active && playable && !recommended && <span className="sr-only">{playLabel}</span>}
    </button>
  )
}
