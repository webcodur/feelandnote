'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Check, Copy, User } from 'lucide-react'
import type { Member } from '@/actions/admin/members'
import { isCelebReality } from '@feelandnote/shared/constants/celeb-tiers'
import { CELEB_REALITY_DISPLAY } from '@/constants/celebReality'
import { getCelebProfessionLabel } from '@/constants/celebCategories'
import { useToast } from '@/contexts/ToastContext'
import PersistedCelebAvatarEditor from '@/components/celeb/avatar/PersistedCelebAvatarEditor'

/*
  사용자 웹 /explore의 인물 카드처럼 얼굴·이름·수식어만 띄우는 격자다. 카드는 상세(/celebs/[slug])로 연다.
  얼굴 칸은 표·이미지 작업과 같은 아바타 에디터다 — 사진 파일을 끌어다 놓으면 자르기 창이 열리고 저장된다.
*/
export default function CelebCardGrid({ celebs }: { celebs: Member[] }) {
  const [avatarUrls, setAvatarUrls] = useState<Record<string, string | null>>(() =>
    Object.fromEntries(celebs.map((celeb) => [celeb.id, celeb.avatar_url ?? null]))
  )

  if (celebs.length === 0) {
    return <div className="px-4 py-16 text-center text-sm text-text-secondary">셀럽이 없습니다.</div>
  }

  return (
    <div className="grid grid-cols-3 gap-3 p-3 sm:grid-cols-4 md:gap-5 md:p-5 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8">
      {celebs.map((celeb) => (
        <CelebCard
          key={celeb.id}
          celeb={celeb}
          avatarUrl={avatarUrls[celeb.id] ?? null}
          onAvatarSaved={(url) => setAvatarUrls((current) => ({ ...current, [celeb.id]: url }))}
        />
      ))}
    </div>
  )
}

function CelebCard({ celeb, avatarUrl, onAvatarSaved }: {
  celeb: Member
  avatarUrl: string | null
  onAvatarSaved: (url: string) => void
}) {
  const name = celeb.nickname?.trim() || '이름 없음'
  const title = celeb.title?.trim()
  const subtitle = title || (celeb.profession ? getCelebProfessionLabel(celeb.profession) : null)
  const reality = isCelebReality(celeb.celeb_reality) ? celeb.celeb_reality : null
  const realityBadge = reality && reality !== 'REAL' ? CELEB_REALITY_DISPLAY[reality] : null

  // 얼굴은 드랍 전용 — 링크 밖에 둬야 끌어다 놓을 때 상세로 새지 않는다. 상세 이동은 이름 줄만 맡는다.
  return (
    <div className="group flex w-full flex-col items-center outline-none">
      <div className="relative w-full">
        <PersistedCelebAvatarEditor
          celebId={celeb.id}
          avatarUrl={avatarUrl || celeb.portrait_url || null}
          name={celeb.nickname}
          refreshAfterSave={false}
          onSaved={onAvatarSaved}
          openOnClick
          className="w-full rounded-md"
          previewClassName="relative aspect-square w-full overflow-hidden rounded-md border border-white/5 shadow-inner group-hover:border-accent/60"
          empty={<User className="h-8 w-8 text-text-tertiary" />}
        />
        {/* 배지는 포인터를 꺼 둔다 — 얼굴 어디에 놓아도 드랍이 에디터에 닿아야 한다 */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-1.5 top-1.5 flex flex-col items-start gap-1">
            {celeb.status !== 'active' && (
              <span className="rounded-full border border-white/15 bg-black/70 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white/75">비활성</span>
            )}
            {!avatarUrl && (
              <span className="rounded-full border border-amber-500/40 bg-black/70 px-1.5 py-0.5 text-[10px] font-bold leading-none text-amber-400">아바타 없음</span>
            )}
          </div>

          {celeb.content_count > 0 && (
            <span className="absolute right-1.5 top-1.5 rounded-full border border-white/15 bg-black/70 px-1.5 py-0.5 text-[11px] font-bold leading-none text-white/85">
              {celeb.content_count}
            </span>
          )}
          {realityBadge && (
            <span className={`absolute bottom-1.5 right-1.5 rounded-full border px-1.5 py-0.5 text-[10px] font-bold leading-none backdrop-blur-sm ${realityBadge.className}`}>
              {realityBadge.label}
            </span>
          )}
        </div>
      </div>

      <div className="mt-1.5 flex w-full items-start gap-0.5">
        {celeb.slug ? (
          <Link
            href={`/celebs/${celeb.slug}`}
            prefetch={false}
            aria-label={name}
            className="min-w-0 flex-1 rounded px-0.5 text-center outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <p className="truncate text-xs font-semibold leading-tight text-text-primary hover:text-accent md:text-sm">{name}</p>
            {subtitle && (
              <p className={`mt-0.5 truncate text-[11px] leading-tight md:text-xs ${title ? 'text-accent' : 'text-text-tertiary'}`}>{subtitle}</p>
            )}
          </Link>
        ) : (
          <div className="min-w-0 flex-1 px-0.5 text-center">
            <p className="truncate text-xs font-semibold leading-tight text-red-400 md:text-sm">{name}</p>
            {subtitle && (
              <p className={`mt-0.5 truncate text-[11px] leading-tight md:text-xs ${title ? 'text-accent' : 'text-text-tertiary'}`}>{subtitle}</p>
            )}
          </div>
        )}
        <CopyNameButton name={name} />
      </div>
    </div>
  )
}

function CopyNameButton({ name }: { name: string }) {
  const { showToast } = useToast()
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(name)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch (error) {
      console.error('이름 복사 실패:', error)
      showToast('error', '이름을 복사하지 못했습니다.')
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      aria-label={`${name} 이름 복사`}
      title="이름 복사"
      className="shrink-0 rounded-md p-1 text-text-tertiary hover:bg-white/5 hover:text-accent"
    >
      {copied ? <Check className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  )
}
