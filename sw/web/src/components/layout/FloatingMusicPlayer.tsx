'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { Music, X, Info } from 'lucide-react'
import { Z_INDEX } from '@/constants/zIndex'
import { getMyMusicList, type MusicTrack } from '@/actions/contents/getMyMusicList'
import type { ContentStatus } from '@/types/database'
import MusicTrackItem from './MusicTrackItem'
import GameAudioPlayer from '@/components/shared/GameAudioPlayer'
import { useGameAudioContext } from '@/contexts/GameAudioContext'
import { createClient } from '@/lib/supabase/client'

// #region Constants
const DEFAULT_W = 320
const DEFAULT_H = 420
const MIN_W = 280
const MIN_H = 260
const MAX_W = 560
const MAX_H = 700
const HEADER_H = 32
const SPLIT_H = 10
const EMBED_SIZES = [80, 152, 352] as const
const EMBED_DEFAULT = 152
const LIST_MIN = 60

const snapEmbed = (h: number) =>
  EMBED_SIZES.reduce((a, b) => Math.abs(b - h) < Math.abs(a - h) ? b : a)
const LS_KEY = 'fn-music-player-size'
const LS_SPLIT_KEY = 'fn-music-split'
const LS_NOTICE_KEY = 'fn-music-notice-dismissed'

function NoticeItems({ t }: { t: (key: string, params?: Record<string, string>) => string }) {
  const tStatus = useTranslations('status')
  const items = [
    <>{t('noticeWantStatus', { want: tStatus('want'), finished: tStatus('finished') })}</>,
    <>{t('noticeSpotify', { login: t('noticeSpotifyLogin') })}</>,
    <>{t('noticeAge', { action: t('noticeAgeAction') })}</>,
  ]
  return <>{items.map((item, i) => <li key={i}>{item}</li>)}</>
}
// #endregion

// #region Helpers
const extractSpotifyId = (externalId: string) =>
  externalId.replace(/^spotify[-_]/, '')

const spotifyEmbedUrl = (id: string, entity: 'track' | 'album') =>
  `https://open.spotify.com/embed/${entity}/${id}?utm_source=generator&theme=0`

const loadSavedSize = () => {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return null
    const { w, h } = JSON.parse(raw)
    if (typeof w === 'number' && typeof h === 'number') return { w, h }
  } catch { /* 무시 */ }
  return null
}
// #endregion

export default function FloatingMusicPlayer() {
  const t = useTranslations('musicPlayer')
  const { controls: gameAudio } = useGameAudioContext()
  const [isOpen, setIsOpen] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)
  const [tracks, setTracks] = useState<MusicTrack[]>([])
  const [currentIdx, setCurrentIdx] = useState(0)
  const [loading, setLoading] = useState(false)
  const [panelW, setPanelW] = useState(DEFAULT_W)
  const [panelH, setPanelH] = useState(DEFAULT_H)
  const [embedH, setEmbedH] = useState(EMBED_DEFAULT)
  const [splitKey, setSplitKey] = useState(0)
  const [showNotice, setShowNotice] = useState(false)
  const [showInfo, setShowInfo] = useState(false)
  const loadedRef = useRef(false)
  const dragRef = useRef<{ x: number; y: number; w: number; h: number } | null>(null)
  const sizeRef = useRef({ w: DEFAULT_W, h: DEFAULT_H })
  const embedHRef = useRef(EMBED_DEFAULT)

  // 비로그인 시 뮤직 플레이어 FAB 숨김
  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      setIsAuthenticated(!!user)
    })
  }, [])

  useEffect(() => {
    if (!isOpen || loadedRef.current) return
    loadedRef.current = true
    const saved = loadSavedSize()
    if (saved) { setPanelW(saved.w); setPanelH(saved.h); sizeRef.current = saved }
    const split = localStorage.getItem(LS_SPLIT_KEY)
    if (split) { const h = Number(split); setEmbedH(h); embedHRef.current = h }
    const dismissed = !!localStorage.getItem(LS_NOTICE_KEY)
    setShowNotice(!dismissed)
    if (dismissed) {
      setLoading(true)
      getMyMusicList().then((list) => { setTracks(list); setLoading(false) })
    }
  }, [isOpen])

  const handleDismissNotice = () => {
    setShowNotice(false)
    localStorage.setItem(LS_NOTICE_KEY, '1')
    setLoading(true)
    getMyMusicList().then((list) => { setTracks(list); setLoading(false) })
  }

  // #region Panel Resize (좌상단)
  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    dragRef.current = { x: e.clientX, y: e.clientY, w: sizeRef.current.w, h: sizeRef.current.h }
    const onMove = (ev: MouseEvent) => {
      if (!dragRef.current) return
      const w = Math.min(MAX_W, Math.max(MIN_W, dragRef.current.w + (dragRef.current.x - ev.clientX)))
      const h = Math.min(MAX_H, Math.max(MIN_H, dragRef.current.h + (dragRef.current.y - ev.clientY)))
      sizeRef.current = { w, h }
      setPanelW(w)
      setPanelH(h)
    }
    const onUp = () => {
      dragRef.current = null
      localStorage.setItem(LS_KEY, JSON.stringify(sizeRef.current))
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }, [])
  // #endregion

  // #region Split Resize (embed ↔ 트랙 목록)
  const handleSplitStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    const startY = e.clientY
    const startH = embedHRef.current
    const maxEmbed = sizeRef.current.h - HEADER_H - LIST_MIN - SPLIT_H
    const onMove = (ev: MouseEvent) => {
      const h = Math.min(maxEmbed, Math.max(EMBED_SIZES[0], startH + (ev.clientY - startY)))
      embedHRef.current = h
      setEmbedH(h)
    }
    const onUp = () => {
      const snapped = snapEmbed(embedHRef.current)
      embedHRef.current = snapped
      setEmbedH(snapped)
      localStorage.setItem(LS_SPLIT_KEY, String(snapped))
      setSplitKey((k) => k + 1)
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }, [])
  // #endregion

  const handleStatusUpdate = (contentId: string, newStatus: ContentStatus) => {
    setTracks((prev) => prev.map((t) => t.id === contentId ? { ...t, status: newStatus } : t))
  }

  const handleRemove = (contentId: string) => {
    setTracks((prev) => {
      const next = prev.filter((t) => t.id !== contentId)
      if (currentIdx >= next.length) setCurrentIdx(Math.max(0, next.length - 1))
      return next
    })
  }

  const handleOpen = () => setIsOpen(true)
  const handleHide = () => setIsOpen(false)
  const current = tracks[currentIdx]
  const bodyH = panelH - HEADER_H
  const maxEmbed = bodyH - LIST_MIN - SPLIT_H
  const clamped = Math.min(Math.max(EMBED_SIZES[0], embedH), maxEmbed)
  const listH = Math.max(0, bodyH - clamped - SPLIT_H)
  const zStyle = { zIndex: Z_INDEX.floatingPlayer }

  // 비로그인 시 뮤직 플레이어 렌더링 안 함 (게임 모드는 예외)
  if (!gameAudio && isAuthenticated === false) return null

  // ── 게임 모드: 게임 오디오 컨트롤로 전환 ──
  if (gameAudio) {
    const gameZStyle = { zIndex: Z_INDEX.floatingPlayerGame }
    return (
      <>
        {!isOpen && (
          <button onClick={handleOpen} className="fixed bottom-4 end-4 w-12 h-12 rounded-full flex items-center justify-center shadow-lg border bg-bg-card/90 backdrop-blur-sm border-accent/30 text-accent hover:bg-bg-card hover:border-accent/50 transition-colors" style={gameZStyle} title={t('gameBgm')}>
            <Music size={20} />
          </button>
        )}
        <div className={`fixed bottom-4 end-4 bg-bg-card/95 backdrop-blur-sm border border-accent/20 rounded-xl shadow-2xl [&_*]:!font-sans transition-all ${isOpen ? '' : 'invisible opacity-0 pointer-events-none'}`} style={{ ...gameZStyle, width: Math.max(panelW, 420) }}>
          <div className="flex items-center justify-between px-3 py-1.5 border-b border-white/5">
            <span className="text-[11px] font-medium text-accent/70 ps-1">{t('gameBgm')}</span>
            <button onClick={handleHide} className="w-6 h-6 flex items-center justify-center rounded hover:bg-white/10" title={t('close')}>
              <X size={13} />
            </button>
          </div>
          <div className="px-3 py-2.5">
            <GameAudioPlayer controls={gameAudio} />
          </div>
        </div>
      </>
    )
  }

  // ── 기본 모드: Spotify 뮤직 플레이어 ──
  return (
    <>
      {!isOpen && (
        <button onClick={handleOpen} className="fixed bottom-4 end-4 w-12 h-12 rounded-full flex items-center justify-center shadow-lg border bg-bg-card border-border text-text-secondary hover:text-accent hover:border-accent/30" style={zStyle} title={t('title')}>
          <Music size={20} />
        </button>
      )}


        <div className={`fixed bottom-4 end-4 bg-bg-card border border-border rounded-xl shadow-2xl overflow-hidden [&_*]:!font-sans ${isOpen ? '' : 'invisible opacity-0 pointer-events-none'}`} style={{ ...zStyle, width: panelW, height: panelH }}>
          {/* 패널 리사이즈 핸들 */}
          <div className="absolute top-0 start-0 w-5 h-5 cursor-nw-resize z-10 group" onMouseDown={handleResizeStart}>
            <div className="absolute top-1.5 start-1.5 w-2 h-2 border-t-2 border-s-2 group-hover:border-text-secondary rounded-tl-sm" />
          </div>

          {/* 헤더 */}
          <div className="flex items-center justify-between px-3 border-b border-border" style={{ height: HEADER_H }}>
            <div className="flex items-center gap-1.5 ps-4">
              <span className="text-[11px] font-medium">{t('title')}</span>
              {!showNotice && (
                <button onClick={() => setShowInfo((v) => !v)} className={showInfo ? 'text-accent' : ' hover:text-text-secondary'}>
                  <Info size={11} />
                </button>
              )}
            </div>
            <button onClick={handleHide} className="w-6 h-6 flex items-center justify-center rounded hover:bg-white/10" title={t('close')}>
              <X size={13} />
            </button>
          </div>

          {/* 최초 온보딩 */}
          {showNotice && (
            <div className="flex flex-col items-center justify-center px-6 text-center" style={{ height: bodyH }}>
              <Info size={28} className="text-accent/60 mb-4" />
              <p className="text-xs font-semibold text-text-primary mb-4">{t('playGuide')}</p>
              <ol className="text-xs text-text-secondary leading-relaxed list-decimal list-inside space-y-2 text-start">
                <NoticeItems t={t} />
              </ol>
              <button onClick={handleDismissNotice} className="mt-6 px-6 py-2 rounded-lg bg-accent/10 text-accent text-xs font-medium hover:bg-accent/20">{t('confirm')}</button>
            </div>
          )}

          {/* 본문 */}
          {!showNotice && (
            <>
              {showInfo && (
                <div className="absolute top-8 start-0 end-0 p-3 bg-bg-secondary/95 border-b border-border z-20 backdrop-blur-sm">
                  <ol className="text-xs text-text-secondary leading-relaxed list-decimal list-inside space-y-1.5">
                    <NoticeItems t={t} />
                  </ol>
                </div>
              )}

              {/* 재생기 — 아이튠즈로 옮긴 곡은 미리듣기 음원을 직접 재생하고, 남은 Spotify 곡은 기존 임베드 */}
              <div style={{ height: clamped }}>
                {current && current.source === 'itunes' && (
                  current.previewUrl ? (
                    <div className="flex flex-col items-center justify-center gap-2 h-full px-3">
                      <audio key={current.id} src={current.previewUrl} controls autoPlay preload="none" className="w-full" />
                      <span className="text-[11px] text-text-secondary">{t('previewNotice')}</span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <span className="text-[11px] text-text-secondary">{t('previewUnavailable')}</span>
                    </div>
                  )
                )}
                {current && current.source === 'spotify' && (
                  <iframe className="block" key={`${current.id}-${splitKey}`} src={spotifyEmbedUrl(extractSpotifyId(current.externalId), current.spotifyEntity)} width="100%" height={clamped} frameBorder="0" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" />
                )}
              </div>

              {/* 스플릿 핸들 */}
              <div className="flex items-center justify-center cursor-row-resize select-none group hover:bg-white/5" style={{ height: SPLIT_H }} onMouseDown={handleSplitStart}>
                <div className="w-8 h-0.5 rounded-full group-hover:" />
              </div>

              {/* 트랙 목록 */}
              <div className="overflow-y-auto" style={{ height: listH }}>
                {loading && <div className="flex items-center justify-center h-12"><span className="text-xs">{t('loading')}</span></div>}
                {!loading && tracks.length === 0 && <div className="flex flex-col items-center justify-center gap-1 h-16"><span className="text-xs">{t('empty')}</span><span className="text-[11px]">{t('emptyHint')}</span></div>}
                {!loading && tracks.map((track, idx) => (
                  <MusicTrackItem key={track.id} track={track} index={idx} total={tracks.length} isActive={idx === currentIdx} onSelect={() => setCurrentIdx(idx)} onUpdate={handleStatusUpdate} onRemove={handleRemove} />
                ))}
              </div>
            </>
          )}
        </div>

    </>
  )
}
