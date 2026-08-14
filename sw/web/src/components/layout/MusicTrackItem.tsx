'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useTranslations } from 'next-intl'
import { Music, MoreVertical, CheckCircle, Trash2, BookmarkCheck } from 'lucide-react'
import { updateStatus } from '@/actions/contents/updateStatus'
import { removeContent } from '@/actions/contents/removeContent'
import type { MusicTrack } from '@/actions/contents/getMyMusicList'
import type { ContentStatus } from '@/types/database'
import { Z_INDEX } from '@/constants/zIndex'

// #region Constants
const STATUS_COLOR: Record<string, string> = {
  WANT: '#d4af37',
  FINISHED: '#9e7aff',
}

const STATUS_OPTIONS: { status: ContentStatus; key: string; icon: React.ReactNode }[] = [
  { status: 'WANT', key: 'want', icon: <BookmarkCheck size={12} /> },
  { status: 'FINISHED', key: 'finished', icon: <CheckCircle size={12} /> },
]
// #endregion

interface Props {
  track: MusicTrack
  index: number
  total: number
  isActive: boolean
  onSelect: () => void
  onUpdate: (id: string, status: ContentStatus) => void
  onRemove: (id: string) => void
}

export default function MusicTrackItem({ track, index, total, isActive, onSelect, onUpdate, onRemove }: Props) {
  const t = useTranslations('musicPlayer')
  const tStatus = useTranslations('status')
  const [menuOpen, setMenuOpen] = useState(false)
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 })
  const btnRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  // 메뉴 위치 계산 + 열기
  const toggleMenu = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    if (menuOpen) { setMenuOpen(false); return }
    if (!btnRef.current) return
    const rect = btnRef.current.getBoundingClientRect()
    setMenuPos({ top: rect.top - 4, left: rect.right - 112 })
    setMenuOpen(true)
  }, [menuOpen])

  // 외부 클릭 닫기
  useEffect(() => {
    if (!menuOpen) return
    const close = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)
        && btnRef.current && !btnRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [menuOpen])

  const handleStatusChange = async (newStatus: ContentStatus) => {
    setMenuOpen(false)
    if (newStatus === track.status) return
    await updateStatus({ userContentId: track.userContentId, status: newStatus })
    onUpdate(track.id, newStatus)
  }

  const handleRemove = async () => {
    setMenuOpen(false)
    await removeContent(track.userContentId)
    onRemove(track.id)
  }

  const statusColor = STATUS_COLOR[track.status]

  return (
    <div className={`relative flex items-center gap-1 px-2 py-1.5 hover:bg-white/5 ${isActive ? 'bg-accent/10' : ''}`}>
      {/* 곡 선택 */}
      <button onClick={onSelect} className="flex-1 flex items-center gap-2 text-start min-w-0">
        <span className="text-[10px] w-8 shrink-0 text-end tabular-nums">
          {index + 1}/{total}
        </span>
        <Music size={12} className={isActive ? 'text-accent shrink-0' : ' shrink-0'} />
        <div className="flex-1 min-w-0">
          <p className={`text-xs font-medium truncate ${isActive ? 'text-accent' : 'text-text-primary'}`}>
            {track.title}
          </p>
          {track.creator && (
            <p className="text-[10px] truncate">{track.creator}</p>
          )}
        </div>
        <div className="flex flex-col items-end gap-0.5 shrink-0">
          <span className="text-[9px]">{t(track.entity)}</span>
          {statusColor && <span className="text-[9px]" style={{ color: statusColor }}>{tStatus(track.status.toLowerCase())}</span>}
        </div>
      </button>

      {/* 더보기 버튼 */}
      <button
        ref={btnRef}
        onClick={toggleMenu}
        className="w-6 h-6 flex items-center justify-center rounded hover:bg-white/10 shrink-0"
      >
        <MoreVertical size={13} />
      </button>

      {/* 드롭다운 (portal로 body에 렌더링하여 overflow 회피) */}
      {menuOpen && createPortal(
        <div
          ref={menuRef}
          className="fixed w-28 py-1 bg-bg-card border border-border rounded-lg shadow-xl [&_*]:!font-sans"
          style={{ top: menuPos.top, left: menuPos.left, transform: 'translateY(-100%)', zIndex: Z_INDEX.dropdown }}
        >
          {STATUS_OPTIONS.map((opt) => (
            <button
              key={opt.status}
              onClick={() => handleStatusChange(opt.status)}
              className={`w-full flex items-center gap-2 px-3 py-1.5 text-[11px] hover:bg-white/5 ${
                track.status === opt.status ? 'text-accent' : 'text-text-primary'
              }`}
            >
              {opt.icon}
              {tStatus(opt.key)}
            </button>
          ))}
          <div className="border-t border-border my-0.5" />
          <button
            onClick={handleRemove}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-[11px] text-red-400 hover:bg-red-400/10"
          >
            <Trash2 size={12} />
            {t('delete')}
          </button>
        </div>,
        document.body
      )}
    </div>
  )
}
