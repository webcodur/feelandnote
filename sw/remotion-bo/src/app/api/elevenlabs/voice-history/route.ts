import { NextResponse } from 'next/server'
import { collectFactionVoiceHistory } from '@/lib/faction-voice-casting-history'

export async function GET() {
  try {
    return NextResponse.json(await collectFactionVoiceHistory())
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
