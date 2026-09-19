'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Star, BookOpen, BadgeCheck, CheckCircle, Ban, Zap, Clock, Copy, Check, Loader2 } from 'lucide-react'
import { type Member } from '@/actions/admin/members'
import { toggleCelebTier, toggleCelebStatus } from '@/actions/admin/celebs'
import { useToast } from '@/contexts/ToastContext'
import { getCelebProfessionLabel } from '@/constants/celebCategories'
import { isCelebReality } from '@feelandnote/shared/constants/celeb-tiers'
import { CELEB_REALITY_DISPLAY } from '@/constants/celebReality'
import PersistedCelebAvatarEditor from '@/components/celeb/avatar/PersistedCelebAvatarEditor'
import PersistedCelebPortraitEditor from '@/components/celeb/portrait/PersistedCelebPortraitEditor'
import PersistedCelebAwakenedImageEditor from '@/components/celeb/awakened/PersistedCelebAwakenedImageEditor'
import NationalityBadge from '../../members/components/NationalityBadge'
import CelebColumnHeaders from './columnFilters/CelebColumnHeader'
import { useColumnVisibility } from './columnFilters/ColumnVisibility'
import { CELL_BORDER_CLASS, COLUMNS } from './columnFilters/columns'

const CELL_CLASS = 'px-3 py-3 md:px-4'
const CENTER_CELL_CLASS = `${CELL_CLASS} text-center`
/** 이미지 셀은 여백 없이 행 높이(h-16)를 꽉 채운다. 이웃과의 경계는 셀 세로선이 맡는다. */
const IMAGE_CELL_CLASS = 'w-16 p-0'
const ROW_CLASS = 'h-16 odd:bg-white/[0.02] hover:bg-bg-secondary/50'

/** 열 순서는 COLUMNS가 쥔다. 여기서는 열마다 무엇을 그릴지만 정한다. */
const CELLS: Record<string, { className: string; render: (celeb: Member) => React.ReactNode }> = {
  avatar_url: { className: IMAGE_CELL_CLASS, render: (celeb) => <AvatarCell celebId={celeb.id} avatarUrl={celeb.avatar_url} name={celeb.nickname} /> },
  portrait_url: { className: IMAGE_CELL_CLASS, render: (celeb) => <PortraitCell celebId={celeb.id} portraitUrl={celeb.portrait_url} name={celeb.nickname} /> },
  awakened_image_url: { className: IMAGE_CELL_CLASS, render: (celeb) => <AwakenedImageCell celebId={celeb.id} awakenedImageUrl={celeb.awakened_image_url} name={celeb.nickname} /> },
  title: { className: CELL_CLASS, render: (celeb) => celeb.title && <p className="max-w-[120px] truncate text-xs text-accent">{celeb.title}</p> },
  nickname: { className: CELL_CLASS, render: (celeb) => <NameCell celeb={celeb} /> },
  celeb_reality: { className: CENTER_CELL_CLASS, render: (celeb) => <RealityBadge reality={celeb.celeb_reality} /> },
  profession: { className: CELL_CLASS, render: (celeb) => celeb.profession && <p className="max-w-[100px] truncate text-xs text-text-tertiary">{getCelebProfessionLabel(celeb.profession)}</p> },
  nationality: { className: `min-w-24 whitespace-nowrap ${CENTER_CELL_CLASS}`, render: (celeb) => celeb.nationality && <NationalityBadge code={celeb.nationality} /> },
  gender: { className: CENTER_CELL_CLASS, render: (celeb) => <GenderBadge gender={celeb.gender} /> },
  status: { className: CENTER_CELL_CLASS, render: (celeb) => <StatusToggleIcon celebId={celeb.id} status={celeb.status} /> },
  influence_total: {
    className: CENTER_CELL_CLASS,
    render: (celeb) => <span className="inline-flex items-center gap-1 text-xs text-text-secondary md:text-sm"><Zap className="h-3.5 w-3.5" />{celeb.influence_total || 0}</span>,
  },
  celeb_tier: { className: CENTER_CELL_CLASS, render: (celeb) => <TierToggle celebId={celeb.id} tier={celeb.celeb_tier || 'full'} /> },
  content_count: {
    className: CENTER_CELL_CLASS,
    render: (celeb) => celeb.slug ? (
      <Link href={`/celebs/${celeb.slug}/contents`} className="inline-flex items-center gap-1 text-xs text-text-secondary hover:text-accent md:text-sm">
        <BookOpen className="h-3.5 w-3.5" />{celeb.content_count}
      </Link>
    ) : (
      <span className="inline-flex items-center gap-1 text-xs text-text-tertiary md:text-sm"><BookOpen className="h-3.5 w-3.5" />{celeb.content_count}</span>
    ),
  },
  follower_count: {
    className: CENTER_CELL_CLASS,
    render: (celeb) => <span className="inline-flex items-center gap-1 text-xs text-text-secondary md:text-sm"><Star className="h-3.5 w-3.5" />{celeb.follower_count}</span>,
  },
  created_at: { className: CENTER_CELL_CLASS, render: (celeb) => <DateTimeCell date={celeb.created_at} /> },
}

export default function CelebTable({ celebs }: { celebs: Member[] }) {
  const { isVisible } = useColumnVisibility()
  const columns = COLUMNS.filter((column) => isVisible(column.field))
  return (
    <table className="w-full min-w-[1360px]">
      <thead className="bg-bg-secondary border-b border-border">
        <CelebColumnHeaders />
      </thead>
      <tbody className="divide-y divide-border">
        {celebs.length === 0 ? (
          <tr><td colSpan={columns.length} className="px-4 py-12 text-center text-text-secondary text-sm">셀럽이 없습니다</td></tr>
        ) : (
          celebs.map((celeb) => (
            <tr key={celeb.id} className={ROW_CLASS}>
              {columns.map((column) => {
                const cell = CELLS[column.field]
                return <td key={column.field} className={`${CELL_BORDER_CLASS} ${cell.className}`}>{cell.render(celeb)}</td>
              })}
            </tr>
          ))
        )}
      </tbody>
    </table>
  )
}

/** 복사 버튼은 이름 앞에 고정한다. 이름 길이에 따라 자리가 흔들리지 않게 한다. */
function NameCell({ celeb }: { celeb: Member }) {
  return (
    <div className="flex items-center gap-1.5">
      <CopyButton text={celeb.nickname || ''} />
      <div className="flex min-w-0 flex-col">
        {celeb.slug ? (
          <Link
            href={`/celebs/${celeb.slug}`}
            className="max-w-[120px] truncate text-xs font-medium text-text-primary hover:text-accent hover:underline md:text-sm"
          >
            {celeb.nickname || '이름 없음'}
          </Link>
        ) : (
          <span className="max-w-[120px] truncate text-xs font-medium text-red-400 md:text-sm" title="nickname_en 미설정">
            {celeb.nickname || '이름 없음'}
          </span>
        )}
        {celeb.slug && (
          <span className="max-w-[120px] truncate font-mono text-[10px] text-text-tertiary">/{celeb.slug}</span>
        )}
      </div>
      {celeb.is_verified && <BadgeCheck className="h-3.5 w-3.5 shrink-0 text-blue-400" />}
    </div>
  )
}

function RealityBadge({ reality }: { reality?: string | null }) {
  if (!isCelebReality(reality)) {
    return <span className="text-sm text-text-secondary">미분류</span>
  }

  const { label, description, className } = CELEB_REALITY_DISPLAY[reality]
  return (
    <span className={`inline-flex whitespace-nowrap rounded border px-1.5 py-0.5 text-xs font-medium ${className}`} title={description}>
      {label}
    </span>
  )
}

function StatusToggleIcon({ celebId, status: initialStatus }: { celebId: string; status: string }) {
  const { showToast } = useToast()
  const [status, setStatus] = useState(initialStatus)
  const [loading, setLoading] = useState(false)

  const config: Record<string, { className: string; hoverClass: string; icon: React.ElementType; title: string }> = {
    active: { className: 'text-green-400', hoverClass: 'hover:bg-yellow-500/10', icon: CheckCircle, title: 'active → inactive' },
    inactive: { className: 'text-yellow-400', hoverClass: 'hover:bg-green-500/10', icon: Clock, title: 'inactive → active' },
    deleted: { className: 'text-gray-400', hoverClass: '', icon: Ban, title: 'deleted' },
  }
  // 값이 없으면 active로 보여 주지 않는다 — 실제로 그 폴백 때문에 비공개 인물이
  // 전원 활성으로 보이는 사고가 있었다. 모르는 값은 모른다고 표시한다
  const unknownConfig = { className: 'text-text-dim', hoverClass: '', icon: Ban, title: '상태 미상' }
  const { className, hoverClass, icon: Icon, title } = config[status] || unknownConfig

  const handleClick = async () => {
    if (status !== 'active' && status !== 'inactive') return
    if (loading) return
    setLoading(true)
    try {
      const newStatus = await toggleCelebStatus(celebId, status)
      setStatus(newStatus)
    } catch (e) {
      showToast('error', e instanceof Error ? e.message : '인물 활성 상태를 바꾸지 못했다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading || status === 'deleted'}
      className={`p-1 rounded cursor-pointer disabled:cursor-default ${className} ${hoverClass}`}
      title={title}
    >
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Icon className="w-4 h-4" />}
    </button>
  )
}

function GenderBadge({ gender }: { gender?: boolean | null }) {
  if (gender === null || gender === undefined) return <span className="text-[10px] text-text-tertiary">-</span>
  return (
    <span className={`text-xs font-medium ${gender ? 'text-blue-400' : 'text-pink-400'}`}>
      {gender ? '♂' : '♀'}
    </span>
  )
}

function TierToggle({ celebId, tier }: { celebId: string; tier: string }) {
  const [current, setCurrent] = useState(tier)
  const [loading, setLoading] = useState(false)

  const handleToggle = async () => {
    setLoading(true)
    try {
      await toggleCelebTier(celebId, current)
      setCurrent(current === 'light' ? 'full' : 'light')
    } catch (e) {
      console.error('tier 토글 실패:', e)
    } finally {
      setLoading(false)
    }
  }

  const isLight = current === 'light'
  return (
    <button
      onClick={handleToggle}
      disabled={loading}
      className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-medium cursor-pointer disabled:opacity-50 ${
        isLight
          ? 'bg-orange-500/10 text-orange-400 hover:bg-orange-500/20'
          : 'bg-blue-500/10 text-blue-400 hover:bg-blue-500/20'
      }`}
    >
      {current}
    </button>
  )
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <button
      onClick={handleCopy}
      className="p-0.5 rounded hover:bg-bg-secondary text-text-tertiary hover:text-text-secondary shrink-0"
      title="이름 복사"
    >
      {copied
        ? <Check className="w-3 h-3 text-green-400" />
        : <Copy className="w-3 h-3" />
      }
    </button>
  )
}

/** 빈 이미지 칸은 사람 눈에 들어오지 않게 흐린 점 하나로 둔다. 있는 이미지가 도드라져야 한다. */
function EmptyImageMark() {
  return <span aria-label="없음" className="text-text-tertiary/50">·</span>
}

function AvatarCell({ celebId, avatarUrl, name }: { celebId: string; avatarUrl: string | null; name: string | null }) {
  return (
    <PersistedCelebAvatarEditor
      celebId={celebId}
      avatarUrl={avatarUrl}
      name={name}
      className="h-16 w-16 shrink-0"
      previewClassName="flex h-full w-full items-center justify-center border border-transparent hover:border-accent"
      empty={<EmptyImageMark />}
    />
  )
}

function PortraitCell({
  celebId,
  portraitUrl,
  name,
}: {
  celebId: string
  portraitUrl?: string | null
  name: string | null
}) {
  return (
    <PersistedCelebPortraitEditor
      celebId={celebId}
      portraitUrl={portraitUrl}
      name={name}
      compact
      className="group/portrait relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden border border-border/40 hover:border-accent data-[dragging=true]:border-accent data-[dragging=true]:bg-accent/10 data-[dragging=true]:ring-2 data-[dragging=true]:ring-accent/30"
      empty={<EmptyImageMark />}
    />
  )
}

function AwakenedImageCell({
  celebId,
  awakenedImageUrl,
  name,
}: {
  celebId: string
  awakenedImageUrl?: string | null
  name: string | null
}) {
  return (
    <PersistedCelebAwakenedImageEditor
      celebId={celebId}
      awakenedImageUrl={awakenedImageUrl}
      name={name}
      compact
      className="group/portrait relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden border border-amber-500/20 hover:border-amber-300 data-[dragging=true]:border-amber-300 data-[dragging=true]:bg-amber-500/10 data-[dragging=true]:ring-2 data-[dragging=true]:ring-amber-400/30"
      empty={<EmptyImageMark />}
    />
  )
}

function DateTimeCell({ date }: { date: string }) {
  if (!date) return <span className="text-xs text-text-tertiary">-</span>
  const d = new Date(date)
  if (isNaN(d.getTime())) return <span className="text-xs text-text-tertiary">-</span>
  const pad = (n: number) => String(n).padStart(2, '0')
  const ymd = `${String(d.getFullYear()).slice(2)}.${pad(d.getMonth() + 1)}.${pad(d.getDate())}`
  const hms = `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
  return (
    <div className="text-xs text-text-secondary leading-tight">
      <div>{ymd}</div>
      <div className="text-text-tertiary">{hms}</div>
    </div>
  )
}
