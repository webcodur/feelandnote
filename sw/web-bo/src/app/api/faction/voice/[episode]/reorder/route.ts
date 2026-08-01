import { NextResponse } from 'next/server'
import { guardFactionRoute } from '@/lib/faction-route'
import { reorderFactionVoiceFiles, sanitizeRenames } from '@/lib/faction-voice-reorder'
import { paramToFolder } from '@/lib/faction-edit-route'

// ── 세력도감 인물 음원 재배치(자리 맞바꾸기) 창구
//
// 음원 파일명이 "인물 자리"(F{세력}C{묶음}P{인물}-quote.wav) 기반이라, 편집기에서 인물 순서를
// 바꾸면 음원과 발화 시각 산출물을 함께 옮겨야 한다. 그 절차는 `lib/faction-voice-reorder` 에 있다 —
// 창구 안에 두면 Next 밖에서 부를 수 없어 검증이 불가능하다.
//
// 요청 body:
//   { renames: Array<{ from: string, to: string }> }
//     - from/to 는 파일명(예 'F01C01P01-quote.wav'). 폴더 경로 없이 파일명 전체.
//     - 파일이 없으면 그 항목은 조용히 건너뛴다(음원 미생성 인물 — 에러 아님).
//     - 경로 이탈(`..`·절대경로·구분자)이 들어오면 그 항목만 걸러낸다.

export async function POST(req: Request, { params }: { params: Promise<{ episode: string }> }) {
  const denied = await guardFactionRoute()
  if (denied) return denied

  const { episode } = await params

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid JSON' }, { status: 400 })
  }

  const renames = sanitizeRenames((body as { renames?: unknown } | null)?.renames)
  if (renames.length === 0) {
    return NextResponse.json({ error: '유효한 renames 가 필요하다' }, { status: 400 })
  }

  const result = await reorderFactionVoiceFiles(paramToFolder(episode), renames)
  return NextResponse.json(result)
}
