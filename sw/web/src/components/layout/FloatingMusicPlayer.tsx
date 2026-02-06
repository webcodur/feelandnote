'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Music, X, Info } from 'lucide-react'
import { Z_INDEX } from '@/constants/zIndex'
import { getMyMusicList, type MusicTrack } from '@/actions/contents/getMyMusicList'
import type { ContentStatus } from '@/types/database'
import MusicTrackItem from './MusicTrackItem'

// #region Constants
const DEFAULT_W = 320
const DEFAULT_H = 420
const MIN_W = 280
const MIN_H = 260
const MAX_W = 560
const MAX_H = 700
const HEADER_H = 32
const EMBED_H = 152
const NOTICE_H = 80
const LS_KEY = 'fn-music-player-size'
// #endregion

// #region Helpers
const extractSpotifyId = (contentId: string) =>
  contentId.replace(/^spotify[-_]/, '')

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

// #region Component
export default function FloatingMusicPlayer() {
  const [isOpen, setIsOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [tracks, setTracks] = useState<MusicTrack[]>([])
  const [currentIdx, setCurrentIdx] = useState(0)
  const [loading, setLoading] = useState(false)
  const [panelW, setPanelW] = useState(DEFAULT_W)
  const [panelH, setPanelH] = useState(DEFAULT_H)
  const [showNotice, setShowNotice] = useState(true)
  const loadedRef = useRef(false)
  const dragRef = useRef<{ x: number; y: number; w: number; h: number } | null>(null)
  const sizeRef = useRef({ w: DEFAULT_W, h: DEFAULT_H })

  // 첫 오픈 시 저장 사이즈 복원 + 음악 목록 로드
  useEffect(() => {
    if (!mounted || loadedRef.current) return
    loadedRef.current = true
    const saved = loadSavedSize()
    if (saved) { setPanelW(saved.w); setPanelH(saved.h); sizeRef.current = saved }
    setLoading(true)
    getMyMusicList().then((list) => { setTracks(list); setLoading(false) })
  }, [mounted])

  // #region Resize
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

  // #region Track Actions
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
  // #endregion

  const handleOpen = () => { setIsOpen(true); setMounted(true) }
  const handleHide = () => setIsOpen(false)

  const current = tracks[currentIdx]
  const noticeH = showNotice ? NOTICE_H : 0
  const listH = Math.max(0, panelH - HEADER_H - EMBED_H - noticeH)

  return (
    <div className="fixed bottom-4 end-4" style={{ zIndex: Z_INDEX.floatingPlayer }}>
      {/* FAB */}
      {!isOpen && (
        <button
          onClick={handleOpen}
          className="w-12 h-12 rounded-full flex items-center justify-center shadow-lg border bg-bg-card border-border text-text-secondary hover:text-accent hover:border-accent/30"
          title="뮤직 플레이어"
        >
          <Music size={20} />
        </button>
      )}

      {/* 패널 */}
      {mounted && (
        <div
          className={`relative bg-bg-card border border-border rounded-xl shadow-2xl overflow-hidden [&_*]:!font-sans ${
            isOpen ? '' : 'invisible pointer-events-none absolute'
          }`}
          style={{ width: panelW, height: panelH }}
        >
          {/* 리사이즈 핸들 */}
          <div className="absolute top-0 start-0 w-5 h-5 cursor-nw-resize z-10 group" onMouseDown={handleResizeStart}>
            <div className="absolute top-1.5 start-1.5 w-2 h-2 border-t-2 border-s-2 border-text-tertiary/30 group-hover:border-text-secondary rounded-tl-sm" />
          </div>

          {/* 헤더 */}
          <div className="flex items-center justify-between px-3 border-b border-border" style={{ height: HEADER_H }}>
            <span className="text-[11px] font-medium text-text-tertiary ps-4">Music Player</span>
            <button onClick={handleHide} className="w-6 h-6 flex items-center justify-center rounded hover:bg-white/10 text-text-tertiary" title="닫기">
              <X size={13} />
            </button>
          </div>

          {/* Spotify 임베드 */}
          <div style={{ height: EMBED_H }}>
            {current && (
              <iframe
                key={current.id}
                src={spotifyEmbedUrl(extractSpotifyId(current.id), current.spotifyEntity)}
                width="100%"
                height={EMBED_H}
                frameBorder="0"
                allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
              />
            )}
          </div>

          {/* 이용 안내 */}
          {showNotice && (
            <div className="flex gap-2 px-3 py-2 border-t border-border bg-white/[0.02]" style={{ height: NOTICE_H }}>
              <Info size={13} className="text-text-tertiary shrink-0 mt-0.5" />
              <ol className="flex-1 text-[10px] text-text-secondary leading-relaxed list-decimal list-inside space-y-0.5">
                <li>음악 재생에는 브라우저에서 <span className="text-text-primary">Spotify 로그인</span>이 필요합니다.</li>
                <li>19세 제한 곡은 <span className="text-text-primary">Spotify 앱에서 해당 곡 재생을 시도</span>하면 성인인증 화면이 나타납니다. 인증 완료 후 돌아오면 정상 재생됩니다.</li>
              </ol>
              <button onClick={() => setShowNotice(false)} className="w-5 h-5 flex items-center justify-center rounded hover:bg-white/10 text-text-tertiary shrink-0">
                <X size={11} />
              </button>
            </div>
          )}

          {/* 트랙 목록 */}
          <div className="border-t border-border overflow-y-auto" style={{ height: listH }}>
            {loading && (
              <div className="flex items-center justify-center h-12">
                <span className="text-xs text-text-tertiary">불러오는 중...</span>
              </div>
            )}
            {!loading && tracks.length === 0 && (
              <div className="flex items-center justify-center h-12">
                <span className="text-xs text-text-tertiary">저장된 음악이 없습니다</span>
              </div>
            )}
            {!loading && tracks.map((track, idx) => (
              <MusicTrackItem
                key={track.id}
                track={track}
                index={idx}
                total={tracks.length}
                isActive={idx === currentIdx}
                onSelect={() => setCurrentIdx(idx)}
                onUpdate={handleStatusUpdate}
                onRemove={handleRemove}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
// #endregion
