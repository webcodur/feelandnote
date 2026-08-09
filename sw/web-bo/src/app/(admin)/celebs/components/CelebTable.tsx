'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Star, BookOpen, BadgeCheck, CheckCircle, Ban, Zap, Clock, Copy, Check, Loader2 } from 'lucide-react'
import { type Member } from '@/actions/admin/members'
import { toggleCelebTier, toggleCelebStatus } from '@/actions/admin/celebs'
import { getCelebProfessionLabel } from '@/constants/celebCategories'
import PersistedCelebAvatarEditor from '@/components/celeb/avatar/PersistedCelebAvatarEditor'
import PersistedCelebPortraitEditor from '@/components/celeb/portrait/PersistedCelebPortraitEditor'
import NationalityBadge from '../../members/components/NationalityBadge'
import SortableTableHeader from '@/components/ui/SortableTableHeader'

export default function CelebTable({ celebs }: { celebs: Member[] }) {
  return (
    <table className="w-full min-w-[800px]">
      <thead className="bg-bg-secondary border-b border-border">
        <tr>
          <SortableTableHeader column="avatar_url" label="img" className="w-12" align="center" />
          <th className="w-14 px-3 py-3 text-center text-xs font-medium text-text-secondary md:px-4 md:text-sm">
            portrait
          </th>
          <SortableTableHeader column="title" label="title" className="min-w-36" />
          <SortableTableHeader column="nickname" label="nickname" />
          <SortableTableHeader column="profession" label="profession" />
          <SortableTableHeader column="nationality" label="nationality" align="center" />
          <SortableTableHeader column="gender" label="gender" className="w-12" align="center" />
          <SortableTableHeader column="status" label="status" align="center" />
          <SortableTableHeader column="influence_total" label="influence_total" align="center" />
          <SortableTableHeader column="celeb_tier" label="tier" className="w-16" align="center" />
          <SortableTableHeader column="content_count" label="content_count" align="center" />
          <SortableTableHeader column="follower_count" label="follower_count" align="center" />
          <SortableTableHeader column="created_at" label="created_at" align="center" />
        </tr>
      </thead>
      <tbody className="divide-y divide-border">
        {celebs.length === 0 ? (
          <tr><td colSpan={13} className="px-4 py-12 text-center text-text-secondary text-sm">셀럽이 없습니다</td></tr>
        ) : (
          celebs.map((celeb) => (
            <tr key={celeb.id} className="odd:bg-white/[0.02] hover:bg-bg-secondary/50">
              <td className="px-3 md:px-4 py-3">
                <AvatarCell celebId={celeb.id} avatarUrl={celeb.avatar_url} name={celeb.nickname} />
              </td>
              <td className="px-3 py-3 md:px-4">
                <PortraitCell
                  celebId={celeb.id}
                  portraitUrl={celeb.portrait_url}
                  name={celeb.nickname}
                />
              </td>
              <td className="px-3 md:px-4 py-3">
                {celeb.title && (
                  <p className="text-xs text-accent truncate max-w-[120px]">{celeb.title}</p>
                )}
              </td>
              <td className="px-3 md:px-4 py-3">
                <div className="flex items-center gap-1.5">
                  <div className="flex flex-col">
                    {celeb.slug ? (
                      <Link
                        href={`/celebs/${celeb.slug}`}
                        className="text-xs md:text-sm font-medium text-text-primary truncate max-w-[120px] hover:text-accent hover:underline"
                      >
                        {celeb.nickname || '이름 없음'}
                      </Link>
                    ) : (
                      <span className="text-xs md:text-sm font-medium text-red-400 truncate max-w-[120px]" title="nickname_en 미설정">
                        {celeb.nickname || '이름 없음'}
                      </span>
                    )}
                    {celeb.slug && (
                      <span className="text-[10px] font-mono text-text-tertiary truncate max-w-[120px]">/{celeb.slug}</span>
                    )}
                  </div>
                  {celeb.is_verified && <BadgeCheck className="w-3.5 h-3.5 text-blue-400 shrink-0" />}
                  <CopyButton text={celeb.nickname || ''} />
                </div>
              </td>
              <td className="px-3 md:px-4 py-3">
                {celeb.profession && (
                  <p className="text-xs text-text-tertiary truncate max-w-[100px]">{getCelebProfessionLabel(celeb.profession)}</p>
                )}
              </td>
              <td className="px-3 md:px-4 py-3 text-center">
                {celeb.nationality && <NationalityBadge code={celeb.nationality} />}
              </td>
              <td className="px-3 md:px-4 py-3 text-center">
                <GenderBadge gender={celeb.gender} />
              </td>
              <td className="px-3 md:px-4 py-3 text-center">
                <StatusToggleIcon celebId={celeb.id} status={celeb.status} />
              </td>
              <td className="px-3 md:px-4 py-3 text-center">
                <span className="inline-flex items-center gap-1 text-xs md:text-sm text-text-secondary">
                  <Zap className="w-3.5 h-3.5" />{celeb.influence_total || 0}
                </span>
              </td>
              <td className="px-3 md:px-4 py-3 text-center">
                <TierToggle celebId={celeb.id} tier={celeb.celeb_tier || 'full'} />
              </td>
              <td className="px-3 md:px-4 py-3 text-center">
                {celeb.slug ? (
                  <Link
                    href={`/celebs/${celeb.slug}/contents`}
                    className="inline-flex items-center gap-1 text-xs md:text-sm text-text-secondary hover:text-accent"
                  >
                    <BookOpen className="w-3.5 h-3.5" />{celeb.content_count}
                  </Link>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs md:text-sm text-text-tertiary">
                    <BookOpen className="w-3.5 h-3.5" />{celeb.content_count}
                  </span>
                )}
              </td>
              <td className="px-3 md:px-4 py-3 text-center">
                <span className="inline-flex items-center gap-1 text-xs md:text-sm text-text-secondary">
                  <Star className="w-3.5 h-3.5" />{celeb.follower_count}
                </span>
              </td>
              <td className="px-3 md:px-4 py-3 text-center">
                <DateTimeCell date={celeb.created_at} />
              </td>
            </tr>
          ))
        )}
      </tbody>
    </table>
  )
}

function StatusToggleIcon({ celebId, status: initialStatus }: { celebId: string; status: string }) {
  const [status, setStatus] = useState(initialStatus)
  const [loading, setLoading] = useState(false)

  const config: Record<string, { className: string; hoverClass: string; icon: React.ElementType; title: string }> = {
    active: { className: 'text-green-400', hoverClass: 'hover:bg-yellow-500/10', icon: CheckCircle, title: 'active → inactive' },
    inactive: { className: 'text-yellow-400', hoverClass: 'hover:bg-green-500/10', icon: Clock, title: 'inactive → active' },
    suspended: { className: 'text-red-400', hoverClass: 'hover:bg-green-500/10', icon: Ban, title: 'suspended → active' },
    deleted: { className: 'text-gray-400', hoverClass: '', icon: Ban, title: 'deleted' },
  }
  const { className, hoverClass, icon: Icon, title } = config[status] || config.active

  const handleClick = async () => {
    if (status === 'deleted' || loading) return
    setLoading(true)
    try {
      const newStatus = await toggleCelebStatus(celebId, status)
      setStatus(newStatus)
    } catch (e) {
      console.error('status 전환 실패:', e)
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading || status === 'deleted'}
      className={`p-1 rounded cursor-pointer transition-colors disabled:cursor-default ${className} ${hoverClass}`}
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
      className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-medium cursor-pointer transition-colors disabled:opacity-50 ${
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
      className="p-0.5 rounded hover:bg-bg-secondary text-text-tertiary hover:text-text-secondary transition-colors shrink-0"
      title="이름 복사"
    >
      {copied
        ? <Check className="w-3 h-3 text-green-400" />
        : <Copy className="w-3 h-3" />
      }
    </button>
  )
}

function AvatarCell({ celebId, avatarUrl, name }: { celebId: string; avatarUrl: string | null; name: string | null }) {
  return (
    <PersistedCelebAvatarEditor
      celebId={celebId}
      avatarUrl={avatarUrl}
      name={name}
      className="h-8 w-8 shrink-0 md:h-9 md:w-9"
      previewClassName="h-full w-full rounded-lg border border-transparent hover:border-accent"
      empty={<span className="text-[10px] text-text-tertiary">N/A</span>}
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
      className="group/portrait relative h-8 w-8 shrink-0 overflow-hidden rounded-md border border-border bg-bg-secondary hover:border-accent data-[dragging=true]:border-accent data-[dragging=true]:bg-accent/10 data-[dragging=true]:ring-2 data-[dragging=true]:ring-accent/30 md:h-9 md:w-9"
      empty={<span className="text-[9px] font-medium text-text-tertiary">N/A</span>}
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
