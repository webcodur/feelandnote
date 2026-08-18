import type { Metadata } from 'next'
import { getMemberBySlug } from '@/actions/admin/members'
import { getCelebVoiceDetail } from '@/actions/admin/voice-gen'
import { notFound } from 'next/navigation'
import CelebForm from '../../members/components/CelebForm'
import ExtraSections, { DeepProfileAccordion } from './ExtraSections'
import { LangModeProvider } from '@/contexts/LangModeContext'
import CelebSearchBar from '@/components/celeb/CelebSearchBar'
import CelebExplanationSection from './CelebExplanationSection'
import { getCelebExplanation } from '@/lib/admin/celeb-explanations'

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

  if (!celeb || celeb.subject_kind !== 'celeb') notFound()

  const [voiceCeleb, explanation] = await Promise.all([
    getCelebVoiceDetail(celeb.id),
    getCelebExplanation(celeb.id),
  ])

  return (
    <div className="space-y-4">
      <CelebSearchBar className="max-w-xl" />

      <LangModeProvider>
        <CelebForm
          mode="edit"
          celeb={celeb}
          lead={
            <CelebExplanationSection
              key={`explanation-${celeb.id}`}
              celebId={celeb.id}
              slug={celeb.slug}
              explanation={explanation}
            />
          }
        >
          <ExtraSections
            key={`extra-${celeb.id}`}
            celebId={celeb.id}
            spectrumRaw={celeb.spectrum || null}
            voiceCeleb={voiceCeleb}
          />
        </CelebForm>

        <DeepProfileAccordion celebId={celeb.id} slug={celeb.slug || slug} />
      </LangModeProvider>

      <div className="h-20" />
    </div>
  )
}
