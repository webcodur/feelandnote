import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { getCelebVoiceDetail } from '@/actions/admin/voice-gen'
import VoiceGenWorkspace from '../VoiceGenWorkspace'

export const metadata: Metadata = {
  title: '대사/음성 워크스페이스',
}

interface PageProps {
  params: Promise<{ slug: string }>
}

export default async function VoiceGenSlugPage({ params }: PageProps) {
  const { slug } = await params
  const celeb = await getCelebVoiceDetail(slug)

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/celebs"
          className="p-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-bg-secondary"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-text-primary">대사/음성 워크스페이스</h1>
          <p className="text-sm text-text-secondary mt-1">
            Gemini · ElevenLabs TTS{celeb ? ` · ${celeb.nickname ?? slug}` : ''}
          </p>
        </div>
      </div>

      <VoiceGenWorkspace initialCeleb={celeb} />
    </div>
  )
}
