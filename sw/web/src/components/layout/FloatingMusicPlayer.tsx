'use client'

/*
  음악 재생기. 여는 단추·창·오디오를 한 벌만 두고, 단추와 창은 화면 형편에 맞는 자리로 옮겨 세운다(musicPlayerSlots).
  - 휴대폰: 하단 내비 마지막 칸이 여는 단추다. 창은 딤을 깔고 화면 가운데 모달로 뜬다.
  - PC: 오른쪽 아래 떠 있는 단추다. 창은 그 위로 올라온다.
  - 게임 전체 화면: 내비가 가려지므로 휴대폰도 떠 있는 단추로 돌아가고, 게임 층 위에 선다.
  창 윗부분과 목록 행은 높이를 고정해 재생 상태가 바뀌어도 움직이지 않고, 높이가 바뀌는 목록 칸만 AnimatedHeight로 감싼다.
  테마곡이 있는 화면에 들어오면 여는 단추가 퍼지며 알린다. 재생 중인 곡이 새 화면의 곡과 다르면 모달로
  바꿀지 묻는다 — 허용하면 그 화면의 곡으로 넘기고, 금지하면 듣던 곡을 유지한다. 게임 음악이 켜질 때도
  듣던 곡과 겹치지 않게 게임 쪽을 멈춰 두고 같은 모달로 묻는다. 같은 대상을 한 번 금지하면 다시 묻지 않는다.
  목록은 전체·세력도감·신화·게임·감상목록이고 목록마다 색이 다르다. 곡이 끝나면 곡을 고른 목록에서 다음 곡으로 넘어간다.
*/

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from 'react'
import { createPortal } from 'react-dom'
import { ArrowUpRight, Check, ChevronDown, ListMusic, Loader2, Music, Pause, Play, RotateCcw, RotateCw, Square, X } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import { mythTraditionHref } from '@/components/features/user/explore/myth/mythTraditionHref'
import AnimatedHeight from '@/components/ui/AnimatedHeight'
import Modal from '@/components/ui/Modal'
import { PendingBlock } from '@/components/ui/pending'
import { Z_INDEX } from '@/constants/zIndex'
import { cn } from '@/lib/utils'
import { GAME_MUSIC_GROUPS } from '@/components/features/game/shared/gameMusicCatalog'
import { getFactionMusicList, getMythMusicList, type FactionMusicListItem, type FactionMusicTheme } from '@/actions/home/getFactionMusicList'
import { getMyMusicList, type MusicTrack } from '@/actions/contents/getMyMusicList'
import { useGameAudioContext } from '@/contexts/GameAudioContext'
import { useFactionMusicContext } from '@/contexts/FactionMusicContext'
import { READING_PLAYBACK_RATES } from '@/hooks/useReadingNarration'
import { useGameFullScreenLayer, useMusicNavPanelSlot, useMusicNavTabSlot } from './musicPlayerSlots'

interface FactionTrack {
  id: string
  title: string
  creator: string | null
  previewUrl: string
  slug?: string | null
  theme?: FactionMusicTheme | null
  /** 게임 곡 행이 가리키는 게임 자리(/rest#key). 없으면 바로가기를 붙이지 않는다 */
  gameHref?: string | null
}

type ListTrack = MusicTrack | FactionTrack
type SourceMode = 'faction' | 'myth' | 'game' | 'library'
type MusicMode = 'all' | SourceMode
type ThemePrefix = 'faction' | 'myth' | 'game'
type AudioStatus = 'idle' | 'loading' | 'playing' | 'paused'
type RowState = 'idle' | 'loading' | 'paused' | 'playing'
type Placement = 'nav' | 'corner' | 'floating'
type ModeTone = { text: string; dot: string }

// 곡이 실제로 담긴 목록과, 그 목록들을 고르는 메뉴 순서. 늘어나면 여기와 layout.musicPlayer.modes·MODE_TONE에만 더한다.
const SOURCE_MODES: SourceMode[] = ['faction', 'myth', 'game', 'library']
const MUSIC_MODES: MusicMode[] = ['all', ...SOURCE_MODES]

// 목록마다 색 하나. 목록 메뉴·묶음 제목·재생 중 표시가 같은 색으로 곡의 소속을 알린다. 전체는 네 색을 나눠 담은 점과 사이트 금색을 쓴다.
const MODE_TONE: Record<MusicMode, ModeTone> = {
  all: { text: 'text-accent', dot: 'bg-[conic-gradient(#e0826a_0_25%,#a994f5_0_50%,#7aa2e0_0_75%,#5ec4b0_0)]' },
  faction: { text: 'text-[#e0826a]', dot: 'bg-[#e0826a]' },
  myth: { text: 'text-[#a994f5]', dot: 'bg-[#a994f5]' },
  game: { text: 'text-[#7aa2e0]', dot: 'bg-[#7aa2e0]' },
  library: { text: 'text-[#5ec4b0]', dot: 'bg-[#5ec4b0]' },
}

// 아이콘 크기는 세 단계만 쓴다. 선 굵기는 크기와 무관하게 같은 픽셀로 그려 작은 아이콘만 가늘어 보이지 않게 한다.
// 속이 찬 도형(정지)은 같은 크기에서도 커 보이므로 나란히 놓인 선 아이콘보다 한 단계 작게 쓴다.
// 하단 내비에 선 여는 단추만은 옆 아이콘(20px, 기본 선 굵기)에 맞춘다.
const ICON = { sm: 14, md: 18, lg: 22 } as const
const ICON_PROPS = { strokeWidth: 1.75, absoluteStrokeWidth: true, 'aria-hidden': true } as const
const NEIGHBOR_ICON_SIZE = 20

// 목록 메뉴가 창 밖으로 넘쳐도 잘리지 않게 창은 자르지 않는다. 둥근 모서리는 윗부분과 목록 칸이 각자 맞춘다(테두리 1px 안쪽이라 21px).
const PANEL_BASE =
  'rounded-[22px] border border-white/10 bg-[#161615] shadow-[0_32px_80px_-20px_rgba(0,0,0,0.85),0_0_0_1px_rgba(0,0,0,0.5)]'

// 자리마다 창이 서는 위치·목록 최대 높이·등장 방향. 가운데 정렬은 translate 속성이 맡으므로 등장 연출의 transform과 겹치지 않는다.
const PANEL_LAYOUT: Record<Placement, { className: string; listClassName: string; offsetY: number; zIndex?: number }> = {
  // 휴대폰 화면 가운데 모달 — 내비 틀 안에서 딤(1) 위로 선다(2)
  nav: {
    className:
      'pointer-events-auto fixed left-1/2 top-1/2 w-[min(92vw,22.5rem)] origin-center -translate-x-1/2 -translate-y-1/2',
    listClassName: 'max-h-[min(40vh,19rem)]',
    offsetY: 12,
    zIndex: 2,
  },
  // PC 오른쪽 아래 단추 위로 올라온다
  corner: {
    className: 'fixed bottom-24 end-4 w-[22.5rem] origin-bottom-right',
    listClassName: 'max-h-[min(50vh,22rem)]',
    offsetY: 12,
    zIndex: Z_INDEX.floatingPlayer,
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

const sourceMode = (id: string): SourceMode =>
  id.startsWith('faction:') ? 'faction' : id.startsWith('myth:') ? 'myth' : id.startsWith('game:') ? 'game' : 'library'

const localizedName = (item: { name: string; name_en: string | null }, locale: string) =>
  locale === 'en' ? item.name_en?.trim() || item.name : item.name

// 감상목록 곡은 만든 사람, 테마곡·게임 곡은 묶음 이름(테마·게임명)을 곡 아래 줄에 쓴다
const trackSubtitle = (track: ListTrack, locale: string) =>
  track.creator ?? ('theme' in track && track.theme ? localizedName(track.theme, locale) : null)

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
): FactionTrack | null => {
  if (!music) return null
  const item = catalog.find((track) => track.id === music.id)
  return { id: `${prefix}:${music.id}`, title: music.title, creator: null, previewUrl: music.url, slug: item?.slug, theme: item?.theme }
}

// 게임 카탈로그를 곡 행으로 푼다. 묶음 이름은 메시지 키로 미리 풀어 theme 칸에 실어 부제·그룹 제목이 함께 쓰게 한다
const toGameTracks = (locale: string, groupName: (key: string) => string): FactionTrack[] =>
  GAME_MUSIC_GROUPS.flatMap((group) => {
    const name = groupName(group.key)
    return group.tracks.map((track, index) => ({
      id: `game:${group.key}:${index}`,
      title: locale === 'en' ? track.labelEn?.trim() || track.label : track.label,
      creator: null,
      previewUrl: track.src,
      gameHref: group.href,
      // 묶음 이름은 이미 locale로 푼 값이라 양쪽 필드에 같은 문자열을 둔다
      theme: { id: `game:${group.key}`, name, name_en: name, slug: null },
    }))
  })

// 곡에서 그 곡의 자리로 가는 주소 — 세력도감 테마, 신화 전승, 게임 자리, 감상목록 작품 상세
const trackHref = (track: ListTrack): string | null => {
  const mode = sourceMode(track.id)
  if (mode === 'game') return 'gameHref' in track ? (track.gameHref ?? null) : null
  if (!isThemeTrack(track)) return `/content/${track.id}?category=music`
  if (!track.slug) return null
  return mode === 'myth' ? mythTraditionHref(track.slug) : `/explore/faction/${track.slug}`
}

export default function FloatingMusicPlayer() {
  const locale = useLocale()
  const t = useTranslations('layout.musicPlayer')
  const { controls: gameAudio } = useGameAudioContext()
  const { music: contextMusic } = useFactionMusicContext()
  const gameLayer = useGameFullScreenLayer()
  const navTabSlot = useMusicNavTabSlot()
  const navPanelSlot = useMusicNavPanelSlot()
  const [isOpen, setIsOpen] = useState(false)
  const [isModeMenuOpen, setIsModeMenuOpen] = useState(false)
  const [modeChoice, setModeChoice] = useState<{ contextKey: string | null; mode: MusicMode } | null>(null)
  // 곡을 고른 목록. 곡이 끝나면 이 목록에서 다음 곡으로 넘어간다.
  const [queueMode, setQueueMode] = useState<MusicMode | null>(null)
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
  // 재생 중인 곡을 새 화면의 곡이나 게임 음악으로 바꿀지 묻는 제안. 허용할 때마다 적용하고, 금지한 대상은 다시 묻지 않는다
  const [transition, setTransition] = useState<{ kind: 'theme'; track: FactionTrack } | { kind: 'game' } | null>(null)
  // 금지한 화면(테마곡) 목록 — 같은 화면은 다시 묻지 않는다
  const [deniedContexts, setDeniedContexts] = useState<ReadonlySet<string>>(() => new Set())
  const deniedGameRef = useRef(false)
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
  const modeTriggerRef = useRef<HTMLButtonElement | null>(null)
  const modeMenuRef = useRef<HTMLDivElement | null>(null)

  // 게임 전체 화면이 내비를 덮으면 게임 위 떠 있는 단추로, 하단 내비가 서 있으면(휴대폰) 그 칸으로, 아니면 PC 오른쪽 아래로 간다.
  const placement: Placement = gameLayer ? 'floating' : navTabSlot ? 'nav' : 'corner'
  const layout = PANEL_LAYOUT[placement]
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
    ...toGameTracks(locale, (key) => t(`gameGroups.${key}`)),
    ...tracks,
  ].filter((track, index, all) => all.findIndex((candidate) => candidate.id === track.id) === index)
  // 재생 중인 곡은 화면을 옮겨도 붙든다 — 전환은 모달 허용 뒤에만 일어난다.
  // 이 화면에서 곡을 골랐거나(전환 허용 포함) 재생 중인 곡이 없을 때만 화면의 테마곡이 앞에 선다.
  const playingListed = Boolean(playingId && listTracks.some((track) => track.id === playingId))
  const selectedId =
    selection.contextKey === contextKey && selection.trackId
      ? selection.trackId
      : playingListed
        ? playingId
        : contextTrack?.id ?? selection.trackId
  const currentTrack = listTracks.find((track) => track.id === selectedId) ?? listTracks[0] ?? null
  // 고른 목록 종류는 그 화면에서만 유지한다. 다른 테마곡 화면으로 옮기면 그 화면의 목록으로 돌아간다.
  const chosenMode = modeChoice && (!contextKey || modeChoice.contextKey === contextKey) ? modeChoice.mode : null
  const activeMode: MusicMode = chosenMode ?? (contextMusic?.kind === 'myth' ? 'myth' : 'faction')
  const groupsOf = (prefix: ThemePrefix) =>
    groupThemeTracks(listTracks.filter((track): track is FactionTrack => sourceMode(track.id) === prefix), locale, t('unassignedTheme'))
  const themeGroups: Record<ThemePrefix, ThemeTrackGroup[]> = {
    faction: groupsOf('faction'),
    myth: groupsOf('myth'),
    game: groupsOf('game'),
  }
  // 목록마다 화면에 보이는 순서 그대로 곡을 줄 세운다. 다음 곡 넘기기도 이 순서를 따른다.
  const sourceTracks: Record<SourceMode, ListTrack[]> = {
    faction: themeGroups.faction.flatMap((group) => group.tracks),
    myth: themeGroups.myth.flatMap((group) => group.tracks),
    game: themeGroups.game.flatMap((group) => group.tracks),
    library: tracks,
  }
  const modeTracks = (musicMode: MusicMode) =>
    musicMode === 'all' ? SOURCE_MODES.flatMap((source) => sourceTracks[source]) : sourceTracks[musicMode]
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
  const label = gameAudio?.trackLabel || contextMusic?.title || t('music')

  const nowTitle = isGamePlaying ? gameAudio?.trackLabel || label : currentTrack?.title ?? t('pickTrack')
  const nowSubtitle = isGamePlaying ? t('gameBgm') : currentTrack ? trackSubtitle(currentTrack, locale) : null
  const nowTone = MODE_TONE[!isGamePlaying && currentTrack ? sourceMode(currentTrack.id) : 'all']
  const nowArtwork = !isGamePlaying && currentTrack ? trackArtwork(currentTrack) ?? null : null
  const nowStatus = currentPlayerLoading
    ? t('status.loading')
    : isPlaying
      ? t('status.playing')
      : audioStatus === 'paused'
        ? t('status.paused')
        : currentTrack && currentTrack.id === contextKey
          ? t('status.recommended')
          : t('status.idle')

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
        return
      }
      // 창 안이라도 목록 메뉴 바깥을 누르면 메뉴만 닫는다. 목록 단추는 자기 클릭으로 여닫는다.
      if (isModeMenuOpen && !modeMenuRef.current?.contains(target) && !modeTriggerRef.current?.contains(target)) {
        setIsModeMenuOpen(false)
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
  }, [activeMode])

  // 화면(테마곡)이 바뀐 렌더에서만 — 다른 화면 곡을 둔 전환 제안은 거두고,
  // 듣던 곡이 새 화면의 곡과 다르면 모달로 바꿀지 묻는다. 금지한 화면은 다시 묻지 않는다.
  const [seenContextKey, setSeenContextKey] = useState<string | null>(null)
  if (contextKey !== seenContextKey) {
    setSeenContextKey(contextKey)
    setTransition((current) => (current?.kind === 'theme' && current.track.id !== contextKey ? null : current))
    if (contextKey && playingId && playingId !== contextKey && contextTrack && !deniedContexts.has(contextKey)) {
      setTransition({ kind: 'theme', track: contextTrack })
    }
  }

  // 테마곡이 있는 화면에 들어온 순간 한 번만 여는 단추가 퍼지며 알린다.
  useEffect(() => {
    const previousKey = previousContextKeyRef.current
    previousContextKeyRef.current = contextKey
    if (!contextKey || contextKey === previousKey) return
    if (isOpen || playingId === contextKey || prefersReducedMotion()) return
    pulseRingRef.current?.animate(PULSE_RING_MOTION, PULSE_TIMING)
    openerIconRef.current?.animate(PULSE_ICON_MOTION, PULSE_TIMING)
  }, [contextKey, playingId, isOpen])

  // 게임 음악이 켜지면 듣던 곡과 겹치지 않게 게임 쪽을 멈춰 두고 모달로 바꿀지 묻는다.
  // 한 번 금지한 게임 등록에는 다시 묻지 않고 들어오는 음악만 멈춘다. 등록이 풀리면 금지도 푼다.
  useEffect(() => {
    if (!gameAudio) {
      deniedGameRef.current = false
      return
    }
    if (!gameAudio.isPlaying) return
    const audio = audioRef.current
    if (!audio || audio.paused) return
    gameAudio.togglePlay()
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 게임 BGM 켜짐(외부 오디오 이벤트)에 대한 응답으로 전환 제안을 띄운다
    if (!deniedGameRef.current) setTransition({ kind: 'game' })
  }, [gameAudio])

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

  // 곡을 오디오에 올리고, 읽히는 대로 재생한다
  const loadTrack = (track: ListTrack) => {
    setAudioStatus('loading')
    setAudioCurrentTime(0)
    setAudioDuration(0)
    pendingPlayRef.current = true
    setSelection({ contextKey, trackId: track.id })
  }

  // 전환 제안의 답. 허용하면 그 곡으로 넘기고, 금지하면 듣던 곡을 유지하며 같은 대상은 다시 묻지 않는다.
  const allowTransition = () => {
    const offer = transition
    setTransition(null)
    if (!offer) return
    if (offer.kind === 'game') {
      audioRef.current?.pause()
      if (gameAudio && !gameAudio.isPlaying) gameAudio.togglePlay()
      return
    }
    loadTrack(offer.track)
  }

  const denyTransition = () => {
    const offer = transition
    setTransition(null)
    if (!offer) return
    if (offer.kind === 'game') {
      deniedGameRef.current = true
      return
    }
    setDeniedContexts((current) => new Set(current).add(offer.track.id))
  }

  const selectTrack = (track: ListTrack) => {
    if (!track.previewUrl) return
    // 곡을 직접 고른 것도 전환 제안에 대한 답이다 — 묻던 모달은 거둔다
    setTransition(null)
    // 게임이 붙어 있을 때 목록의 게임 곡은 가능하면 게임 엔진이 틀게 해 화면의 이전·다음 곡과 발을 맞춘다.
    // 재생기 오디오로 이미 듣는 곡은 아래 평소 경로가 멈춤·재생을 맡는다.
    if (sourceMode(track.id) === 'game' && gameAudio && playingId !== track.id) {
      const audio = audioRef.current
      if (gameAudio.trackSrc === track.previewUrl) {
        if (playingId && audio && !audio.paused) audio.pause()
        gameAudio.togglePlay()
        return
      }
      if (gameAudio.playSrc?.(track.previewUrl)) {
        if (playingId && audio && !audio.paused) audio.pause()
        return
      }
      // 지금 게임 목록에 없는 곡은 재생기 오디오로 이어 듣는다
    }
    if (gameAudio?.isPlaying) gameAudio.togglePlay()
    setQueueMode(activeMode)
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
    loadTrack(track)
  }

  // 곡이 끝나면 고른 목록에서 들을 수 있는 다음 곡으로 넘긴다. 목록 끝에서는 처음으로 돌아가고, 들을 곡이 하나뿐이면 다시 튼다.
  const playNext = (audio: HTMLAudioElement) => {
    if (!currentTrack) return
    const playable = (musicMode: MusicMode) => modeTracks(musicMode).filter((track) => track.previewUrl)
    // 고른 목록에 없는 곡(화면을 옮겨 새 테마곡으로 넘어간 경우)은 그 곡이 속한 목록을 따른다
    let queue = playable(queueMode ?? sourceMode(currentTrack.id))
    if (!queue.some((track) => track.id === currentTrack.id)) queue = playable(sourceMode(currentTrack.id))
    const next = queue[(queue.findIndex((track) => track.id === currentTrack.id) + 1) % queue.length]
    if (next && next.id !== currentTrack.id) {
      loadTrack(next)
      return
    }
    void audio.play().catch(() => {})
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
      setTransition(null)
      gameAudio.seek(0)
      if (gameAudio.isPlaying) gameAudio.togglePlay()
      return
    }
    const audio = audioRef.current
    if (!audio) return
    // 정지도 전환 제안에 대한 답이다 — 묻던 모달은 거둔다
    setTransition(null)
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

  // 목록 단추 바로 아래 한 층 위로 뜬다. 목록 칸을 갈아 끼우지 않아 열고 닫을 때 창 크기가 그대로다.
  const modeMenu = (
    <div
      ref={modeMenuRef}
      role="menu"
      aria-label={t('listPicker')}
      className="absolute inset-x-0 top-full z-10 mt-1.5 rounded-xl border border-white/10 bg-[#222220] p-1 shadow-[0_20px_44px_-12px_rgba(0,0,0,0.95)]"
    >
      {MUSIC_MODES.map((musicMode) => {
        const active = musicMode === activeMode
        const tone = MODE_TONE[musicMode]
        const count = modeTracks(musicMode).length
        return (
          <button
            key={musicMode}
            type="button"
            role="menuitemradio"
            aria-checked={active}
            onClick={() => chooseMode(musicMode)}
            className={cn(
              'flex h-10 w-full items-center gap-2 rounded-lg px-2 text-start focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent',
              active ? 'bg-white/[0.06] hover:bg-white/[0.09]' : 'hover:bg-white/[0.05]',
            )}
          >
            <span className="flex size-6 shrink-0 items-center justify-center">
              <span aria-hidden="true" className={cn('size-2.5 rounded-full', tone.dot)} />
            </span>
            <span className={cn('min-w-0 flex-1 truncate text-[13px] font-medium', active ? tone.text : 'text-[#ece8df]')}>
              {t(`modes.${musicMode}`)}
            </span>
            {!loading && count > 0 && <span className="text-[11px] tabular-nums text-white/40">{count}</span>}
            <span className="flex w-3.5 shrink-0 justify-center">
              {active && <Check size={ICON.sm} className={tone.text} {...ICON_PROPS} />}
            </span>
          </button>
        )
      })}
    </div>
  )

  // 테마·게임별로 묶인 목록에서는 묶음 제목이 이름을 쥐므로 줄 아래에 다시 쓰지 않는다
  const renderTrack = (track: ListTrack, withSubtitle: boolean) => (
    <TrackRow
      key={track.id}
      title={track.title}
      subtitle={withSubtitle ? trackSubtitle(track, locale) : null}
      artwork={trackArtwork(track)}
      state={
        // 붙어 있는 게임이 틀고 있는 곡은 행의 상태를 게임 쪽에 맞춘다
        gameAudio && sourceMode(track.id) === 'game' && track.previewUrl === gameAudio.trackSrc
          ? gameAudio.isPlaying
            ? 'playing'
            : 'paused'
          : rowState(track.id)
      }
      tone={MODE_TONE[sourceMode(track.id)].text}
      badge={track.id === contextKey && !isPlaying ? t('recommended') : undefined}
      disabled={!track.previewUrl}
      playLabel={t('play')}
      pauseLabel={t('pause')}
      onSelect={() => selectTrack(track)}
      href={trackHref(track)}
      hrefLabel={`${track.title} · ${t(`goTo.${sourceMode(track.id)}`)}`}
      onNavigate={closePanel}
    />
  )

  // 게임 음악 묶음 맨 아래에 붙는 한 줄 각주 — 한국어 가사 곡은 영문 버전도 나온다는 소식
  const gameNotice = (
    <p className="px-5 pb-2 pt-1.5 text-[10px] leading-snug text-white/35">{t('gameLyricsNotice')}</p>
  )

  const listBody = loading ? (
    <PendingBlock variant="panel" minHeight="min-h-[14rem]" className="mx-3 my-2" label={t('loading')} />
  ) : activeMode === 'all' ? (
    modeTracks('all').length > 0 ? (
      SOURCE_MODES.filter((source) => sourceTracks[source].length > 0).map((source) => (
        <section key={source}>
          <GroupHeading tone={MODE_TONE[source]}>{t(`modes.${source}`)}</GroupHeading>
          <div className="px-2">{sourceTracks[source].map((track) => renderTrack(track, true))}</div>
          {source === 'game' && gameNotice}
        </section>
      ))
    ) : (
      <EmptyState title={t('allEmpty')} hint={t('libraryHint')} />
    )
  ) : activeMode === 'library' ? (
    tracks.length > 0 ? (
      <div className="px-2 pt-1">{tracks.map((track) => renderTrack(track, true))}</div>
    ) : (
      <EmptyState title={t('libraryEmpty')} hint={t('libraryHint')} />
    )
  ) : themeGroups[activeMode].length > 0 ? (
    <>
      {themeGroups[activeMode].map((group) => (
        <section key={group.key}>
          <GroupHeading>{group.label}</GroupHeading>
          <div className="px-2">{group.tracks.map((track) => renderTrack(track, false))}</div>
        </section>
      ))}
      {activeMode === 'game' && gameNotice}
    </>
  ) : (
    <EmptyState
      title={activeMode === 'myth' ? t('mythEmpty') : activeMode === 'game' ? t('gameEmpty') : t('factionEmpty')}
    />
  )

  const opener = (
    <MusicOpener
      placement={placement}
      label={label}
      tabLabel={t('music')}
      isOpen={isOpen}
      isPlaying={isPlaying}
      buttonRef={buttonRef}
      pulseRingRef={pulseRingRef}
      iconRef={openerIconRef}
      onToggle={togglePanel}
      onPrefetch={loadLibrary}
    />
  )

  const panel = isOpen && (
    <>
      {/* 휴대폰 모달 뒤 딤 — 내비 층 안에서 내비(층 자동) 위로 올려 창만 남긴다 */}
      {placement === 'nav' && (
        <div
          aria-hidden="true"
          className="pointer-events-auto fixed inset-0 z-[1] animate-modal-overlay bg-black/60 backdrop-blur-sm"
        />
      )}
      <div
        ref={panelRef}
        role="dialog"
        aria-label={label}
        className={cn(PANEL_BASE, layout.className)}
        style={{ zIndex: layout.zIndex }}
      >
        {/* 곡 정보(제목·상태) / 진행 막대(시간 양끝) / 조작 단추의 세 줄. 줄마다 높이를 고정해 상태가 바뀌어도 목록이 밀리지 않는다 */}
        <div className="relative rounded-t-[21px] bg-[radial-gradient(120%_100%_at_50%_0%,rgba(212,175,55,0.15)_0%,rgba(212,175,55,0.04)_45%,transparent_75%)] px-4 pb-2 pt-3.5">
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-12 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(212,175,55,0.65),transparent)]"
          />

          <div className="flex h-11 items-center gap-3">
            <Artwork url={nowArtwork} className={cn('size-11 rounded-lg shadow-[0_10px_24px_-10px_rgba(0,0,0,0.9)]', nowTone.text)} iconSize={ICON.md} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[15px] font-semibold leading-5 tracking-tight text-[#f5f1e8]">{nowTitle}</p>
              <p className="mt-0.5 flex h-[18px] min-w-0 items-center gap-1.5 text-xs text-white/50">
                <span className={cn('flex shrink-0 items-center gap-1.5 text-[11px] font-medium', nowTone.text)}>
                  <EqBars playing={isPlaying && !currentPlayerLoading} />
                  {nowStatus}
                </span>
                {nowSubtitle && (
                  <>
                    <span aria-hidden="true" className="text-white/25">·</span>
                    <span className="truncate">{nowSubtitle}</span>
                  </>
                )}
              </p>
            </div>
            <button
              type="button"
              onClick={closePanel}
              aria-label={t('close')}
              title={t('close')}
              className="-me-1.5 flex size-8 shrink-0 items-center justify-center self-start rounded-full text-white/55 hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              <X size={ICON.md} {...ICON_PROPS} />
            </button>
          </div>

          <MusicProgress
            currentTime={safeTime}
            duration={safeDuration}
            label={t('position')}
            onSeek={seekCurrent}
          />

          <div className="mt-1 flex h-11 items-center justify-between">
            <div className="flex w-12">
              {!isGamePlaying && (
                <button
                  type="button"
                  onClick={cyclePlaybackRate}
                  aria-label={`${t('speed')} ${formatRate(playbackRate)}`}
                  title={t('speed')}
                  className="h-7 w-12 rounded-full border border-white/10 text-[11px] font-semibold tabular-nums text-white/70 hover:border-white/25 hover:bg-white/[0.08] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                >
                  {formatRate(playbackRate)}
                </button>
              )}
            </div>
            <div className="flex items-center gap-3">
              <IconButton label={t('back')} onClick={() => seekCurrent(currentPlayerTime - 10)} disabled={safeTime <= 0}>
                <SeekIcon />
              </IconButton>
              <button
                type="button"
                onClick={toggleCurrent}
                disabled={!currentPlayerPlayable}
                aria-busy={currentPlayerLoading || undefined}
                aria-label={currentPlayerLoading ? t('status.loading') : isPlaying ? t('pause') : t('play')}
                title={currentPlayerLoading ? t('status.loading') : isPlaying ? t('pause') : t('play')}
                className="flex size-11 items-center justify-center rounded-full bg-accent text-[#1b1608] shadow-[0_10px_24px_-10px_rgba(212,175,55,0.75)] enabled:hover:bg-accent-hover enabled:active:brightness-95 disabled:cursor-default disabled:opacity-40 disabled:shadow-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-[#161615]"
              >
                {currentPlayerLoading ? (
                  <Loader2 size={ICON.lg} className="animate-spin" {...ICON_PROPS} />
                ) : isPlaying ? (
                  <Pause size={ICON.lg} className="fill-current" {...ICON_PROPS} />
                ) : (
                  <Play size={ICON.lg} className="ms-0.5 fill-current" {...ICON_PROPS} />
                )}
              </button>
              <IconButton label={t('forward')} onClick={() => seekCurrent(currentPlayerTime + 10)} disabled={!safeDuration || safeTime >= safeDuration}>
                <SeekIcon forward />
              </IconButton>
            </div>
            <div className="flex w-12 justify-end">
              <IconButton label={t('stop')} onClick={stopCurrent} disabled={!isPlaying && safeTime === 0}>
                <Square size={ICON.sm} className="fill-current" {...ICON_PROPS} />
              </IconButton>
            </div>
          </div>
        </div>

        {/* 아래 여백은 스크롤되는 목록이 지나가지 않는 띠다. 목록은 이 띠 아래 칸에서만 움직이고 묶음 제목도 칸 맨 위에 붙는다 */}
        <div className="border-t border-white/[0.06] px-4 pb-2 pt-3">
          <div className="relative">
            <button
              ref={modeTriggerRef}
              type="button"
              onClick={() => setIsModeMenuOpen((open) => !open)}
              aria-haspopup="menu"
              aria-expanded={isModeMenuOpen}
              aria-label={`${t('listPicker')}: ${t(`modes.${activeMode}`)}`}
              className={cn(
                'flex h-10 w-full items-center gap-2.5 rounded-xl px-3 text-start ring-1 ring-inset focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
                isModeMenuOpen ? 'bg-white/[0.08] ring-white/15' : 'bg-white/[0.04] ring-white/[0.06] hover:bg-white/[0.07] hover:ring-white/10',
              )}
            >
              <ListMusic size={ICON.md} className={cn('shrink-0', MODE_TONE[activeMode].text)} {...ICON_PROPS} />
              <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-[#f5f1e8]">{t(`modes.${activeMode}`)}</span>
              {!loading && modeTracks(activeMode).length > 0 && (
                <span className="text-[11px] tabular-nums text-white/40">{modeTracks(activeMode).length}</span>
              )}
              <ChevronDown
                size={ICON.sm}
                className={cn('shrink-0 text-white/50 transition-transform duration-200 motion-reduce:transition-none', isModeMenuOpen && 'rotate-180')}
                {...ICON_PROPS}
              />
            </button>
            {isModeMenuOpen && modeMenu}
          </div>
        </div>

        <AnimatedHeight duration={260}>
          <div ref={listRef} className={cn('overflow-y-auto overscroll-contain rounded-b-[21px] pb-2', layout.listClassName)}>
            {listBody}
          </div>
        </AnimatedHeight>
      </div>
    </>
  )

  const isNav = placement === 'nav' && navTabSlot && navPanelSlot

  // 전환을 묻는 안내 모달. 게임 전체 화면 위에도 떠야 하므로 전용 층(musicNotice)을 쓴다.
  const transitionModal = (
    <Modal
      isOpen={transition !== null}
      onClose={denyTransition}
      frame="plain"
      widthClassName="w-[min(90vw,320px)]"
      overlayClassName="bg-black/70 backdrop-blur-sm"
      boxClassName="rounded-2xl border border-white/[0.08] bg-bg-main shadow-2xl"
      showCloseButton={false}
      escapeCapture
      animateHeight={false}
      zIndex={Z_INDEX.musicNotice}
    >
      <div className="flex flex-col items-center px-5 pb-1 pt-6">
        <span className="flex size-10 items-center justify-center rounded-full border border-accent/20 bg-accent/10 text-accent/80">
          <Music size={ICON.md} {...ICON_PROPS} />
        </span>
        <h2 className="mt-2.5 font-serif text-base font-black text-white">{t('transition.title')}</h2>
        <p className="mt-1 text-center text-xs leading-relaxed text-text-secondary">
          {transition?.kind === 'game' ? t('transition.gameDesc') : t('transition.themeDesc')}
        </p>
        {transition?.kind === 'theme' && (
          <p className="mt-2 max-w-full truncate text-[13px] font-medium text-accent">{transition.track.title}</p>
        )}
      </div>
      <div className="flex gap-2 px-4 pb-4 pt-3">
        <button
          type="button"
          onClick={denyTransition}
          className="flex-1 rounded-xl border border-white/[0.08] bg-white/[0.03] py-2.5 text-sm text-text-secondary hover:bg-white/[0.07] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          {t('transition.deny')}
        </button>
        <button
          type="button"
          onClick={allowTransition}
          className="flex-1 rounded-xl border border-accent/25 bg-accent/10 py-2.5 text-sm font-bold text-accent hover:bg-accent/[0.15] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          {t('transition.allow')}
        </button>
      </div>
    </Modal>
  )

  return (
    <>
      {isNav ? createPortal(opener, navTabSlot) : opener}
      {panel && (isNav ? createPortal(panel, navPanelSlot) : panel)}
      {transitionModal}

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
            playNext(event.currentTarget)
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

// 여는 단추. 하단 내비에서는 옆 탭 모양을 따르고, PC와 게임 위에서는 떠 있는 원이다.
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

  const isCorner = placement === 'corner'

  return (
    <button
      {...buttonProps}
      aria-label={label}
      className={cn(
        'fixed end-4 size-11 items-center justify-center rounded-full border bg-bg-card text-accent shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
        // PC 자리는 휴대폰 폭에서 숨긴다 — 하단 내비가 서기 전 첫 그림에서 비치지 않게
        isCorner ? 'bottom-8 hidden md:flex' : 'bottom-20 flex md:bottom-4',
        highlighted ? 'border-accent hover:bg-[#242424]' : 'border-accent/30 hover:border-accent hover:bg-[#242424]',
      )}
      style={{ zIndex: isCorner ? Z_INDEX.floatingPlayer : Z_INDEX.floatingPlayerGame }}
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

  // 시간 칸은 너비를 고정해 자릿수가 바뀌어도 막대 길이가 흔들리지 않는다
  return (
    <div className="mt-2.5 flex h-4 items-center gap-2 text-[11px] tabular-nums text-white/45">
      <span className="w-9 shrink-0">{formatTime(currentTime)}</span>
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
        className="block h-4 min-w-0 flex-1 cursor-pointer appearance-none rounded-full bg-transparent focus-visible:outline-none disabled:cursor-default [&::-webkit-slider-runnable-track]:h-1 [&::-webkit-slider-runnable-track]:bg-transparent [&::-webkit-slider-thumb]:-mt-1 [&::-webkit-slider-thumb]:size-3 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#f5f1e8] [&::-webkit-slider-thumb]:shadow-[0_0_0_3px_rgba(212,175,55,0.25)] hover:[&::-webkit-slider-thumb]:bg-white focus-visible:[&::-webkit-slider-thumb]:shadow-[0_0_0_4px_rgba(212,175,55,0.6)] disabled:[&::-webkit-slider-thumb]:opacity-0 [&::-moz-range-track]:h-1 [&::-moz-range-track]:bg-transparent [&::-moz-range-thumb]:size-3 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-[#f5f1e8] hover:[&::-moz-range-thumb]:bg-white focus-visible:[&::-moz-range-thumb]:shadow-[0_0_0_4px_rgba(212,175,55,0.6)] disabled:[&::-moz-range-thumb]:opacity-0"
      />
      <span className="w-9 shrink-0 text-end">{formatTime(duration)}</span>
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

// 색(tone)을 받으면 목록 소속 묶음이라 색 점과 색 글자로 쓴다
function GroupHeading({ children, tone }: { children: ReactNode; tone?: ModeTone }) {
  return (
    <p className={cn('sticky top-0 z-[1] flex h-8 items-center gap-2 bg-[#161615] px-5 text-[11px] font-semibold text-white/45', tone?.text)}>
      {tone && <span aria-hidden="true" className={cn('size-1.5 shrink-0 rounded-full', tone.dot)} />}
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
// 줄 끝은 곡의 자리(세력도감·신화·작품 상세)로 가는 바로가기 칸이다. 갈 곳이 없는 줄도 칸을 비워 두어 재생 표시가 한 줄로 선다.
function TrackRow({
  title,
  subtitle,
  artwork,
  state,
  tone = 'text-accent',
  badge,
  disabled = false,
  playLabel,
  pauseLabel,
  onSelect,
  href,
  hrefLabel,
  onNavigate,
}: {
  title: string
  subtitle?: string | null
  artwork?: string | null
  state: RowState
  // 지금 곡일 때 제목과 재생 표시에 쓰는 글자색. 곡이 속한 목록의 색이다.
  tone?: string
  badge?: string
  disabled?: boolean
  playLabel: string
  pauseLabel: string
  onSelect: () => void
  href?: string | null
  hrefLabel?: string
  onNavigate?: () => void
}) {
  const current = state !== 'idle'
  return (
    <div className={cn('flex h-11 items-center rounded-lg', current && 'bg-white/[0.06]')}>
      <button
        type="button"
        onClick={onSelect}
        disabled={disabled}
        aria-pressed={state === 'playing'}
        className="group/track flex h-full min-w-0 flex-1 items-center gap-3 rounded-lg pe-2 ps-3 text-start enabled:hover:bg-white/[0.05] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent disabled:cursor-default disabled:opacity-40"
      >
        {artwork !== undefined && <Artwork url={artwork} className="size-8 rounded-md" iconSize={ICON.sm} />}
        <span className="min-w-0 flex-1">
          <span className={cn('block truncate text-[13px] font-medium leading-[18px]', current ? tone : 'text-[#ece8df]')}>{title}</span>
          {subtitle && <span className="block truncate text-[11px] leading-4 text-white/45">{subtitle}</span>}
        </span>
        <span className="flex w-[4.5rem] shrink-0 items-center justify-end gap-2">
          {badge && <span className="rounded-full border border-accent/40 px-1.5 text-[10px] leading-4 text-accent">{badge}</span>}
          <span className={cn('flex size-6 items-center justify-center', tone)}>
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
      <span className="flex w-8 shrink-0 justify-center">
        {href && (
          <Link
            href={href}
            prefetch={false}
            onClick={onNavigate}
            aria-label={hrefLabel}
            title={hrefLabel}
            className="flex size-8 items-center justify-center rounded-full text-white/40 hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <ArrowUpRight size={ICON.md} {...ICON_PROPS} />
          </Link>
        )}
      </span>
    </div>
  )
}
