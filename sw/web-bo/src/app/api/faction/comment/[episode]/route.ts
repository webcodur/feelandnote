import { NextResponse } from 'next/server'
import { guardFactionRoute } from '@/lib/faction-route'
import { readFactionComment, writeFactionComment } from '@/lib/faction-file-utils'
import { paramToFolder } from '@/lib/faction-edit-route'

// ── 세력도 편별 댓글(해설 텍스트) 읽기/쓰기 ──
//
// 영상 데이터(faction-data.json)와 별개인 사람용 해설 글이다.
// 파일: public/factions/{ep}/comment.p<part>.txt (편별 1개. part 0 = 편 구분 없는 통합편).
//   GET  ?part=0            → { comment }  (없으면 빈 문자열)
//   POST { part, text }     → 저장(빈 내용이면 파일 삭제)

export async function GET(req: Request, { params }: { params: Promise<{ episode: string }> }) {
  const denied = await guardFactionRoute()
  if (denied) return denied

  const { episode } = await params
  const part = Number(new URL(req.url).searchParams.get('part') || 0)
  if (!Number.isInteger(part) || part < 0) {
    return NextResponse.json({ ok: false, error: 'part required (>=0)' }, { status: 400 })
  }
  const comment = await readFactionComment(paramToFolder(episode), part)
  return NextResponse.json({ ok: true, comment })
}

export async function POST(req: Request, { params }: { params: Promise<{ episode: string }> }) {
  const denied = await guardFactionRoute()
  if (denied) return denied

  const { episode } = await params
  const { part, text } = await req.json().catch(() => ({}))
  if (!Number.isInteger(part) || part < 0) {
    return NextResponse.json({ ok: false, error: 'part required (>=0)' }, { status: 400 })
  }
  await writeFactionComment(paramToFolder(episode), part, String(text ?? ''))
  return NextResponse.json({ ok: true })
}
