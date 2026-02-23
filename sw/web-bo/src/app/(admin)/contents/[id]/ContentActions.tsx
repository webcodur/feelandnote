'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2, Loader2, LinkIcon, Save } from 'lucide-react'
import { deleteContent, upsertAffiliatePlatform, type AffiliateLink } from '@/actions/admin/contents'
import Button from '@/components/ui/Button'

const PLATFORMS = [
  { key: 'coupang', label: '쿠팡', color: '#E44232' },
  { key: 'aladin', label: '알라딘', color: '#5085C5' },
  { key: 'yes24', label: 'YES24', color: '#00A651' },
  { key: 'kyobo', label: '교보문고', color: '#5055B1' },
] as const

interface ContentActionsProps {
  content: {
    id: string
    title: string
    affiliate_url: AffiliateLink[] | null
  }
}

export default function ContentActions({ content }: ContentActionsProps) {
  const router = useRouter()
  const [isDeleting, setIsDeleting] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  // 플랫폼별 URL 상태를 초기화
  const initUrls = () => {
    const map: Record<string, string> = {}
    for (const p of PLATFORMS) map[p.key] = ''
    if (content.affiliate_url) {
      for (const link of content.affiliate_url) {
        map[link.platform] = link.url
      }
    }
    return map
  }

  const [urls, setUrls] = useState<Record<string, string>>(initUrls)
  const [savingKey, setSavingKey] = useState<string | null>(null)

  const handleSave = async (platform: string) => {
    setSavingKey(platform)
    try {
      await upsertAffiliatePlatform(content.id, platform, urls[platform])
      router.refresh()
    } catch (error) {
      console.error('Failed to save:', error)
      alert('저장 실패')
    } finally {
      setSavingKey(null)
    }
  }

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      await deleteContent(content.id)
      router.push('/contents')
    } catch (error) {
      console.error('Failed to delete content:', error)
      alert('콘텐츠 삭제에 실패했습니다')
    } finally {
      setIsDeleting(false)
      setShowConfirm(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* 제휴 링크 — 플랫폼별 고정 행 */}
      <div className="space-y-3">
        <label className="flex items-center gap-2 text-sm font-medium text-text-primary">
          <LinkIcon className="w-4 h-4" />
          제휴 링크
        </label>

        {PLATFORMS.map((p) => (
          <div key={p.key} className="flex items-center gap-2">
            <span
              className="shrink-0 w-20 text-xs font-semibold text-white text-center py-1.5 rounded"
              style={{ backgroundColor: p.color }}
            >
              {p.label}
            </span>
            <input
              type="url"
              value={urls[p.key]}
              onChange={(e) => setUrls(prev => ({ ...prev, [p.key]: e.target.value }))}
              placeholder="https://..."
              className="flex-1 px-3 py-1.5 text-sm bg-bg-secondary border border-border rounded-lg text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent"
            />
            <Button
              variant="secondary"
              size="sm"
              onClick={() => handleSave(p.key)}
              disabled={savingKey === p.key}
              className="shrink-0 min-w-[80px]"
            >
              {savingKey === p.key ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  저장
                </>
              )}
            </Button>
          </div>
        ))}
      </div>

      <div className="pt-4 border-t border-border" />

      {showConfirm ? (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
          <p className="text-sm text-red-400 mb-4">
            정말 이 콘텐츠를 삭제하시겠습니까?<br />
            관련된 모든 사용자 등록 정보와 기록도 함께 삭제됩니다.
          </p>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowConfirm(false)}
              disabled={isDeleting}
            >
              취소
            </Button>
            <Button
              size="sm"
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-red-500 hover:bg-red-600"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  삭제 중...
                </>
              ) : (
                '삭제 확인'
              )}
            </Button>
          </div>
        </div>
      ) : (
        <Button
          variant="secondary"
          onClick={() => setShowConfirm(true)}
          className="text-red-400 hover:text-red-300"
        >
          <Trash2 className="w-4 h-4" />
          콘텐츠 삭제
        </Button>
      )}
    </div>
  )
}
