'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Loader2, Music, Pause, Play, RotateCcw, RotateCw, Square, X } from 'lucide-react'
import { useLocale } from 'next-intl'
import { Z_INDEX } from '@/constants/zIndex'
import { getFactionMusicList, getMythMusicList, type FactionMusicListItem } from '@/actions/home/getFactionMusicList'
import { getMyMusicList, type MusicTrack } from '@/actions/contents/getMyMusicList'
import { useGameAudioContext } from '@/contexts/GameAudioContext'
import { useFactionMusicContext } from '@/contexts/FactionMusicContext'
import { READING_PLAYBACK_RATES } from '@/hooks/useReadingNarration'

interface FactionTrack {
  id: string
  title: string
  creator: string | null
  previewUrl: string
  slug?: string | null
}

type ListTrack = MusicTrack | FactionTrack
type MusicMode = 'faction' | 'myth' | 'library'
type AudioStatus = 'idle' | 'loading' | 'playing' | 'paused'

const isThemeTrack = (track: ListTrack): track is FactionTrack => track.id.startsWith('faction:') || track.id.startsWith('myth:')

/** 우하단 아이콘에서 현재 테마곡과 사용자의 감상목록을 고르는 작은 음악 목록. */
export default function FloatingMusicPlayer() {
  const locale = useLocale()
  const { controls: gameAudio } = useGameAudioContext()
  const { music: contextMusic } = useFactionMusicContext()
  const [isOpen, setIsOpen] = useState(false)
  const [mode, setMode] = useState<MusicMode | 'auto'>('auto')
  const [tracks, setTracks] = useState<MusicTrack[]>([])
  const [factionTracks, setFactionTracks] = useState<FactionMusicListItem[]>([])
  const [mythTracks, setMythTracks] = useState<FactionMusicListItem[]>([])
  const [loading, setLoading] = useState(false)
  const [playingId, setPlayingId] = useState<string | null>(null)
  const [audioStatus, setAudioStatus] = useState<AudioStatus>('idle')
  const [audioCurrentTime, setAudioCurrentTime] = useState(0)
  const [audioDuration, setAudioDuration] = useState(0)
  const [playbackRate, setPlaybackRate] = useState(1)
  const [selection, setSelection] = useState<{ contextKey: string | null; trackId: string | null }>({
    contextKey: null,
    trackId: null,
  })
  const loadedRef = useRef(false)
  const pendingPlayRef = useRef(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const buttonRef = useRef<HTMLButtonElement | null>(null)
  const panelRef = useRef<HTMLDivElement | null>(null)

  const factionMusic = contextMusic?.kind === 'myth' ? null : contextMusic
  const mythMusic = contextMusic?.kind === 'myth' ? contextMusic : null
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
  const catalogMythTracks: FactionTrack[] = mythTracks.map((track) => ({
    id: `myth:${track.id}`,
    title: locale === 'en' ? track.name_en?.trim() || track.name : track.name,
    creator: null,
    previewUrl: track.url,
    slug: track.slug,
  }))
  const mythTrack: FactionTrack | null = mythMusic
    ? {
        id: `myth:${mythMusic.id}`,
        title: mythMusic.title,
        creator: null,
        previewUrl: mythMusic.url,
      }
    : null
  const contextTrack = mythTrack ?? factionTrack
  const contextKey = contextTrack?.id ?? null
  const listTracks: ListTrack[] = [
    ...(factionTrack ? [factionTrack] : []),
    ...catalogFactionTracks,
    ...(mythTrack ? [mythTrack] : []),
    ...catalogMythTracks,
    ...tracks,
  ].filter((track, index, all) => all.findIndex((candidate) => candidate.id === track.id) === index)
  const factionRows = listTracks.filter((track) => track.id.startsWith('faction:'))
  const mythRows = listTracks.filter((track) => track.id.startsWith('myth:'))
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
    : selection.contextKey === contextKey
      ? selection.trackId ?? contextTrack?.id ?? null
      : contextTrack?.id ?? selection.trackId
  const currentTrack = listTracks.find((track) => track.id === selectedId) ?? listTracks[0] ?? null
  const activeMode: MusicMode = mode === 'auto'
    ? contextMusic?.kind === 'myth' ? 'myth' : 'faction'
    : mode
  const isTrackPlaying = playingId === currentTrack?.id
  const isGamePlaying = Boolean(gameAudio?.isPlaying)
  const isPlaying = isGamePlaying || isTrackPlaying
  const currentPlayerTime = isGamePlaying && gameAudio ? gameAudio.currentTime : audioCurrentTime
  const currentPlayerDuration = isGamePlaying && gameAudio ? gameAudio.duration : audioDuration
  const currentPlayerLoading = !isGamePlaying && audioStatus === 'loading'
  const currentPlayerPlayable = isGamePlaying || Boolean(currentTrack?.previewUrl)
  const label = gameAudio?.trackLabel || contextMusic?.title || (locale === 'ko' ? '음악' : 'Music')
  const playLabel = locale === 'ko' ? '재생' : 'Play'
  const pauseLabel = locale === 'ko' ? '일시정지' : 'Pause'
  const themeLabel = locale === 'ko' ? '테마' : 'Theme'
  const factionLabel = locale === 'ko' ? '세력' : 'Faction'
  const libraryLabel = locale === 'ko' ? '내 감상목록' : 'My listening list'
  const recommendedLabel = locale === 'ko' ? '추천' : 'Recommended'
  const emptyLabel = locale === 'ko' ? '감상목록이 비어 있습니다.' : 'Your listening list is empty.'
  const loginLabel = locale === 'ko' ? '로그인하면 내 감상목록을 볼 수 있습니다.' : 'Sign in to see your listening list.'

  const stopLabel = locale === 'ko' ? '정지' : 'Stop'
  const backLabel = locale === 'ko' ? '10초 뒤로' : 'Back 10 seconds'
  const forwardLabel = locale === 'ko' ? '10초 앞으로' : 'Forward 10 seconds'
  const positionLabel = locale === 'ko' ? '재생 위치' : 'Playback position'
  const speedLabel = locale === 'ko' ? '재생 속도' : 'Playback speed'

  const mythLabel = locale === 'ko' ? '신화 테마' : 'Myth themes'
  const mythEmptyLabel = locale === 'ko' ? '등록된 신화 테마곡이 없습니다.' : 'No mythology theme music is registered.'

  const loadLibrary = useCallback(() => {
    if (loadedRef.current) return
    loadedRef.current = true
    setLoading(true)
    Promise.all([getFactionMusicList(), getMythMusicList(), getMyMusicList()])
      .then(([factionList, mythList, personalList]) => {
        setFactionTracks(factionList)
        setMythTracks(mythList)
        setTracks(personalList)
      })
      .catch(() => {
        setFactionTracks([])
        setMythTracks([])
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
    const audio = audioRef.current
    if (!audio) return
    if (audio.readyState >= 2) {
      void audio.play().catch(() => {})
      return
    }
    const playWhenReady = () => void audio.play().catch(() => {})
    audio.addEventListener('canplay', playWhenReady, { once: true })
    return () => audio.removeEventListener('canplay', playWhenReady)
  }, [selectedId])

  useEffect(() => {
    const audio = audioRef.current
    return () => audio?.pause()
  }, [currentTrack?.id])

  const selectTrack = (track: ListTrack) => {
    if (!track.previewUrl) return
    if (gameAudio?.isPlaying) gameAudio.togglePlay()
    if (selectedId === track.id) {
      if (audioRef.current?.paused) {
        void audioRef.current.play().catch(() => {})
      } else {
        audioRef.current?.pause()
      }
      return
    }
    setAudioStatus('loading')
    setAudioCurrentTime(0)
    setAudioDuration(0)
    pendingPlayRef.current = true
    setSelection({ contextKey, trackId: track.id })
  }

  const selectGameAudio = () => {
    const audio = audioRef.current
    if (playingId && audio && !audio.paused) audio.pause()
    gameAudio?.togglePlay()
  }

  const seekCurrent = (time: number) => {
    const nextTime = Math.max(0, Math.min(time, currentPlayerDuration || 0))
    if (isGamePlaying && gameAudio) {
      gameAudio.seek(nextTime)
      return
    }
    const audio = audioRef.current
    if (!audio || !Number.isFinite(nextTime)) return
    audio.currentTime = nextTime
    setAudioCurrentTime(nextTime)
  }

  const stopCurrent = () => {
    if (isGamePlaying && gameAudio) {
      gameAudio.seek(0)
      if (gameAudio.isPlaying) gameAudio.togglePlay()
      return
    }
    const audio = audioRef.current
    if (!audio) return
    audio.pause()
    audio.currentTime = 0
    setPlayingId(null)
    setAudioStatus('idle')
    setAudioCurrentTime(0)
  }

  const toggleCurrent = () => {
    if (isGamePlaying) {
      gameAudio?.togglePlay()
      return
    }
    if (currentTrack) selectTrack(currentTrack)
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
          className="fixed bottom-36 end-3 w-[min(90vw,23rem)] overflow-hidden rounded-[1.25rem] border border-accent/20 bg-[#121212] shadow-[0_18px_60px_rgba(0,0,0,0.55)] md:bottom-20 md:end-4"
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

          {(currentTrack || isGamePlaying) && (
            <div className="mx-3 mt-3 rounded-xl border border-accent/20 bg-[#0d0d0d] p-3">
              <div className="min-w-0">
                <p className="text-[9px] font-semibold uppercase tracking-[0.15em] text-accent/70">{isPlaying ? nowPlayingLabel : selectedLabel}</p>
                <p className="mt-0.5 truncate text-xs font-medium text-text-primary">{isGamePlaying ? gameAudio?.trackLabel || label : currentTrack?.title}</p>
                {!isGamePlaying && currentTrack?.creator && <p className="truncate text-[10px] text-text-secondary">{currentTrack.creator}</p>}
              </div>
              <MusicTransport
                isPlaying={isPlaying}
                loading={currentPlayerLoading}
                currentTime={currentPlayerTime}
                duration={currentPlayerDuration}
                playbackRate={playbackRate}
                playLabel={playLabel}
                pauseLabel={pauseLabel}
                stopLabel={stopLabel}
                backLabel={backLabel}
                forwardLabel={forwardLabel}
                positionLabel={positionLabel}
                speedLabel={speedLabel}
                onToggle={toggleCurrent}
                onStop={stopCurrent}
                onBack={() => seekCurrent(currentPlayerTime - 10)}
                onForward={() => seekCurrent(currentPlayerTime + 10)}
                onSeek={seekCurrent}
                onPlaybackRateChange={(rate) => {
                  setPlaybackRate(rate)
                  if (audioRef.current) {
                    audioRef.current.defaultPlaybackRate = rate
                    audioRef.current.playbackRate = rate
                  }
                }}
                playable={currentPlayerPlayable}
                showRate={!isGamePlaying}
              />
            </div>
          )}

          <div className="mx-3 mt-3 flex gap-1 rounded-lg border border-white/8 bg-black/20 p-1">
            <MusicModeChip active={activeMode === 'faction'} onClick={() => setMode('faction')}>
              <span className="inline-flex items-center gap-1">
                <span>{themeLabel}</span>
                <span aria-hidden className="text-[9px] opacity-45">›</span>
                <span className="text-accent/90">{factionLabel}</span>
              </span>
              <span className="ms-1.5 tabular-nums opacity-60">{factionRows.length}</span>
            </MusicModeChip>
            <MusicModeChip active={activeMode === 'myth'} onClick={() => setMode('myth')}>
              <span>{mythLabel}</span>
              <span className="ms-1.5 tabular-nums opacity-60">{mythRows.length}</span>
            </MusicModeChip>
            <MusicModeChip active={activeMode === 'library'} onClick={() => setMode('library')}>
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

            {activeMode === 'faction' && (factionTrack || factionRows.length > 0) && (
              <section className={gameAudio ? 'mt-3' : undefined}>
                <p className="px-2 pb-1 pt-0.5 text-[10px] font-semibold uppercase tracking-wider text-accent/80">
                  <span className="inline-flex items-center gap-1">
                    <span>{themeLabel}</span>
                    <span aria-hidden className="text-[9px] opacity-45">›</span>
                    <span>{factionLabel}</span>
                  </span>
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

            {activeMode === 'faction' && !loading && factionRows.length === 0 && (
              <p className="px-2 py-3 text-xs text-text-secondary">{factionEmptyLabel}</p>
            )}

            {activeMode === 'faction' && loading && (
              <p className="px-2 py-3 text-xs text-text-secondary">{locale === 'ko' ? '불러오는 중…' : 'Loading…'}</p>
            )}

            {activeMode === 'myth' && mythRows.length > 0 && (
              <section className={gameAudio ? 'mt-3' : undefined}>
                <p className="px-2 pb-1 pt-0.5 text-[10px] font-semibold uppercase tracking-wider text-accent/80">
                  {mythLabel}
                </p>
                {mythRows.map((track) => (
                  <MusicListRow
                    key={track.id}
                    track={track}
                    active={selectedId === track.id && isPlaying}
                    recommended={!!mythTrack && track.id === mythTrack.id && !isPlaying}
                    recommendedLabel={recommendedLabel}
                    playLabel={playLabel}
                    pauseLabel={pauseLabel}
                    onSelect={() => selectTrack(track)}
                  />
                ))}
              </section>
            )}

            {activeMode === 'myth' && !loading && mythRows.length === 0 && (
              <p className="px-2 py-3 text-xs text-text-secondary">{mythEmptyLabel}</p>
            )}

            {activeMode === 'myth' && loading && (
              <p className="px-2 py-3 text-xs text-text-secondary">Loading...</p>
            )}

            {activeMode === 'library' && (
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
          preload="metadata"
          onLoadStart={() => {
            setAudioStatus('loading')
            setAudioCurrentTime(0)
            setAudioDuration(0)
          }}
          onLoadedMetadata={(event) => {
            const audio = event.currentTarget
            audio.defaultPlaybackRate = playbackRate
            audio.playbackRate = playbackRate
            setAudioDuration(Number.isFinite(audio.duration) ? audio.duration : 0)
            setAudioStatus((status) => status === 'playing' ? status : 'idle')
          }}
          onDurationChange={(event) => setAudioDuration(Number.isFinite(event.currentTarget.duration) ? event.currentTarget.duration : 0)}
          onTimeUpdate={(event) => setAudioCurrentTime(event.currentTarget.currentTime)}
          onWaiting={() => setAudioStatus('loading')}
          onPlaying={() => {
            setPlayingId(currentTrack.id)
            setAudioStatus('playing')
          }}
          onPlay={() => setPlayingId(currentTrack.id)}
          onPause={() => {
            setPlayingId(null)
            setAudioStatus((status) => status === 'idle' ? status : 'paused')
          }}
          onEnded={(event) => {
            event.currentTarget.currentTime = 0
            setPlayingId(null)
            setAudioStatus('idle')
            setAudioCurrentTime(0)
          }}
          onError={() => {
            setPlayingId(null)
            setAudioStatus('idle')
            setAudioDuration(0)
          }}
        />
      )}
    </>
  )
}

function formatTime(seconds: number) {
  const value = Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0
  return `${Math.floor(value / 60)}:${String(value % 60).padStart(2, '0')}`
}

function MusicTransport({
  isPlaying,
  loading,
  currentTime,
  duration,
  playbackRate,
  playLabel,
  pauseLabel,
  stopLabel,
  backLabel,
  forwardLabel,
  positionLabel,
  speedLabel,
  onToggle,
  onStop,
  onBack,
  onForward,
  onSeek,
  onPlaybackRateChange,
  playable,
  showRate,
}: {
  isPlaying: boolean
  loading: boolean
  currentTime: number
  duration: number
  playbackRate: number
  playLabel: string
  pauseLabel: string
  stopLabel: string
  backLabel: string
  forwardLabel: string
  positionLabel: string
  speedLabel: string
  onToggle: () => void
  onStop: () => void
  onBack: () => void
  onForward: () => void
  onSeek: (time: number) => void
  onPlaybackRateChange: (rate: number) => void
  playable: boolean
  showRate: boolean
}) {
  const safeDuration = Number.isFinite(duration) && duration > 0 ? duration : 0
  const safeTime = Math.max(0, Math.min(currentTime, safeDuration))
  const progress = safeDuration ? (safeTime / safeDuration) * 100 : 0

  return (
    <div className="mt-3">
      <div className="mx-auto grid w-fit grid-cols-5 items-center gap-1.5">
        <PlayerButton label={stopLabel} onClick={onStop} disabled={!isPlaying && safeTime === 0}>
          <Square size={14} aria-hidden="true" />
        </PlayerButton>
        <PlayerButton label={backLabel} onClick={onBack} disabled={safeTime <= 0}>
          <RotateCcw size={14} strokeWidth={1.6} aria-hidden="true" />
          <span className="text-[10px] font-medium leading-none tabular-nums">10</span>
        </PlayerButton>
        <PlayerButton label={loading ? 'Loading' : isPlaying ? pauseLabel : playLabel} onClick={onToggle} disabled={!playable} busy={loading} primary>
          {loading ? <Loader2 size={17} className="animate-spin" aria-hidden="true" /> : isPlaying ? <Pause size={17} aria-hidden="true" /> : <Play size={17} aria-hidden="true" />}
        </PlayerButton>
        <PlayerButton label={forwardLabel} onClick={onForward} disabled={!safeDuration || safeTime >= safeDuration}>
          <RotateCw size={14} strokeWidth={1.6} aria-hidden="true" />
          <span className="text-[10px] font-medium leading-none tabular-nums">10</span>
        </PlayerButton>
        {showRate ? (
          <select
            aria-label={speedLabel}
            title={speedLabel}
            value={playbackRate}
            onChange={(event) => onPlaybackRateChange(Number(event.target.value))}
            className="h-10 w-11 cursor-pointer appearance-none rounded-lg border border-white/20 bg-black/20 text-center text-[11px] font-medium tabular-nums text-text-secondary hover:border-accent/60 hover:bg-accent/10 hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            {READING_PLAYBACK_RATES.map((rate) => <option className="bg-bg-card" key={rate} value={rate}>{rate}×</option>)}
          </select>
        ) : <span className="h-10 w-11" aria-hidden="true" />}
      </div>
      <div className="relative mx-auto mt-1.5 h-7 w-full max-w-[15.25rem] text-[10px] tabular-nums text-text-secondary">
        <input
          type="range"
          min={0}
          max={safeDuration}
          step={0.1}
          value={safeTime}
          onChange={(event) => onSeek(Number(event.target.value))}
          disabled={!safeDuration}
          aria-label={positionLabel}
          aria-valuetext={`${formatTime(safeTime)} / ${formatTime(safeDuration)}`}
          style={{ background: `linear-gradient(to right, var(--color-accent) ${progress}%, var(--color-stone-light) ${progress}%) center / 100% 3px no-repeat` }}
          className="absolute start-8 end-8 top-0 h-7 cursor-pointer appearance-none bg-transparent accent-accent hover:brightness-125 disabled:cursor-default disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent [&::-webkit-slider-runnable-track]:h-[3px] [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-runnable-track]:bg-transparent [&::-webkit-slider-thumb]:-mt-[3px] [&::-webkit-slider-thumb]:size-[9px] [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-accent [&::-moz-range-track]:h-[3px] [&::-moz-range-track]:rounded-full [&::-moz-range-track]:bg-transparent [&::-moz-range-thumb]:size-[9px] [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-accent"
        />
        <span className="pointer-events-none absolute start-1 top-1/2 z-10 -translate-y-1/2 text-text-secondary [text-shadow:0_1px_3px_rgba(0,0,0,.95)]">{formatTime(safeTime)}</span>
        <span className="pointer-events-none absolute end-1 top-1/2 z-10 -translate-y-1/2 text-text-secondary [text-shadow:0_1px_3px_rgba(0,0,0,.95)]">{formatTime(safeDuration)}</span>
      </div>
    </div>
  )
}

function PlayerButton({
  label,
  onClick,
  children,
  disabled = false,
  busy = false,
  primary = false,
}: {
  label: string
  onClick: () => void
  children: React.ReactNode
  disabled?: boolean
  busy?: boolean
  primary?: boolean
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-busy={busy || undefined}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className={`relative flex h-10 w-11 shrink-0 items-center justify-center gap-1 rounded-lg border enabled:hover:border-accent/60 enabled:hover:bg-accent/15 enabled:hover:text-accent enabled:active:bg-accent/25 disabled:cursor-default disabled:opacity-45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${primary ? 'border-accent/45 bg-accent/10 text-accent' : 'border-white/20 bg-black/20 text-text-secondary'}`}
    >
      {children}
    </button>
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
  const playable = isThemeTrack(track) || !!track.previewUrl
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
