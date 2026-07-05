// ── Types ──

import { engineSlot } from './engine'

export type VoiceFile = { name: string; sizeKB: number; duration: number; engine: string }
export type VoiceSummary = { total: number; totalSizeKB: number }

/** 파일명 → 한글 설명 */
export function describeFile(name: string): string {
  const base = name
    .replace(/^(gemini|elevenlabs)\//, '')
    .replace(/^shorts-(\d+)\//, '')
    .replace('.wav', '')
  const direct: Record<string, string> = {
    'A1-service-greeting': '서비스 인사',
    'A2-service-intro': '서비스 소개',
    'A3-featured-quote': '대표 명언',
    'B1-celeb-intro': '인물 소개',
    'B2-philosophy': '감상철학',
    'C1-label-summary': '라벨: 요약',
    'C2-label-context': '라벨: 맥락',
    'E1-outro': '아웃트로',
    'E2-interlude': '중간안내',
    'E3-return-intro': '복귀 인사',
    'E4-prev-recap': '전편 요약',
  }
  if (direct[base]) return direct[base]
  const partMatch = base.match(/^A1-service-greeting-(\d+)$/)
  if (partMatch) return `인사 파트${partMatch[1]}`
  const bookMatch = base.match(/^D(\d{2})([a-c])(\d*)-/)
  if (bookMatch) {
    const n = parseInt(bookMatch[1])
    const phase: Record<string, string> = { a: '제목', b: '요약', c: '맥락' }
    const part = bookMatch[3] ? ` ${bookMatch[3]}` : ''  // b2 = 토막 2
    return `책${n} ${phase[bookMatch[2]] ?? ''}${part}`
  }
  const pairMatch = base.match(/^D(\d{2})d(\d+)(?:_(\d+))?-(quote|after)$/)
  if (pairMatch) {
    const n = parseInt(pairMatch[1])
    const dn = parseInt(pairMatch[2])
    const pi = Math.floor((dn - 1) / 2)
    const part = pairMatch[3] ? ` ${pairMatch[3]}` : ''  // _2 = 토막 2
    const label = pairMatch[4] === 'quote' ? '인용' : '후속'
    return `책${n} ${label}${pi > 0 ? ` ${pi + 1}` : ''}${part}`
  }
  const shortMatch = base.match(/^S\d{2}-(.+)$/)
  if (shortMatch) return `쇼츠: ${shortMatch[1]}`
  return ''
}

/** 파일명에서 섹션 키 추출 (엔진 접두사 제거) */
export function sectionKey(name: string): string {
  return name.replace(/^(gemini|elevenlabs|common-en|common)\//, '').replace('.wav', '')
}

export type VoiceSection = {
  key: string
  description: string
  gemini?: VoiceFile
  elevenlabs?: VoiceFile
  common?: VoiceFile
}

/** 에피소드 JSON에서 필요한 전체 섹션 키 목록 생성 */
type ExpectedShortsCfg = { segments: Array<{ id: string; role: string; visual?: string }> }
export function expectedSections(ep: { narrator?: Record<string, unknown>; host?: Record<string, unknown>; books?: Array<Record<string, unknown>>; shorts?: ExpectedShortsCfg | ExpectedShortsCfg[] }): { key: string; description: string }[] {
  const result: { key: string; description: string }[] = []
  const add = (key: string) => result.push({ key, description: describeFile(key + '.wav') })

  // 쇼츠 전용 에피소드 등은 narrator/host/books 가 비어 있을 수 있다. 모두 옵셔널 접근.
  const narrator = ep.narrator ?? {}
  const host = ep.host ?? {}
  const books = ep.books ?? []

  if (narrator.serviceGreeting || (narrator.serviceGreetingDuration as number) > 0) add('A1-service-greeting')
  if (narrator.serviceIntro || (narrator.serviceIntroDuration as number) > 0) add('A2-service-intro')
  if (host.featuredQuote || (host.featuredQuoteDuration as number) > 0) add('A3-featured-quote')
  if (narrator.celebIntro || (narrator.celebIntroDuration as number) > 0) add('B1-celeb-intro')
  if (host.philosophy || (host.voiceDuration as number) > 0) add('B2-philosophy')
  if ((narrator.labelSummaryDuration as number) > 0) add('C1-label-summary')
  if ((narrator.labelContextDuration as number) > 0) add('C2-label-context')

  // 토막 분할 필드의 토막 수 — scenario/utils bookFieldParts와 동일 규약 (의존 순환 방지로 로컬 계산)
  const partCount = (full: unknown, parts: unknown): number => {
    const arr = Array.isArray(parts) ? (parts as unknown[]).filter(p => typeof p === 'string' && (p as string).trim()) : []
    return Math.max(1, arr.length)
  }

  for (let i = 0; i < books.length; i++) {
    const b = books[i]
    const bn = String(i + 1).padStart(2, '0')
    add(`D${bn}a-title`)
    for (let p = 0; p < partCount(b.summary, b.summaryParts); p++) {
      add(p === 0 ? `D${bn}b-summary` : `D${bn}b${p + 1}-summary`)
    }
    for (let p = 0; p < partCount(b.contextMain, b.contextMainParts); p++) {
      add(p === 0 ? `D${bn}c-context` : `D${bn}c${p + 1}-context`)
    }
    // quotePairs: 동적 인용+후속맥락 (후속맥락은 afterParts 토막 수만큼 _p 부착)
    for (let pi = 0; pi < ((b.quotePairs as any[])?.length ?? 0); pi++) {
      const pair = (b.quotePairs as any[])[pi]
      if (pair.quote) add(`D${bn}d${pi * 2 + 1}-quote`)
      if (pair.after) {
        for (let ap = 0; ap < partCount(pair.after, pair.afterParts); ap++) {
          add(ap === 0 ? `D${bn}d${pi * 2 + 2}-after` : `D${bn}d${pi * 2 + 2}_${ap + 1}-after`)
        }
      }
    }
  }

  if ((narrator.outroDuration as number) > 0 || narrator.outro) add('E1-outro')
  if ((narrator.interludeDuration as number) > 0) add('E2-interlude')
  if ((narrator.returnIntroDuration as number) > 0 || narrator.returnIntro) add('E3-return-intro')
  if ((narrator.prevRecapDuration as number) > 0 || narrator.prevRecap) add('E4-prev-recap')

  // 옵션 2: shorts는 1-based 접두사 필수. 모든 쇼츠에 shorts-{N}/S{NN}-{id}
  const shortsArr: ExpectedShortsCfg[] = Array.isArray(ep.shorts)
    ? ep.shorts
    : (ep.shorts ? [ep.shorts] : [])
  shortsArr.forEach((cfg, sIdx) => {
    const slot = (cfg as { slot?: number }).slot ?? (sIdx + 1)  // 고정 slot (없으면 폴더순 안전망)
    const prefix = `shorts-${slot}/`
    for (let si = 0; si < cfg.segments.length; si++) {
      const seg = cfg.segments[si]
      const idx = String(si + 1).padStart(2, '0')
      add(`${prefix}S${idx}-${seg.id}`)
    }
  })

  return result
}

/** 파일 목록을 섹션 단위로 그룹핑 (에피소드 기대 섹션 포함) */
export function groupBySection(files: VoiceFile[], ep?: { narrator: Record<string, unknown>; host: Record<string, unknown>; books: Array<Record<string, unknown>>; shorts?: ExpectedShortsCfg | ExpectedShortsCfg[] }): VoiceSection[] {
  const map = new Map<string, VoiceSection>()

  // 에피소드에서 기대되는 전체 섹션을 먼저 등록
  if (ep) {
    for (const s of expectedSections(ep)) {
      map.set(s.key, { key: s.key, description: s.description })
    }
  }

  // 실제 파일 매핑
  for (const f of files) {
    const k = sectionKey(f.name)
    if (!map.has(k)) map.set(k, { key: k, description: describeFile(f.name) })
    const sec = map.get(k)!
    const slot = engineSlot(f.name)
    sec[slot] = f
  }
  return [...map.values()].sort((a, b) => a.key.localeCompare(b.key))
}
