import { useState, useRef, useEffect, useCallback } from 'react'
import { useHoverTime } from '../time-ruler'
import { dbToLinear } from '../gain'
import { BAR_COLOR, BAR_GAP, BAR_W } from './constants'
import type { Props } from './types'

// 전역 활성 플레이어 — 가장 최근에 상호작용한 하나만 Space 키에 반응
let _activePlayer: { toggle: () => void } | null = null

type Args = Pick<
  Props,
  | 'audioUrl'
  | 'duration'
  | 'onClick'
  | 'onTimeClick'
  | 'onDoubleClick'
  | 'trimStart'
  | 'trimEnd'
  | 'onTrimStart'
  | 'onTrimEnd'
  | 'pxPerSec'
  | 'autoPlay'
  | 'playbackRate'
  | 'gainDb'
> & { visualGain?: number }

export function useAudioWavePlayer({
  audioUrl, duration,
  onClick, onTimeClick, onDoubleClick,
  trimStart, trimEnd, onTrimStart, onTrimEnd, pxPerSec, autoPlay,
  playbackRate, gainDb, visualGain = 1,
}: Args) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const animRef = useRef<number>(0)
  const [playing, setPlaying] = useState(false)
  const [playhead, setPlayhead] = useState(0)
  const [realDuration, setRealDuration] = useState(duration)
  const dur = realDuration > 0 ? realDuration : duration
  const { onMouseMove, onMouseLeave, HoverOverlay } = useHoverTime(containerRef, dur)

  // 배속·게인은 ref 로 들고 playFrom 의존성에서 뺀다 — 값이 바뀔 때마다 playFrom 이 재생성돼
  // 재생이 끊기는 일을 막는다. 새 Audio 생성 시 적용 + 재생 중 라이브 반영(아래 effect).
  const rate = playbackRate && Number.isFinite(playbackRate) && playbackRate > 0 ? playbackRate : 1
  // HTMLMediaElement.volume 은 0~1 만 허용한다(범위 밖이면 예외). +게인으로 1을 넘으면 1로 자른다.
  // 렌더(Remotion Audio)는 1 초과를 허용하므로 실제 증폭은 렌더에 그대로 반영된다(여기선 미리듣기 한계).
  const vol = Math.min(1, Math.max(0, dbToLinear(gainDb)))
  const rateRef = useRef(rate)
  const volRef = useRef(vol)
  rateRef.current = rate
  volRef.current = vol

  // 파형 그리기 — 디코드 샘플을 URL 별로 캐시한다. 캔버스 폭이 바뀌면(확대 슬라이더·축약↔확장 토글로
  // width 속성이 갱신되면) 브라우저가 캔버스를 비우므로, 폭·증폭 변경 때마다 캐시로 다시 그린다.
  const sampleCacheRef = useRef<{ url: string; data: Float32Array } | null>(null)
  useEffect(() => {
    if (!audioUrl || !canvasRef.current) return
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    let alive = true

    const render = (data: Float32Array) => {
      const barCount = Math.floor(canvas.width / BAR_GAP)
      const step = Math.floor(data.length / barCount)
      const amp = canvas.height / 2
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      ctx.fillStyle = 'rgba(200, 164, 110, 0.1)'
      ctx.fillRect(0, amp, canvas.width, 1)

      for (let i = 0; i < barCount; i++) {
        let sum = 0
        for (let j = 0; j < step; j++) sum += Math.abs(data[i * step + j] || 0)
        const avg = sum / step
        const h = Math.max(2, Math.pow(avg, 0.6) * amp * 4 * visualGain)
        ctx.fillStyle = BAR_COLOR
        ctx.fillRect(i * BAR_GAP, amp - h / 2, BAR_W, h)
      }
    }

    const cached = sampleCacheRef.current
    if (cached && cached.url === audioUrl) { render(cached.data); return }

    fetch(audioUrl)
      .then(r => r.arrayBuffer())
      .then(buf => new AudioContext().decodeAudioData(buf))
      .then(audioBuffer => {
        if (!alive) return
        setRealDuration(audioBuffer.duration)
        const data = audioBuffer.getChannelData(0)
        sampleCacheRef.current = { url: audioUrl, data }
        render(data)
      })
      .catch(() => {})
    return () => { alive = false }
    // dur — 디코드로 실제 길이가 확정되면 absWidth(캔버스 폭)가 갱신되므로 그때도 다시 그린다.
  }, [audioUrl, visualGain, pxPerSec, dur])

  // 지정 위치부터 재생
  const playFrom = useCallback((t: number) => {
    if (audioRef.current) { audioRef.current.pause(); cancelAnimationFrame(animRef.current) }
    const a = new Audio(audioUrl)
    audioRef.current = a
    a.playbackRate = rateRef.current
    a.volume = volRef.current
    a.onended = () => { setPlaying(false); setPlayhead(0) }
    a.addEventListener('loadedmetadata', () => {
      // 메타데이터 대기 중 정지/교체됐으면(audioRef가 a가 아님) 재생하지 않는다.
      // 자동 재생 직후 정지가 늦게 온 콜백에 묻혀 무시되던 경합 방지.
      if (audioRef.current !== a) return
      a.currentTime = t
      a.play().then(() => {
        if (audioRef.current !== a) { a.pause(); return }
        setPlaying(true)
        const tick = () => {
          if (a.paused) return
          setPlayhead(a.currentTime)
          animRef.current = requestAnimationFrame(tick)
        }
        tick()
      }).catch(() => {})
    }, { once: true })
  }, [audioUrl])

  // 배속·게인 라이브 반영 — 재생 중에 슬라이더를 움직이면 즉시 들리게.
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = rate
      audioRef.current.volume = vol
    }
  }, [rate, vol])

  // 자동 재생 — autoPlay이면 오디오(URL) 준비 시 처음부터 1회 재생. 브라우저 정책상 막히면 조용히 무시.
  useEffect(() => {
    if (autoPlay && audioUrl) playFrom(0)
  }, [autoPlay, audioUrl, playFrom])

  // 전체 재생/일시정지/정지
  const togglePlay = useCallback(() => {
    if (playing && audioRef.current) {
      audioRef.current.pause()
      cancelAnimationFrame(animRef.current)
      setPlaying(false)
      return
    }
    playFrom(playhead > 0 && playhead < dur ? playhead : 0)
  }, [playing, playhead, dur, playFrom])

  const stop = useCallback(() => {
    if (audioRef.current) { audioRef.current.pause(); cancelAnimationFrame(animRef.current) }
    audioRef.current = null
    setPlaying(false)
    setPlayhead(0)
  }, [])

  // 클릭
  const handleClick = useCallback((e: React.MouseEvent) => {
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect || dur <= 0) return
    const t = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)) * dur
    if (onClick) onClick(t)
    else playFrom(t)
    onTimeClick?.(t)
  }, [dur, onClick, playFrom, onTimeClick])

  // 이 플레이어를 active로 등록 — 상호작용 시 호출
  const playerHandleRef = useRef({ toggle: togglePlay })
  playerHandleRef.current.toggle = togglePlay
  const [isActive, setIsActive] = useState(false)
  
  const activate = useCallback(() => { 
    _activePlayer = playerHandleRef.current 
    window.dispatchEvent(new CustomEvent('audioPlayerActivated', { detail: playerHandleRef.current }))
  }, [])
  
  // 언마운트 시 자신이 active면 해제
  useEffect(() => {
    const handle = playerHandleRef.current
    return () => { if (_activePlayer === handle) _activePlayer = null }
  }, [])

  // 전역 활성 상태 구독
  useEffect(() => {
    const onActivated = (e: Event) => {
      setIsActive((e as CustomEvent).detail === playerHandleRef.current)
    }
    window.addEventListener('audioPlayerActivated', onActivated)
    setIsActive(_activePlayer === playerHandleRef.current)
    return () => window.removeEventListener('audioPlayerActivated', onActivated)
  }, [])

  // 전역 Space — 오직 active player만 반응 (이중 호출·다중 인스턴스 충돌 방지)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== 'Space') return
      if (e.repeat) return
      const el = document.activeElement as HTMLElement | null
      if (el && (['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName) || el.isContentEditable)) return
      if (!_activePlayer || _activePlayer !== playerHandleRef.current) return
      e.preventDefault()
      _activePlayer.toggle()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // 더블클릭
  const handleDblClick = useCallback((e: React.MouseEvent) => {
    if (!onDoubleClick) return
    e.preventDefault()
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect || dur <= 0) return
    const t = Math.round(Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)) * dur * 1000) / 1000
    onDoubleClick(t, { shiftKey: e.shiftKey })
  }, [dur, onDoubleClick])

  // trim 핸들 드래그 — document 이벤트 기반, cleanup ref로 언마운트 안전.
  // edge='start' 좌측 핸들 / edge='end' 우측 핸들. 반대편 경계 안쪽으로 0.05초 간격 clamp.
  const trimCleanupRef = useRef<(() => void) | null>(null)
  const handleTrimDown = useCallback((edge: 'start' | 'end') => (e: React.PointerEvent) => {
    const cb = edge === 'start' ? onTrimStart : onTrimEnd
    if (!cb || !containerRef.current || dur <= 0) return
    e.preventDefault()
    e.stopPropagation()
    const rect = containerRef.current.getBoundingClientRect()
    const calcT = (cx: number) => {
      let t = Math.max(0, Math.min(1, (cx - rect.left) / rect.width)) * dur
      if (edge === 'start') t = Math.min(t, (trimEnd ?? dur) - 0.05)
      else t = Math.max(t, (trimStart ?? 0) + 0.05)
      return Math.round(Math.max(0, Math.min(dur, t)) * 1000) / 1000
    }
    const onMove = (ev: PointerEvent) => cb(calcT(ev.clientX))
    const onUp = () => {
      document.removeEventListener('pointermove', onMove)
      document.removeEventListener('pointerup', onUp)
      trimCleanupRef.current = null
    }
    document.addEventListener('pointermove', onMove)
    document.addEventListener('pointerup', onUp)
    trimCleanupRef.current = onUp
  }, [onTrimStart, onTrimEnd, trimStart, trimEnd, dur])
  useEffect(() => () => { trimCleanupRef.current?.() }, [])

  const trimEndHandlePct = dur > 0 && trimEnd !== undefined ? (trimEnd / dur) * 100 : 100
  const trimStartHandlePct = dur > 0 && trimStart !== undefined ? (trimStart / dur) * 100 : 0
  const absWidth = pxPerSec && dur > 0 ? Math.round(dur * pxPerSec) : null

  return {
    canvasRef,
    containerRef,
    playing,
    playhead,
    dur,
    onMouseMove,
    onMouseLeave,
    HoverOverlay,
    playFrom,
    togglePlay,
    stop,
    handleClick,
    activate,
    isActive,
    handleDblClick,
    handleTrimDown,
    trimEndHandlePct,
    trimStartHandlePct,
    absWidth,
  }
}
