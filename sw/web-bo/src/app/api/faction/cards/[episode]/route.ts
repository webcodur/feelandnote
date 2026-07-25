/**
 * 세력도 카드뉴스 대본 API — 에피소드별 person-cards/<인물이름>.json 읽기/저장.
 * 카드 전용 필드(스토리·나레이션·카드 문구)는 영상 데이터(faction-data.json)와 분리해 여기 담는다.
 */
import { NextResponse } from 'next/server'
import { guardFactionRoute } from '@/lib/faction-route'
import { loadFactionCards, saveFactionCardPerson, saveFactionCardGroup, saveFactionCards } from '@/lib/faction-file-utils'
import type { FactionCardFields, FactionGroupCardFields, FactionCardsFile } from '@/lib/faction-types'

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

export async function GET(_req: Request, { params }: { params: Promise<{ episode: string }> }) {
  const denied = await guardFactionRoute()
  if (denied) return denied

  const { episode: rawName } = await params
  // 라우트 파라미터는 URL 인코딩된 채 온다 — 한글 에피소드명 디코드
  const name = decodeURIComponent(rawName)
  return NextResponse.json(await loadFactionCards(name))
}

export async function PUT(req: Request, { params }: { params: Promise<{ episode: string }> }) {
  const denied = await guardFactionRoute()
  if (denied) return denied

  const { episode: rawName } = await params
  const name = decodeURIComponent(rawName)
  try {
    const body = (await req.json()) as FactionCardsFile
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error('잘못된 본문')
    await saveFactionCards(name, { people: body.people ?? {} })
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 400 })
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ episode: string }> }) {
  const denied = await guardFactionRoute()
  if (denied) return denied

  const { episode: rawName } = await params
  const name = decodeURIComponent(rawName)
  try {
    const body = (await req.json()) as { personName?: unknown; groupName?: unknown; card?: unknown }
    if (!isPlainObject(body)) throw new Error('잘못된 요청 본문')
    const card = body.card ?? {}
    if (!isPlainObject(card)) throw new Error('카드 대본 형식이 잘못되었습니다')

    if (body.groupName) {
      if (typeof body.groupName !== 'string' || !body.groupName.trim()) throw new Error('그룹 이름이 없습니다')
      await saveFactionCardGroup(name, body.groupName, card as Partial<FactionGroupCardFields>)
    } else {
      if (typeof body.personName !== 'string' || !body.personName.trim()) throw new Error('인물 이름이 없습니다')
      await saveFactionCardPerson(name, body.personName, card as Partial<FactionCardFields>)
    }
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 400 })
  }
}
