import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import VoiceGenWorkspace from './VoiceGenWorkspace'

export const metadata: Metadata = {
  title: '대사/음성 워크스페이스',
}

export default function VoiceGenPage() {
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
          <p className="text-sm text-text-secondary mt-1">Gemini · ElevenLabs TTS</p>
        </div>
      </div>

      <VoiceGenWorkspace />
    </div>
  )
}
