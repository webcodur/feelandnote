import type { Metadata } from 'next'
import { getMemberBySlug } from '@/actions/admin/members'
import { getCelebDialogues } from '@/actions/admin/dialogues'
import { notFound } from 'next/navigation'
import { ArrowLeft, CheckCircle, Ban, Clock, Copy } from 'lucide-react'
import Link from 'next/link'
import CelebForm from '../../members/components/CelebForm'
import ExtraSections from './ExtraSections'
import { LangModeProvider } from '@/contexts/LangModeContext'
import CopyButton from './CopyButton'
import CelebSearchBar from '@/components/celeb/CelebSearchBar'

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const celeb = await getMemberBySlug(slug)
  return {
    title: celeb ? `${celeb.nickname} 상세` : '셀럽 상세',
  }
}

interface PageProps {
  params: Promise<{ slug: string }>
}

export default async function CelebDetailPage({ params }: PageProps) {
  const { slug } = await params
  const celeb = await getMemberBySlug(slug)

  if (!celeb || celeb.profile_type !== 'CELEB') notFound()

  const dialogueLines = await getCelebDialogues(celeb.id)

  return (
    <div className="space-y-4">
      {/* Search */}
      <CelebSearchBar className="max-w-xl" />

      {/* Navigation */}
      <div className="flex items-center gap-4">
        <Link href="/celebs" className="p-2 hover:bg-bg-secondary rounded-lg">
          <ArrowLeft className="w-5 h-5 text-text-secondary" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-text-primary">{celeb.nickname || '이름 없음'}</h1>
          <div className="flex items-center gap-2 mt-1">
            <StatusBadge status={celeb.status} />
            {celeb.celeb_tier === 'light' && (
              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-orange-500/10 text-orange-400">light</span>
            )}
            <span className="text-xs text-text-tertiary">
              {celeb.claimed_by ? '인수됨' : '미인수'}
            </span>
            <span className="text-xs text-text-tertiary">
              {new Date(celeb.created_at).toLocaleDateString('ko-KR')}
            </span>
            <Link href={`/celebs/${slug}/contents`} className="text-sm text-accent hover:underline">
              콘텐츠 관리 →
            </Link>
          </div>
          <div className="flex items-center gap-1.5 mt-1">
            <span className="text-[10px] font-mono text-text-tertiary select-all">{celeb.id}</span>
            <CopyButton text={celeb.id} />
          </div>
        </div>
      </div>

      <LangModeProvider>
        {/* CelebForm 내부: 기본정보 / 영향력 / 감상철학 / 태그 아코디언 */}
        <CelebForm mode="edit" celeb={celeb} />

        {/* 페르소나 / 고유대사 / 계정정보 — 동일 카드형 아코디언 */}
        <ExtraSections
          celebId={celeb.id}
          personaRaw={celeb.persona || null}
          dialogueLines={dialogueLines}
          speechTone={celeb.speech_tone}
          hasVoice={celeb.has_voice ?? false}
        />
      </LangModeProvider>

      {/* 플로팅 버튼 영역 확보 */}
      <div className="h-20" />
    </div>
  )
}


// #region Helper Components
function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; className: string; icon: React.ElementType }> = {
    active: { label: '활성', className: 'bg-green-500/10 text-green-400', icon: CheckCircle },
    inactive: { label: '미검수', className: 'bg-yellow-500/10 text-yellow-400', icon: Clock },
    suspended: { label: '정지', className: 'bg-red-500/10 text-red-400', icon: Ban },
    deleted: { label: '삭제됨', className: 'bg-gray-500/10 text-gray-400', icon: Ban },
  }
  const { label, className, icon: Icon } = config[status] || config.active
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${className}`}>
      <Icon className="w-3 h-3" />{label}
    </span>
  )
}
// #endregion
