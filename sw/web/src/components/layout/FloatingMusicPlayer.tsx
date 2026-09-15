'use client'

/*
  음악 재생기. 여는 단추·창·오디오를 한 벌만 두고, 단추와 창은 화면 형편에 맞는 자리로 옮겨 세운다(musicPlayerSlots).
  - 휴대폰: 하단 내비 마지막 칸이 여는 단추다. 창은 내비(와 그 위에 붙은 띠) 바로 위로 올라온다.
  - PC: 헤더 프로필 옆 아이콘이 여는 단추다. 창은 그 아래로 내려온다.
  - 게임 전체 화면: 헤더·내비가 가려지므로 떠 있는 단추로 돌아간다.
  창 윗부분과 목록 행은 높이를 고정해 재생 상태가 바뀌어도 움직이지 않고, 높이가 바뀌는 목록 칸만 AnimatedHeight로 감싼다.
  테마곡이 있는 화면에 들어오면 여는 단추가 퍼지며 알리고, 테마곡을 듣던 중이면 새 화면의 곡으로 한 번 넘긴다.
*/

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from 'react'
import { createPortal } from 'react-dom'
import { Check, ChevronDown, ListMusic, Loader2, Music, Pause, Play, RotateCcw, RotateCw, Square, X } from 'lucide-react'
import { useLocale } from 'next-intl'
import AnimatedHeight from '@/components/ui/AnimatedHeight'
import { PendingBlock } from '@/components/ui/pending'
import { Z_INDEX } from '@/constants/zIndex'
import { cn } from '@/lib/utils'
import { getFactionMusicList, getMythMusicList, type FactionMusicListItem, type FactionMusicTheme } from '@/actions/home/getFactionMusicList'
import { getMyMusicList, type MusicTrack } from '@/actions/contents/getMyMusicList'
import { useGameAudioContext } from '@/contexts/GameAudioContext'
import { useFactionMusicContext } from '@/contexts/FactionMusicContext'
import { READING_PLAYBACK_RATES } from '@/hooks/useReadingNarration'
import { useGameFullScreenLayer, useMusicHeaderSlot, useMusicNavPanelSlot, useMusicNavTabSlot } from './musicPlayerSlots'

interface FactionTrack {
  id: string
  title: string
  creator: string | null
  previewUrl: string
  slug?: string | null
  theme?: FactionMusicTheme | null
}

type ListTrack = MusicTrack | FactionTrack
type MusicMode = 'faction' | 'myth' | 'library'
type ThemePrefix = 'faction' | 'myth'
type AudioStatus = 'idle' | 'loading' | 'playing' | 'paused'
type RowState = 'idle' | 'loading' | 'paused' | 'playing'
type Placement = 'nav' | 'header' | 'floating'

// 목록 종류. 늘어나면 여기와 COPY.modes에만 더한다.
const MUSIC_MODES: MusicMode[] = ['faction', 'myth', 'library']

const COPY = {
  ko: {
    music: '음악',
    listPicker: '재생 목록',
    modes: { faction: '세력도감 테마곡', myth: '신화 테마곡', library: '내 감상목록' },
    status: { playing: '재생 중', loading: '불러오는 중', paused: '일시정지', idle: '재생 대기', recommended: '이 화면의 테마곡' },
    pickTrack: '목록에서 곡을 골라 주세요',
    play: '재생',
    pause: '일시정지',
    stop: '정지',
    close: '닫기',
    back: '10초 뒤로',
    forward: '10초 앞으로',
    position: '재생 위치',
    speed: '재생 속도',
    loading: '음악 목록을 불러오는 중입니다.',
    recommended: '추천',
    gameBgm: '게임 배경음악',
    unassignedTheme: '테마 미지정',
    factionEmpty: '등록된 세력도감 테마곡이 없습니다.',
    mythEmpty: '등록된 신화 테마곡이 없습니다.',
    libraryEmpty: '감상목록에 담은 음악이 여기에 표시됩니다.',
    libraryHint: '로그인한 뒤 음악을 기록하면 바로 들을 수 있습니다.',
  },
  en: {
    music: 'Music',
    listPicker: 'Playlist',
    modes: { faction: 'Atlas theme music', myth: 'Myth theme music', library: 'My listening list' },
    status: { playing: 'Now playing', loading: 'Loading', paused: 'Paused', idle: 'Ready', recommended: 'Theme for this page' },
    pickTrack: 'Choose a track from the list',
    play: 'Play',
    pause: 'Pause',
    stop: 'Stop',
    close: 'Close',
    back: 'Back 10 seconds',
    forward: 'Forward 10 seconds',
    position: 'Playback position',
    speed: 'Playback speed',
    loading: 'Loading the music list.',
    recommended: 'Pick',
    gameBgm: 'Game BGM',
    unassignedTheme: 'Unassigned theme',
    factionEmpty: 'No atlas theme music is registered.',
    mythEmpty: 'No mythology theme music is registered.',
    libraryEmpty: 'Music from your listening list appears here.',
    libraryHint: 'Sign in and log music to play it here.',
  },
}

// 아이콘 크기는 세 단계만 쓴다. 선 굵기는 크기와 무관하게 같은 픽셀로 그려 작은 아이콘만 가늘어 보이지 않게 한다.
// 속이 찬 도형(정지)은 같은 크기에서도 커 보이므로 나란히 놓인 선 아이콘보다 한 단계 작게 쓴다.
// 헤더·하단 내비에 선 여는 단추만은 옆 아이콘(20px, 기본 선 굵기)에 맞춘다.
const ICON = { sm: 14, md: 18, lg: 22 } as const
const ICON_PROPS = { strokeWidth: 1.75, absoluteStrokeWidth: true, 'aria-hidden': true } as const
const NEIGHBOR_ICON_SIZE = 20

const PANEL_BASE =
  'overflow-hidden rounded-[22px] border border-white/10 bg-[#161615] shadow-[0_32px_80px_-20px_rgba(0,0,0,0.85),0_0_0_1px_rgba(0,0,0,0.5)]'

// 자리마다 창이 서는 위치·목록 최대 높이·등장 방향. 가운데 정렬은 translate 속성이 맡으므로 등장 연출의 transform과 겹치지 않는다.
const PANEL_LAYOUT: Record<Placement, { className: string; listClassName: string; offsetY: number; zIndex?: number }> = {
  // 하단 내비 위 자리 안에서 음악 칸 위로 선다
  nav: {
    className: 'pointer-events-auto absolute bottom-2 end-2 w-[min(calc(100vw-1rem),22.5rem)] origin-bottom-right',
    listClassName: 'max-h-[min(34vh,19rem)]',
    offsetY: 12,
  },
  // 헤더 음악 아이콘 아래로 내려온다
  header: {
    className: 'fixed end-6 top-[4.5rem] w-[22.5rem] origin-top-right',
    listClassName: 'max-h-[min(50vh,22rem)]',
    offsetY: -8,
    zIndex: Z_INDEX.dropdown,
  },
  // 게임 전체 화면 위: 휴대폰은 화면 가운데, PC는 오른쪽 아래 단추 위
  floating: {
    className:
      'fixed left-1/2 top-1/2 w-[min(92vw,22.5rem)] origin-center -translate-x-1/2 -translate-y-1/2 md:bottom-20 md:end-4 md:left-auto md:top-auto md:origin-bottom-right md:translate-x-0 md:translate-y-0',
    listClassName: 'max-h-[min(40vh,19rem)] md:max-h-[min(50vh,22rem)]',
    offsetY: 12,
    zIndex: Z_INDEX.floatingPlayerGame,
  },
}

const panelMotion = (offsetY: number): Keyframe[] => [
  { opacity: 0, transform: `translateY(${offsetY}px) scale(0.97)` },
  { opacity: 1, transform: 'translateY(0) scale(1)' },
]

// 테마곡 알림. 고리가 퍼지는 동안 음표가 종처럼 흔들린다.
const PULSE_RING_CLASS = 'pointer-events-none absolute border-2 border-accent opacity-0'
const PULSE_RING_MOTION: Keyframe[] = [
  { transform: 'scale(1)', opacity: 0.9 },
  { transform: 'scale(1.9)', opacity: 0 },
]
const PULSE_ICON_MOTION: Keyframe[] = [
  { transform: 'rotate(0deg)' },
  { transform: 'rotate(-16deg)', offset: 0.12 },
  { transform: 'rotate(14deg)', offset: 0.26 },
  { transform: 'rotate(-9deg)', offset: 0.4 },
  { transform: 'rotate(5deg)', offset: 0.54 },
  { transform: 'rotate(0deg)', offset: 0.68 },
  { transform: 'rotate(0deg)' },
]
const PULSE_TIMING: KeyframeAnimationOptions = { duration: 1100, iterations: 3, easing: 'ease-out' }

const EQ_BARS = [
  { height: '65%', delay: '-0.18s' },
  { height: '100%', delay: '-0.42s' },
  { height: '80%', delay: '-0.3s' },
]

const isThemeId = (id: string) => id.startsWith('faction:') || id.startsWith('myth:')

const isThemeTrack = (track: ListTrack): track is FactionTrack => isThemeId(track.id)

const localizedName = (item: { name: string; name_en: string | null }, locale: string) =>
  locale === 'en' ? item.name_en?.trim() || item.name : item.name

// 감상목록 곡만 표지 칸을 가진다. 테마곡은 undefined로 표지 칸 자체를 두지 않는다.
const trackArtwork = (track: ListTrack) => ('thumbnailUrl' in track ? track.thumbnailUrl : undefined)

const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

const toThemeTracks = (items: FactionMusicListItem[], prefix: ThemePrefix, locale: string): FactionTrack[] =>
  items.map((item) => ({
    id: `${prefix}:${item.id}`,
    title: localizedName(item, locale),
    creator: null,
    previewUrl: item.url,
    slug: item.slug,
    theme: item.theme,
  }))

const toContextTrack = (
  music: { id: string; title: string; url: string } | null,
  prefix: ThemePrefix,
  catalog: FactionMusicListItem[],
): FactionTrack | null =>
  music
    ? {
        id: `${prefix}:${music.id}`,
        title: music.title,
        creator: null,
        previewUrl: music.url,
        theme: catalog.find((track) => track.id === music.id)?.theme,
      }
    : null

export default function FloatingMusicPlayer() {
  const locale = useLocale()
  const copy = locale === 'ko' ? COPY.ko : COPY.en
  const { controls: gameAudio } = useGameAudioContext()
  const { music: contextMusic } = useFactionMusicContext()
  const gameLayer = useGameFullScreenLayer()
  const navTabSlot = useMusicNavTabSlot()
  const navPanelSlot = useMusicNavPanelSlot()
  const headerSlot = useMusicHeaderSlot()
  const [isOpen, setIsOpen] = useState(false)
  const [isModeMenuOpen, setIsModeMenuOpen] = useState(false)
  const [modeChoice, setModeChoice] = useState<{ contextKey: string | null; mode: MusicMode } | null>(null)
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
  const closingRef = useRef(false)
  const previousContextKeyRef = useRef<string | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const buttonRef = useRef<HTMLButtonElement | null>(null)
  const pulseRingRef = useRef<HTMLSpanElement | null>(null)
  const openerIconRef = useRef<SVGSVGElement | null>(null)
  const panelRef = useRef<HTMLDivElement | null>(null)
  const listRef = useRef<HTMLDivElement | null>(null)

  // 게임 전체 화면이 헤더·내비를 덮으면 떠 있는 단추로, 아니면 하단 내비(휴대폰)나 헤더(PC) 자리로 들어간다.
  // 자리가 아직 서지 않은 첫 그림에서는 아무것도 그리지 않아, 떠 있는 단추가 잠깐 비쳤다 사라지지 않는다.
  const placement: Placement | null = gameLayer ? 'floating' : navTabSlot ? 'nav' : headerSlot ? 'header' : null
  const layout = PANEL_LAYOUT[placement ?? 'floating']
  const panelOffsetY = layout.offsetY

  const factionTrack = toContextTrack(contextMusic?.kind === 'myth' ? null : contextMusic, 'faction', factionTracks)
  const mythTrack = toContextTrack(contextMusic?.kind === 'myth' ? contextMusic : null, 'myth', mythTracks)
  const contextTrack = mythTrack ?? factionTrack
  const contextKey = contextTrack?.id ?? null
  const listTracks: ListTrack[] = [
    ...(factionTrack ? [factionTrack] : []),
    ...toThemeTracks(factionTracks, 'faction', locale),
    ...(mythTrack ? [mythTrack] : []),
    ...toThemeTracks(mythTracks, 'myth', locale),
    ...tracks,
  ].filter((track, index, all) => all.findIndex((candidate) => candidate.id === track.id) === index)
  // 감상목록 곡을 듣는 중에는 화면을 옮겨도 그 곡을 붙든다. 테마곡은 새 화면의 테마곡으로 넘어간다.
  const preservePlayingPersonalTrack = Boolean(
    playingId &&
    playingId === selection.trackId &&
    !isThemeId(playingId) &&
    listTracks.some((track) => track.id === playingId),
  )
  const selectedId = preservePlayingPersonalTrack
    ? playingId
    : selection.contextKey === contextKey
      ? selection.trackId ?? contextTrack?.id ?? null
      : contextTrack?.id ?? selection.trackId
  const currentTrack = listTracks.find((track) => track.id === selectedId) ?? listTracks[0] ?? null
  // 고른 목록 종류는 그 화면에서만 유지한다. 다른 테마곡 화면으로 옮기면 그 화면의 목록으로 돌아간다.
  const chosenMode = modeChoice && (!contextKey || modeChoice.contextKey === contextKey) ? modeChoice.mode : null
  const activeMode: MusicMode = chosenMode ?? (contextMusic?.kind === 'myth' ? 'myth' : 'faction')
  const modeCounts: Record<MusicMode, number> = {
    faction: listTracks.filter((track) => track.id.startsWith('faction:')).length,
    myth: listTracks.filter((track) => track.id.startsWith('myth:')).length,
    library: tracks.length,
  }
  const themeRows = listTracks.filter((track): track is FactionTrack => track.id.startsWith(`${activeMode}:`))
  const themeGroups = groupThemeTracks(themeRows, locale, copy.unassignedTheme)
  const isTrackPlaying = playingId === currentTrack?.id
  const isGamePlaying = Boolean(gameAudio?.isPlaying)
  const isPlaying = isGamePlaying || isTrackPlaying
  const currentPlayerTime = isGamePlaying && gameAudio ? gameAudio.currentTime : audioCurrentTime
  const currentPlayerDuration = isGamePlaying && gameAudio ? gameAudio.duration : audioDuration
  // 테마곡을 듣던 중 화면을 옮겨 새 곡이 올라왔고 아직 재생이 시작되지 않은 사이
  const isHandingOff = Boolean(playingId && isThemeId(playingId) && playingId !== currentTrack?.id)
  const isAudioLoading = audioStatus === 'loading' || isHandingOff
  const currentPlayerLoading = !isGamePlaying && isAudioLoading
  const currentPlayerPlayable = isGamePlaying || Boolean(currentTrack?.previewUrl)
  const label = gameAudio?.trackLabel || contextMusic?.title || copy.music

  const nowTitle = isGamePlaying ? gameAudio?.trackLabel || label : currentTrack?.title ?? copy.pickTrack
  const nowSubtitle = isGamePlaying
    ? copy.gameBgm
    : currentTrack?.creator ?? (currentTrack && isThemeTrack(currentTrack) && currentTrack.theme ? localizedName(currentTrack.theme, locale) : null)
  const nowArtwork = !isGamePlaying && currentTrack ? trackArtwork(currentTrack) ?? null : null
  const nowStatus = currentPlayerLoading
    ? copy.status.loading
    : isPlaying
      ? copy.status.playing
      : audioStatus === 'paused'
        ? copy.status.paused
        : currentTrack && currentTrack.id === contextKey
          ? copy.status.recommended
          : copy.status.idle

  const rowState = (trackId: string): RowState => {
    if (selectedId !== trackId) return 'idle'
    if (isAudioLoading) return 'loading'
    if (playingId === trackId) return 'playing'
    return audioStatus === 'paused' ? 'paused' : 'idle'
  }

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

  const closePanel = useCallback(() => {
    if (closingRef.current) return
    const panel = panelRef.current
    if (!panel || prefersReducedMotion()) {
      setIsOpen(false)
      return
    }
    closingRef.current = true
    panel
      .animate(panelMotion(panelOffsetY), { duration: 140, easing: 'cubic-bezier(0.4, 0, 1, 1)', direction: 'reverse', fill: 'forwards' })
      .finished.catch(() => {})
      .finally(() => {
        closingRef.current = false
        setIsOpen(false)
      })
  }, [panelOffsetY])

  const togglePanel = () => {
    if (isOpen) {
      closePanel()
      return
    }
    // 창을 열면 알림은 할 일을 다 했으므로 곧바로 멈춘다
    for (const element of [pulseRingRef.current, openerIconRef.current]) {
      element?.getAnimations().forEach((animation) => animation.cancel())
    }
    loadLibrary()
    setIsModeMenuOpen(false)
    setIsOpen(true)
  }

  const chooseMode = (musicMode: MusicMode) => {
    setModeChoice({ contextKey, mode: musicMode })
    setIsModeMenuOpen(false)
  }

  useLayoutEffect(() => {
    if (!isOpen || prefersReducedMotion()) return
    panelRef.current?.animate(panelMotion(panelOffsetY), { duration: 220, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' })
  }, [isOpen, panelOffsetY])

  useEffect(() => {
    if (!isOpen) return
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node
      if (!panelRef.current?.contains(target) && !buttonRef.current?.contains(target)) {
        closePanel()
      }
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      // 목록 고르기가 열려 있으면 그것만 닫는다
      if (isModeMenuOpen) {
        setIsModeMenuOpen(false)
        return
      }
      closePanel()
      buttonRef.current?.focus()
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [isOpen, isModeMenuOpen, closePanel])

  // 목록이 바뀌면 새 목록은 맨 위부터 보여 준다
  useEffect(() => {
    listRef.current?.scrollTo({ top: 0 })
  }, [activeMode, isModeMenuOpen])

  // 테마곡이 있는 화면에 들어온 순간 한 번만 반응한다. 아래 재생 예약 효과보다 먼저 선언해야 같은 커밋에서 예약이 읽힌다.
  useEffect(() => {
    const previousKey = previousContextKeyRef.current
    previousContextKeyRef.current = contextKey
    if (!contextKey || contextKey === previousKey) return
    // 불러오는 중 표시는 isHandingOff가 화면 계산으로 맡으므로 여기서는 재생 예약만 건다
    if (playingId && isThemeId(playingId) && playingId !== contextKey) pendingPlayRef.current = true
    if (isOpen || playingId === contextKey || prefersReducedMotion()) return
    pulseRingRef.current?.animate(PULSE_RING_MOTION, PULSE_TIMING)
    openerIconRef.current?.animate(PULSE_ICON_MOTION, PULSE_TIMING)
  }, [contextKey, playingId, isOpen])

  useEffect(() => {
    if (!pendingPlayRef.current) return
    pendingPlayRef.current = false
    const audio = audioRef.current
    if (!audio) return
    // 브라우저가 자동 재생을 막으면 넘기는 중·불러오는 중 표시에 갇히지 않게 대기로 되돌린다
    const play = () =>
      void audio.play().catch(() => {
        setPlayingId(null)
        setAudioStatus('idle')
      })
    if (audio.readyState >= 2) {
      play()
      return
    }
    audio.addEventListener('canplay', play, { once: true })
    return () => audio.removeEventListener('canplay', play)
  }, [selectedId])

  useEffect(() => {
    const audio = audioRef.current
    return () => audio?.pause()
  }, [currentTrack?.id])

  const selectTrack = (track: ListTrack) => {
    if (!track.previewUrl) return
    if (gameAudio?.isPlaying) gameAudio.togglePlay()
    // 이미 오디오에 올라온 곡(선택 전 기본으로 잡힌 첫 곡 포함)은 다시 읽지 않으므로 길이를 지우지 않고 재생만 넘긴다
    if (currentTrack?.id === track.id) {
      if (selectedId !== track.id) setSelection({ contextKey, trackId: track.id })
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

  const cyclePlaybackRate = () => {
    const index = READING_PLAYBACK_RATES.findIndex((rate) => rate === playbackRate)
    const nextRate = READING_PLAYBACK_RATES[(index + 1) % READING_PLAYBACK_RATES.length]
    setPlaybackRate(nextRate)
    if (audioRef.current) {
      audioRef.current.defaultPlaybackRate = nextRate
      audioRef.current.playbackRate = nextRate
    }
  }

  const safeDuration = Number.isFinite(currentPlayerDuration) && currentPlayerDuration > 0 ? currentPlayerDuration : 0
  const safeTime = Math.max(0, Math.min(currentPlayerTime, safeDuration))

  const modeOptions = (
    <div role="menu" aria-label={copy.listPicker} className="px-2 pt-1">
      {MUSIC_MODES.map((musicMode) => {
        const active = musicMode === activeMode
        return (
          <button
            key={musicMode}
            type="button"
            role="menuitemradio"
            aria-checked={active}
            onClick={() => chooseMode(musicMode)}
            className={cn(
              'flex h-11 w-full items-center gap-3 rounded-lg px-3 text-start focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent',
              active ? 'bg-white/[0.06] text-accent hover:bg-white/[0.09]' : 'text-[#ece8df] hover:bg-white/[0.05]',
            )}
          >
            <span className="flex size-6 shrink-0 items-center justify-center">
              {active && <Check size={ICON.sm} {...ICON_PROPS} />}
            </span>
            <span className="min-w-0 flex-1 truncate text-[13px] font-medium">{copy.modes[musicMode]}</span>
            {!loading && modeCounts[musicMode] > 0 && (
              <span className="text-[11px] tabular-nums text-white/40">{modeCounts[musicMode]}</span>
            )}
          </button>
        )
      })}
    </div>
  )

  const listBody = loading ? (
    <PendingBlock variant="panel" minHeight="min-h-[14rem]" className="mx-3 my-2" label={copy.loading} />
  ) : activeMode === 'library' ? (
    tracks.length > 0 ? (
      <div className="px-2 pt-1">
        {tracks.map((track) => (
          <TrackRow
            key={track.id}
            title={track.title}
            subtitle={track.creator}
            artwork={track.thumbnailUrl}
            state={rowState(track.id)}
            disabled={!track.previewUrl}
            playLabel={copy.play}
            pauseLabel={copy.pause}
            onSelect={() => selectTrack(track)}
          />
        ))}
      </div>
    ) : (
      <EmptyState title={copy.libraryEmpty} hint={copy.libraryHint} />
    )
  ) : themeGroups.length > 0 ? (
    themeGroups.map((group) => (
      <section key={group.key}>
        <GroupHeading>{group.label}</GroupHeading>
        <div className="px-2">
          {group.tracks.map((track) => (
            <TrackRow
              key={track.id}
              title={track.title}
              state={rowState(track.id)}
              badge={track.id === contextKey && !isPlaying ? copy.recommended : undefined}
              playLabel={copy.play}
              pauseLabel={copy.pause}
              onSelect={() => selectTrack(track)}
            />
          ))}
        </div>
      </section>
    ))
  ) : (
    <EmptyState title={activeMode === 'myth' ? copy.mythEmpty : copy.factionEmpty} />
  )

  const opener = placement && (
    <MusicOpener
      placement={placement}
      label={label}
      tabLabel={copy.music}
      isOpen={isOpen}
      isPlaying={isPlaying}
      buttonRef={buttonRef}
      pulseRingRef={pulseRingRef}
      iconRef={openerIconRef}
      onToggle={togglePanel}
      onPrefetch={loadLibrary}
    />
  )

  const panel = placement && isOpen && (
    <div
      ref={panelRef}
      role="dialog"
      aria-label={label}
      className={cn(PANEL_BASE, layout.className)}
      style={{ zIndex: layout.zIndex }}
    >
      <div className="relative bg-[radial-gradient(120%_100%_at_50%_0%,rgba(212,175,55,0.15)_0%,rgba(212,175,55,0.04)_45%,transparent_75%)] p-4">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-12 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(212,175,55,0.65),transparent)]"
        />
        <button
          type="button"
          onClick={closePanel}
          aria-label={copy.close}
          title={copy.close}
          className="absolute end-2.5 top-2.5 flex size-8 items-center justify-center rounded-full text-white/55 hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <X size={ICON.md} {...ICON_PROPS} />
        </button>

        <div className="flex items-center gap-3.5 pe-8">
          <Artwork url={nowArtwork} className="size-14 rounded-xl shadow-[0_10px_24px_-10px_rgba(0,0,0,0.9)]" iconSize={ICON.lg} />
          <div className="min-w-0 flex-1">
            <p className="flex h-4 items-center gap-1.5 text-[11px] font-medium text-accent">
              <EqBars playing={isPlaying && !currentPlayerLoading} />
              <span className="truncate">{nowStatus}</span>
            </p>
            <p className="mt-1 truncate text-[15px] font-semibold leading-5 tracking-tight text-[#f5f1e8]">{nowTitle}</p>
            <p className="truncate text-xs leading-[18px] text-white/50">{nowSubtitle ?? ' '}</p>
          </div>
        </div>

        <MusicProgress
          currentTime={safeTime}
          duration={safeDuration}
          label={copy.position}
          onSeek={seekCurrent}
        />

        <div className="mt-2 flex items-center justify-between">
          <div className="flex w-12 justify-center">
            {!isGamePlaying && (
              <button
                type="button"
                onClick={cyclePlaybackRate}
                aria-label={`${copy.speed} ${formatRate(playbackRate)}`}
                title={copy.speed}
                className="h-7 w-12 rounded-full border border-white/10 text-[11px] font-semibold tabular-nums text-white/70 hover:border-white/25 hover:bg-white/[0.08] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                {formatRate(playbackRate)}
              </button>
            )}
          </div>
          <div className="flex items-center gap-4">
            <IconButton label={copy.back} onClick={() => seekCurrent(currentPlayerTime - 10)} disabled={safeTime <= 0}>
              <SeekIcon />
            </IconButton>
            <button
              type="button"
              onClick={toggleCurrent}
              disabled={!currentPlayerPlayable}
              aria-busy={currentPlayerLoading || undefined}
              aria-label={currentPlayerLoading ? copy.status.loading : isPlaying ? copy.pause : copy.play}
              title={currentPlayerLoading ? copy.status.loading : isPlaying ? copy.pause : copy.play}
              className="flex size-12 items-center justify-center rounded-full bg-accent text-[#1b1608] shadow-[0_10px_24px_-10px_rgba(212,175,55,0.75)] enabled:hover:bg-accent-hover enabled:active:brightness-95 disabled:cursor-default disabled:opacity-40 disabled:shadow-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-[#161615]"
            >
              {currentPlayerLoading ? (
                <Loader2 size={ICON.lg} className="animate-spin" {...ICON_PROPS} />
              ) : isPlaying ? (
                <Pause size={ICON.lg} className="fill-current" {...ICON_PROPS} />
              ) : (
                <Play size={ICON.lg} className="ms-0.5 fill-current" {...ICON_PROPS} />
              )}
            </button>
            <IconButton label={copy.forward} onClick={() => seekCurrent(currentPlayerTime + 10)} disabled={!safeDuration || safeTime >= safeDuration}>
              <SeekIcon forward />
            </IconButton>
          </div>
          <div className="flex w-12 justify-center">
            <IconButton label={copy.stop} onClick={stopCurrent} disabled={!isPlaying && safeTime === 0}>
              <Square size={ICON.sm} className="fill-current" {...ICON_PROPS} />
            </IconButton>
          </div>
        </div>
      </div>

      <div className="border-t border-white/[0.06] px-4 pt-3">
        <button
          type="button"
          onClick={() => setIsModeMenuOpen((open) => !open)}
          aria-haspopup="menu"
          aria-expanded={isModeMenuOpen}
          aria-label={`${copy.listPicker}: ${copy.modes[activeMode]}`}
          className={cn(
            'flex h-10 w-full items-center gap-2.5 rounded-xl px-3 text-start ring-1 ring-inset focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
            isModeMenuOpen ? 'bg-white/[0.08] ring-white/15' : 'bg-white/[0.04] ring-white/[0.06] hover:bg-white/[0.07] hover:ring-white/10',
          )}
        >
          <ListMusic size={ICON.md} className="shrink-0 text-accent" {...ICON_PROPS} />
          <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-[#f5f1e8]">{copy.modes[activeMode]}</span>
          {!loading && modeCounts[activeMode] > 0 && (
            <span className="text-[11px] tabular-nums text-white/40">{modeCounts[activeMode]}</span>
          )}
          <ChevronDown
            size={ICON.sm}
            className={cn('shrink-0 text-white/50 transition-transform duration-200 motion-reduce:transition-none', isModeMenuOpen && 'rotate-180')}
            {...ICON_PROPS}
          />
        </button>
      </div>

      <AnimatedHeight duration={260}>
        <div ref={listRef} className={cn('overflow-y-auto overscroll-contain pb-2 pt-1', layout.listClassName)}>
          {isModeMenuOpen ? (
            modeOptions
          ) : (
            <>
              {gameAudio && (
                <section>
                  <GroupHeading>{copy.gameBgm}</GroupHeading>
                  <div className="px-2">
                    <TrackRow
                      title={gameAudio.trackLabel || label}
                      state={gameAudio.isPlaying ? 'playing' : 'idle'}
                      playLabel={copy.play}
                      pauseLabel={copy.pause}
                      onSelect={selectGameAudio}
                    />
                  </div>
                </section>
              )}
              {listBody}
            </>
          )}
        </div>
      </AnimatedHeight>
    </div>
  )

  const openerTarget = placement === 'nav' ? navTabSlot : placement === 'header' ? headerSlot : null
  const panelTarget = placement === 'nav' ? navPanelSlot : null

  return (
    <>
      {opener && (openerTarget ? createPortal(opener, openerTarget) : opener)}
      {panel && (panelTarget ? createPortal(panel, panelTarget) : panel)}

      {currentTrack?.previewUrl && (
        <audio
          key={currentTrack.id}
          ref={audioRef}
          src={currentTrack.previewUrl}
          preload="metadata"
          onLoadStart={() => {
            // 곡을 고르지 않은 채 메타데이터만 읽을 때는 불러오는 중 표시를 켜지 않는다
            setAudioStatus((status) => status === 'loading' ? status : 'idle')
            setAudioCurrentTime(0)
            setAudioDuration(0)
          }}
          onLoadedMetadata={(event) => {
            const audio = event.currentTarget
            audio.defaultPlaybackRate = playbackRate
            audio.playbackRate = playbackRate
            setAudioDuration(Number.isFinite(audio.duration) ? audio.duration : 0)
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

// 여는 단추. 자리마다 옆에 선 요소의 모양을 따른다 — 하단 내비는 탭, 헤더는 아이콘 단추, 게임 위는 떠 있는 원.
function MusicOpener({
  placement,
  label,
  tabLabel,
  isOpen,
  isPlaying,
  buttonRef,
  pulseRingRef,
  iconRef,
  onToggle,
  onPrefetch,
}: {
  placement: Placement
  label: string
  tabLabel: string
  isOpen: boolean
  isPlaying: boolean
  buttonRef: RefObject<HTMLButtonElement | null>
  pulseRingRef: RefObject<HTMLSpanElement | null>
  iconRef: RefObject<SVGSVGElement | null>
  onToggle: () => void
  onPrefetch: () => void
}) {
  const highlighted = isOpen || isPlaying
  const buttonProps = {
    ref: buttonRef,
    type: 'button' as const,
    onClick: onToggle,
    onPointerEnter: onPrefetch,
    onFocus: onPrefetch,
    title: label,
    'aria-expanded': isOpen,
    'aria-haspopup': 'dialog' as const,
  }
  // 재생 중에는 음표 대신 막대가 움직여 단추만 봐도 소리가 나는 중인지 알 수 있다
  const glyph = (size: number, iconProps?: typeof ICON_PROPS) =>
    isPlaying
      ? <EqBars playing className="h-4 w-4" />
      : <Music ref={iconRef} size={size} aria-hidden="true" {...iconProps} />

  if (placement === 'nav') {
    return (
      <button
        {...buttonProps}
        className={cn(
          'relative flex h-full w-full flex-col items-center justify-center gap-1 py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent',
          highlighted ? 'text-accent' : 'text-text-secondary opacity-60 hover:opacity-100',
        )}
      >
        <span className="relative flex size-5 items-center justify-center">
          <span ref={pulseRingRef} aria-hidden="true" className={cn(PULSE_RING_CLASS, '-inset-2 rounded-full')} />
          {glyph(NEIGHBOR_ICON_SIZE)}
        </span>
        <span className="font-serif text-[9px] font-medium tracking-tighter">{tabLabel}</span>
      </button>
    )
  }

  if (placement === 'header') {
    return (
      <button
        {...buttonProps}
        aria-label={label}
        className={cn(
          'relative flex size-9 items-center justify-center rounded-lg hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
          highlighted ? 'text-accent' : 'text-text-secondary hover:text-text-primary',
        )}
      >
        <span ref={pulseRingRef} aria-hidden="true" className={cn(PULSE_RING_CLASS, 'inset-0 rounded-lg')} />
        {glyph(NEIGHBOR_ICON_SIZE)}
      </button>
    )
  }

  return (
    <button
      {...buttonProps}
      aria-label={label}
      className={cn(
        'fixed bottom-20 end-4 flex size-11 items-center justify-center rounded-full border bg-bg-card text-accent shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent md:bottom-4',
        highlighted ? 'border-accent hover:bg-[#242424]' : 'border-accent/30 hover:border-accent hover:bg-[#242424]',
      )}
      style={{ zIndex: Z_INDEX.floatingPlayerGame }}
    >
      <span ref={pulseRingRef} aria-hidden="true" className={cn(PULSE_RING_CLASS, '-inset-px rounded-full')} />
      {glyph(ICON.lg, ICON_PROPS)}
    </button>
  )
}

function formatTime(seconds: number) {
  const value = Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0
  return `${Math.floor(value / 60)}:${String(value % 60).padStart(2, '0')}`
}

const formatRate = (rate: number) => `${rate}×`

interface ThemeTrackGroup {
  key: string
  label: string
  tracks: FactionTrack[]
}

function groupThemeTracks(tracks: FactionTrack[], locale: string, unassignedLabel: string): ThemeTrackGroup[] {
  const groups = new Map<string, ThemeTrackGroup>()
  for (const track of tracks) {
    const theme = track.theme
    const key = theme?.id ?? '__unassigned__'
    const group = groups.get(key) ?? {
      key,
      label: theme ? localizedName(theme, locale) : unassignedLabel,
      tracks: [],
    }
    group.tracks.push(track)
    groups.set(key, group)
  }
  return [...groups.values()]
}

function MusicProgress({
  currentTime,
  duration,
  label,
  onSeek,
}: {
  currentTime: number
  duration: number
  label: string
  onSeek: (time: number) => void
}) {
  const progress = duration ? (currentTime / duration) * 100 : 0

  return (
    <div className="mt-4">
      <input
        type="range"
        min={0}
        max={duration}
        step={0.1}
        value={currentTime}
        onChange={(event) => onSeek(Number(event.target.value))}
        disabled={!duration}
        aria-label={label}
        aria-valuetext={`${formatTime(currentTime)} / ${formatTime(duration)}`}
        style={{ background: `linear-gradient(to right, var(--color-accent) ${progress}%, rgba(255,255,255,0.12) ${progress}%) center / 100% 4px no-repeat` }}
        className="block h-4 w-full cursor-pointer appearance-none rounded-full bg-transparent focus-visible:outline-none disabled:cursor-default [&::-webkit-slider-runnable-track]:h-1 [&::-webkit-slider-runnable-track]:bg-transparent [&::-webkit-slider-thumb]:-mt-1 [&::-webkit-slider-thumb]:size-3 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#f5f1e8] [&::-webkit-slider-thumb]:shadow-[0_0_0_3px_rgba(212,175,55,0.25)] hover:[&::-webkit-slider-thumb]:bg-white focus-visible:[&::-webkit-slider-thumb]:shadow-[0_0_0_4px_rgba(212,175,55,0.6)] disabled:[&::-webkit-slider-thumb]:opacity-0 [&::-moz-range-track]:h-1 [&::-moz-range-track]:bg-transparent [&::-moz-range-thumb]:size-3 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-[#f5f1e8] hover:[&::-moz-range-thumb]:bg-white focus-visible:[&::-moz-range-thumb]:shadow-[0_0_0_4px_rgba(212,175,55,0.6)] disabled:[&::-moz-range-thumb]:opacity-0"
      />
      <div className="mt-1 flex h-4 items-center justify-between text-[11px] tabular-nums text-white/45">
        <span>{formatTime(currentTime)}</span>
        <span>{formatTime(duration)}</span>
      </div>
    </div>
  )
}

function IconButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string
  onClick: () => void
  disabled: boolean
  children: ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className="flex size-10 items-center justify-center rounded-full text-white/75 enabled:hover:bg-white/[0.08] enabled:hover:text-white enabled:active:bg-white/[0.12] disabled:cursor-default disabled:text-white/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
    >
      {children}
    </button>
  )
}

function SeekIcon({ forward = false }: { forward?: boolean }) {
  const Icon = forward ? RotateCw : RotateCcw
  return (
    <span className="relative flex size-[22px] items-center justify-center">
      <Icon size={ICON.lg} {...ICON_PROPS} />
      <span className="absolute text-[8px] font-bold leading-none tabular-nums" aria-hidden="true">10</span>
    </span>
  )
}

function EqBars({ playing, className }: { playing: boolean; className?: string }) {
  return (
    <span className={cn('flex h-3 w-3 shrink-0 items-end justify-between', className)} aria-hidden="true">
      {EQ_BARS.map((bar) => (
        <span
          key={bar.delay}
          className={cn('w-0.5 origin-bottom rounded-full bg-current', playing ? 'animate-eq-bar' : 'scale-y-50 opacity-50')}
          style={{ height: bar.height, animationDelay: bar.delay }}
        />
      ))}
    </span>
  )
}

function Artwork({ url, className, iconSize }: { url: string | null; className: string; iconSize: number }) {
  return (
    <span
      className={cn(
        'flex shrink-0 items-center justify-center overflow-hidden border border-white/10 bg-[linear-gradient(140deg,#2f2817_0%,#1a1916_75%)] text-accent/80',
        className,
      )}
    >
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" loading="lazy" decoding="async" className="size-full object-cover" />
      ) : (
        <Music size={iconSize} {...ICON_PROPS} />
      )}
    </span>
  )
}

function GroupHeading({ children }: { children: ReactNode }) {
  return (
    <p className="sticky top-0 z-[1] flex h-8 items-center gap-2 bg-[#161615] px-5 text-[11px] font-semibold text-white/45">
      <span className="shrink-0">{children}</span>
      <span aria-hidden="true" className="h-px flex-1 bg-white/[0.06]" />
    </p>
  )
}

function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center px-6 py-8 text-center">
      <span className="flex size-9 items-center justify-center rounded-full bg-white/[0.05] text-white/35">
        <Music size={ICON.md} {...ICON_PROPS} />
      </span>
      <p className="mt-3 text-xs text-white/70">{title}</p>
      {hint && <p className="mt-1 text-[11px] leading-relaxed text-white/40">{hint}</p>}
    </div>
  )
}

// 행 높이는 44px 고정. 재생 상태는 색과 오른쪽 고정 칸 안의 표시로만 바뀌어 목록이 흔들리지 않는다.
function TrackRow({
  title,
  subtitle,
  artwork,
  state,
  badge,
  disabled = false,
  playLabel,
  pauseLabel,
  onSelect,
}: {
  title: string
  subtitle?: string | null
  artwork?: string | null
  state: RowState
  badge?: string
  disabled?: boolean
  playLabel: string
  pauseLabel: string
  onSelect: () => void
}) {
  const current = state !== 'idle'
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled}
      aria-pressed={state === 'playing'}
      className={cn(
        'group/track flex h-11 w-full items-center gap-3 rounded-lg px-3 text-start focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent disabled:cursor-default disabled:opacity-40',
        current ? 'bg-white/[0.06] enabled:hover:bg-white/[0.09]' : 'enabled:hover:bg-white/[0.05]',
      )}
    >
      {artwork !== undefined && <Artwork url={artwork} className="size-8 rounded-md" iconSize={ICON.sm} />}
      <span className="min-w-0 flex-1">
        <span className={cn('block truncate text-[13px] font-medium leading-[18px]', current ? 'text-accent' : 'text-[#ece8df]')}>{title}</span>
        {subtitle && <span className="block truncate text-[11px] leading-4 text-white/45">{subtitle}</span>}
      </span>
      <span className="flex w-[4.5rem] shrink-0 items-center justify-end gap-2">
        {badge && <span className="rounded-full border border-accent/40 px-1.5 text-[10px] leading-4 text-accent">{badge}</span>}
        <span className="flex size-6 items-center justify-center text-accent">
          {state === 'loading' && <Loader2 size={ICON.sm} className="animate-spin" {...ICON_PROPS} />}
          {state === 'playing' && (
            <>
              <EqBars playing className="group-hover/track:hidden" />
              <Pause size={ICON.sm} className="hidden fill-current group-hover/track:block" {...ICON_PROPS} />
            </>
          )}
          {state === 'paused' && <Play size={ICON.sm} className="ms-0.5 fill-current" {...ICON_PROPS} />}
          {state === 'idle' && (
            <Play
              size={ICON.sm}
              className={cn(
                'ms-0.5 fill-current',
                !badge && 'text-white/70 opacity-0 group-hover/track:opacity-100 group-focus-visible/track:opacity-100',
              )}
              {...ICON_PROPS}
            />
          )}
        </span>
      </span>
      <span className="sr-only">{state === 'playing' ? pauseLabel : playLabel}</span>
    </button>
  )
}
