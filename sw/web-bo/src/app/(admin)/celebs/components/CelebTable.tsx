'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { Star, BookOpen, BadgeCheck, CheckCircle, Ban, Zap, Clock, Copy, Check, Loader2 } from 'lucide-react'
import { type Member } from '@/actions/admin/members'
import { toggleCelebTier, toggleCelebStatus, updateCeleb } from '@/actions/admin/celebs'
import { uploadCelebImage } from '@/actions/admin/storage'
import { getCelebProfessionLabel } from '@/constants/celebCategories'
import { resizeSingleImage, createPreviewUrl } from '@/lib/image'
import ImageCropModal from '@/components/ui/ImageCropModal'
import StatusToggle from '../../members/components/StatusToggle'
import NationalityBadge from '../../members/components/NationalityBadge'
import SortableTableHeader from '@/components/ui/SortableTableHeader'

export default function CelebTable({ celebs }: { celebs: Member[] }) {
  return (
    <table className="w-full min-w-[800px]">
      <thead className="bg-bg-secondary border-b border-border">
        <tr>
          <SortableTableHeader column="avatar_url" label="img" className="w-12" align="center" />
          <th className="text-start px-3 md:px-4 py-3 text-xs md:text-sm font-medium text-text-secondary font-mono">title</th>
          <SortableTableHeader column="nickname" label="nickname" />
          <th className="text-center px-3 md:px-4 py-3 text-xs md:text-sm font-medium text-text-secondary font-mono w-16">tier</th>
          <SortableTableHeader column="profession" label="profession" />
          <SortableTableHeader column="nationality" label="nationality" align="center" />
          <th className="text-center px-3 md:px-4 py-3 text-xs md:text-sm font-medium text-text-secondary font-mono w-12">gender</th>
          <SortableTableHeader column="status" label="status" align="center" />
          <SortableTableHeader column="influence_total" label="influence_total" align="center" />
          <SortableTableHeader column="content_count" label="content_count" align="center" />
          <SortableTableHeader column="follower_count" label="follower_count" align="center" />
          <SortableTableHeader column="created_at" label="created_at" align="center" />
          <th className="text-center px-3 md:px-4 py-3 text-xs md:text-sm font-medium text-text-secondary w-24">actions</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-border">
        {celebs.length === 0 ? (
          <tr><td colSpan={13} className="px-4 py-12 text-center text-text-secondary text-sm">셀럽이 없습니다</td></tr>
        ) : (
          celebs.map((celeb) => (
            <tr key={celeb.id} className="odd:bg-white/[0.02] hover:bg-bg-secondary/50">
              <td className="px-3 md:px-4 py-3">
                <AvatarCell celebId={celeb.id} avatarUrl={celeb.avatar_url} />
              </td>
              <td className="px-3 md:px-4 py-3">
                {celeb.title && (
                  <p className="text-xs text-accent truncate max-w-[120px]">{celeb.title}</p>
                )}
              </td>
              <td className="px-3 md:px-4 py-3">
                <div className="flex items-center gap-1.5">
                  <Link
                    href={`/celebs/${celeb.slug}`}
                    className="text-xs md:text-sm font-medium text-text-primary truncate max-w-[120px] hover:text-accent hover:underline"
                  >
                    {celeb.nickname || '이름 없음'}
                  </Link>
                  {celeb.is_verified && <BadgeCheck className="w-3.5 h-3.5 text-blue-400 shrink-0" />}
                  <CopyButton text={celeb.nickname || ''} />
                </div>
              </td>
              <td className="px-3 md:px-4 py-3 text-center">
                <TierToggle celebId={celeb.id} tier={celeb.celeb_tier || 'full'} />
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
                <Link
                  href={`/celebs/${celeb.slug}/contents`}
                  className="inline-flex items-center gap-1 text-xs md:text-sm text-text-secondary hover:text-accent"
                >
                  <BookOpen className="w-3.5 h-3.5" />{celeb.content_count}
                </Link>
              </td>
              <td className="px-3 md:px-4 py-3 text-center">
                <span className="inline-flex items-center gap-1 text-xs md:text-sm text-text-secondary">
                  <Star className="w-3.5 h-3.5" />{celeb.follower_count}
                </span>
              </td>
              <td className="px-3 md:px-4 py-3 text-center">
                <DateTimeCell date={celeb.created_at} />
              </td>
              <td className="px-3 md:px-4 py-3">
                <div className="flex items-center justify-center">
                  <StatusToggle member={celeb} />
                </div>
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

function AvatarCell({ celebId, avatarUrl }: { celebId: string; avatarUrl: string | null }) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [cropModalOpen, setCropModalOpen] = useState(false)
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [currentUrl, setCurrentUrl] = useState(avatarUrl)

  async function openCropModal(file: File) {
    if (!file.type.startsWith('image/')) return
    const preview = await createPreviewUrl(file)
    setCropImageSrc(preview)
    setCropModalOpen(true)
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault()
    e.stopPropagation()
    setDragging(true)
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault()
    e.stopPropagation()
    setDragging(false)
  }

  async function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    e.stopPropagation()
    setDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) openCropModal(file)
  }

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) openCropModal(file)
    e.target.value = ''
  }

  async function handleCropComplete(croppedDataUrl: string) {
    setCropModalOpen(false)
    setUploading(true)

    try {
      const response = await fetch(croppedDataUrl)
      const blob = await response.blob()
      const file = new File([blob], 'avatar.webp', { type: 'image/webp' })
      const resized = await resizeSingleImage(file, 'avatar')
      const uploadResult = await uploadCelebImage({ celebId, image: resized, type: 'avatar' })

      if (!uploadResult.success) throw new Error(uploadResult.error)

      await updateCeleb({ id: celebId, avatar_url: uploadResult.url })
      setCurrentUrl(uploadResult.url!)
      router.refresh()
    } catch (err) {
      console.error('아바타 업로드 실패:', err)
    } finally {
      setUploading(false)
    }
  }

  return (
    <>
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`relative w-8 h-8 md:w-9 md:h-9 rounded-lg flex items-center justify-center overflow-hidden shrink-0 cursor-pointer transition-colors ${
          dragging ? 'ring-2 ring-accent bg-accent/10' : 'bg-bg-secondary hover:ring-1 hover:ring-accent/50'
        }`}
      >
        <input ref={inputRef} type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />
        {uploading ? (
          <Loader2 className="w-4 h-4 text-accent animate-spin" />
        ) : currentUrl ? (
          <Image src={currentUrl} alt="" fill unoptimized className="object-cover" />
        ) : (
          <span className="text-[10px] text-text-tertiary">N/A</span>
        )}
      </div>
      {cropModalOpen && cropImageSrc && (
        <ImageCropModal
          imageSrc={cropImageSrc}
          aspectRatio={1}
          onComplete={handleCropComplete}
          onCancel={() => setCropModalOpen(false)}
        />
      )}
    </>
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
