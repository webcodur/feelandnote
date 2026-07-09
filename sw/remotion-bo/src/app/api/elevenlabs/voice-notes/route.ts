import { existsSync } from 'fs'
import { mkdir, readFile, writeFile } from 'fs/promises'
import path from 'path'
import { NextResponse } from 'next/server'
import {
  EMPTY_ELE_VOICE_NOTES,
  cleanEleVoiceNote,
  type EleVoiceNote,
  type EleVoiceNotesFile,
} from '@/lib/ele-voice-notes'

const REMOTION_ROOT = path.join(process.cwd(), '..', 'remotion')
const NOTES_DIR = path.join(REMOTION_ROOT, 'public', 'factions', '_voice-casting')
const NOTES_PATH = path.join(NOTES_DIR, 'ele-voice-notes.json')

async function readNotes(): Promise<EleVoiceNotesFile> {
  if (!existsSync(NOTES_PATH)) return EMPTY_ELE_VOICE_NOTES
  try {
    const raw = JSON.parse(await readFile(NOTES_PATH, 'utf-8')) as Partial<EleVoiceNotesFile>
    return {
      version: 1,
      voices: raw.voices && typeof raw.voices === 'object' ? raw.voices as Record<string, EleVoiceNote> : {},
    }
  } catch {
    return EMPTY_ELE_VOICE_NOTES
  }
}

async function writeNotes(data: EleVoiceNotesFile) {
  await mkdir(NOTES_DIR, { recursive: true })
  await writeFile(NOTES_PATH, JSON.stringify(data, null, 2) + '\n', 'utf-8')
}

export async function GET() {
  return NextResponse.json(await readNotes())
}

export async function PUT(req: Request) {
  const body = await req.json() as Omit<Partial<EleVoiceNote>, 'status'> & { voiceId?: string; status?: EleVoiceNote['status'] | null }
  if (!body.voiceId || typeof body.voiceId !== 'string') {
    return NextResponse.json({ error: 'voiceId required' }, { status: 400 })
  }

  const notes = await readNotes()
  const previous = notes.voices[body.voiceId]
  const cleaned = cleanEleVoiceNote({
    ...previous,
    ...body,
    voiceId: body.voiceId,
    updatedAt: new Date().toISOString(),
  })

  const next: EleVoiceNotesFile = {
    version: 1,
    voices: { ...notes.voices },
  }

  if (cleaned) next.voices[cleaned.voiceId] = cleaned
  else delete next.voices[body.voiceId]

  await writeNotes(next)
  return NextResponse.json({ ok: true, note: cleaned, notes: next })
}
