'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Music, Pause, Play, X } from 'lucide-react'
import { useLocale } from 'next-intl'
import { Z_INDEX } from '@/constants/zIndex'
import { getFactionMusicList, type FactionMusicListItem } from '@/actions/home/getFactionMusicList'
import { getMyMusicList, type MusicTrack } from '@/actions/contents/getMyMusicList'
import { useGameAudioContext } from '@/contexts/GameAudioContext'
import { useFactionMusicContext } from '@/contexts/FactionMusicContext'

interface FactionTrack {
  id: string
  title: string
  creator: string | null
  previewUrl: string
  slug?: string | null
}

type ListTrack = MusicTrack | FactionTrack
type MusicMode = 'faction' | 'library'

const isFactionTrack = (track: ListTrack): track is FactionTrack => track.id.startsWith('faction:')

/** 우하단 아이콘에서 현재 테마곡과 사용자의 감상목록을 고르는 작은 음악 목록. */
export default function FloatingMusicPlayer() {
  const locale = useLocale()
  const { controls: gameAudio } = useGameAudioContext()
  const { music: factionMusic } = useFactionMusicContext()
  const [isOpen, setIsOpen] = useState(false)
  const [mode, setMode] = useState<MusicMode>('faction')
  const [tracks, setTracks] = useState<MusicTrack[]>([])
  const [factionTracks, setFactionTracks] = useState<FactionMusicListItem[]>([])
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
  const catalogFactionTracks: FactionTrack[] = factionTracks.map((track) => ({
    id: `faction:${track.id}`,
    title: locale === 'en' ? track.name_en?.trim() || track.name : track.name,
    creator: null,
    previewUrl: track.url,
    slug: track.slug,
  }))
  const factionContextKey = factionTrack?.id ?? null
  const listTracks: ListTrack[] = [
    ...(factionTrack ? [factionTrack] : []),
    ...catalogFactionTracks,
    ...tracks,
  ].filter((track, index, all) => all.findIndex((candidate) => candidate.id === track.id) === index)
  const factionRows = listTracks.filter(isFactionTrack)
  const factionEmptyLabel = locale === 'ko' ? '등록된 세력도감 테마곡이 없습니다.' : 'No atlas theme music is registered.'
  const eyebrowLabel = locale === 'ko' ? '사운드 아카이브' : 'SOUND ARCHIVE'
  const nowPlayingLabel = locale === 'ko' ? '지금 재생 중' : 'NOW PLAYING'
  const selectedLabel = locale === 'ko' ? '선택한 곡' : 'SELECTED TRACK'
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
    Promise.all([getFactionMusicList(), getMyMusicList()])
      .then(([factionList, personalList]) => {
        setFactionTracks(factionList)
        setTracks(personalList)
      })
      .catch(() => {
        setFactionTracks([])
        setTracks([])
      })
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
          className="fixed bottom-36 end-3 w-[min(90vw,23rem)] overflow-hidden rounded-[1.25rem] border border-accent/20 bg-[radial-gradient(circle_at_top_right,rgba(212,175,55,0.12),transparent_42%),rgba(18,18,18,0.97)] shadow-[0_18px_60px_rgba(0,0,0,0.55)] backdrop-blur-xl md:bottom-20 md:end-4"
          style={{ zIndex: panelZIndex }}
        >
          <div className="flex items-start justify-between border-b border-white/8 px-4 pb-3 pt-3.5">
            <div className="min-w-0">
              <p className="mb-1 text-[9px] font-semibold uppercase tracking-[0.22em] text-accent/70">{eyebrowLabel}</p>
              <p className="truncate text-sm font-semibold tracking-tight text-text-primary">{label}</p>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              aria-label={locale === 'ko' ? '닫기' : 'Close'}
              className="flex size-7 shrink-0 items-center justify-center rounded-full text-text-secondary hover:bg-white/10 hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              <X size={14} aria-hidden="true" />
            </button>
          </div>

          {currentTrack && (
            <div className="mx-3 mt-3 flex items-center gap-3 rounded-xl border border-accent/20 bg-black/20 px-3 py-2.5">
              <span className={`relative flex size-9 shrink-0 items-center justify-center rounded-lg border ${isPlaying ? 'border-accent/50 bg-accent/15 text-accent' : 'border-white/10 bg-white/5 text-text-secondary'}`}>
                <Music size={16} aria-hidden="true" />
                {isPlaying && <span className="absolute -right-1 -top-1 size-2 rounded-full bg-accent shadow-[0_0_10px_rgba(212,175,55,0.8)]" />}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[9px] font-semibold uppercase tracking-[0.15em] text-accent/70">{isPlaying ? nowPlayingLabel : selectedLabel}</p>
                <p className="mt-0.5 truncate text-xs font-medium text-text-primary">{currentTrack.title}</p>
                {currentTrack.creator && <p className="truncate text-[10px] text-text-secondary">{currentTrack.creator}</p>}
              </div>
              <button
                type="button"
                onClick={() => selectTrack(currentTrack)}
                aria-label={isPlaying ? pauseLabel : playLabel}
                className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent text-bg-main hover:bg-accent/85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                {isPlaying ? <Pause size={13} fill="currentColor" aria-hidden="true" /> : <Play size={13} fill="currentColor" className="ms-0.5" aria-hidden="true" />}
              </button>
            </div>
          )}

          <div className="mx-3 mt-3 flex rounded-lg border border-white/8 bg-black/20 p-1">
            <MusicModeChip active={mode === 'faction'} onClick={() => setMode('faction')}>
              <span>{themeLabel}</span>
              <span className="ms-1.5 tabular-nums opacity-60">{factionRows.length}</span>
            </MusicModeChip>
            <MusicModeChip active={mode === 'library'} onClick={() => setMode('library')}>
              <span>{libraryLabel}</span>
              <span className="ms-1.5 tabular-nums opacity-60">{tracks.length}</span>
            </MusicModeChip>
          </div>

          <div className="max-h-[min(56vh,22rem)] overflow-y-auto px-3 pb-3 pt-3">
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

            {mode === 'faction' && (factionTrack || factionRows.length > 0) && (
              <section className={gameAudio ? 'mt-3' : undefined}>
                <p className="px-2 pb-1 pt-0.5 text-[10px] font-semibold uppercase tracking-wider text-accent/80">
                  {themeLabel}
                </p>
                {factionRows.map((track) => (
                  <MusicListRow
                    key={track.id}
                    track={track}
                    active={selectedId === track.id && isPlaying}
                    recommended={!!factionTrack && track.id === factionTrack.id && !isPlaying}
                    recommendedLabel={recommendedLabel}
                    playLabel={playLabel}
                    pauseLabel={pauseLabel}
                    onSelect={() => selectTrack(track)}
                  />
                ))}
              </section>
            )}

            {mode === 'faction' && !loading && factionRows.length === 0 && (
              <p className="px-2 py-3 text-xs text-text-secondary">{factionEmptyLabel}</p>
            )}

            {mode === 'faction' && loading && (
              <p className="px-2 py-3 text-xs text-text-secondary">{locale === 'ko' ? '불러오는 중…' : 'Loading…'}</p>
            )}

            {mode === 'library' && (
            <section className={gameAudio ? 'mt-3' : undefined}>
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
            )}
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

function MusicModeChip({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`flex flex-1 items-center justify-center whitespace-nowrap rounded-md px-2.5 py-1.5 text-[11px] font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent ${
        active
          ? 'bg-accent/15 text-accent shadow-[0_1px_8px_rgba(212,175,55,0.08)]'
          : 'text-text-secondary hover:bg-white/8 hover:text-text-primary'
      }`}
    >
      {children}
    </button>
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
      className={`group/track flex w-full items-center gap-2 rounded-xl border px-2.5 py-2.5 text-start focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent ${
        active
          ? 'border-accent/25 bg-accent/12 text-accent'
          : recommended
            ? 'border-accent/25 bg-accent/8 text-text-primary'
            : 'border-transparent text-text-primary hover:border-white/8 hover:bg-white/5'
      } ${!playable ? 'cursor-default opacity-50' : ''}`}
    >
      <span className={`flex size-7 shrink-0 items-center justify-center rounded-full border ${active || recommended ? 'border-accent/35 bg-accent/10 text-accent' : 'border-white/10 bg-white/5 text-text-secondary group-hover/track:border-accent/30 group-hover/track:text-accent'}`}>
        {active ? <Pause size={12} /> : <Play size={12} className="ms-0.5" />}
      </span>
      <span className="min-w-0 flex-1 truncate">
        <span className="block truncate text-[12px] font-medium">{track.title}</span>
        {track.creator && <span className="block truncate text-[10px] text-text-secondary">{track.creator}</span>}
      </span>
      {recommended && <span className="shrink-0 text-[10px] text-accent">{recommendedLabel}</span>}
      {active && <span className="shrink-0 text-[10px] text-accent">{pauseLabel}</span>}
      {!active && playable && !recommended && <span className="sr-only">{playLabel}</span>}
    </button>
  )
}
