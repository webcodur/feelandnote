import type { ImageField } from '../types'
import type { SoloFreeSection, SoloImageChange } from './types'

// 솔로는 책 단위 그룹·field 분류가 없어 이미지 풀 그룹핑 맵을 비운다 (참조 안정성 위해 모듈 상수).
export const EMPTY_FILE_BOOK_MAP = new Map<string, number>()
export const EMPTY_FILE_FIELD_MAP = new Map<string, ImageField>()

/** 기존 id와 겹치지 않는 다음 섹션 id (`s{n}`). 삭제 후 재추가해도 충돌 없게 max+1. */
export function nextId(sections: SoloFreeSection[]): string {
  let max = 0
  for (const s of sections) {
    const m = /^s(\d+)$/.exec(s.id)
    if (m) max = Math.max(max, parseInt(m[1], 10))
  }
  return `s${max + 1}`
}

/** imageChangeAt 한 칸 정규화 — image 문자열만 필수, 나머지는 있으면 보존. */
function normalizeImageChange(raw: unknown): SoloImageChange | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  if (typeof o.image !== 'string') return null
  const out: SoloImageChange = { image: o.image }
  if (typeof o.text === 'string') out.text = o.text
  if (typeof o.t === 'number' && Number.isFinite(o.t)) out.t = o.t
  return out
}

/**
 * 외부 JSON → SoloFreeSection[] 정규화.
 * 허용 형식:
 *   1) { "sections": [ ... ] }  — solo.*.json 파일 그대로
 *   2) [ { id?, text, ... }, ... ]  — 섹션 배열
 *   3) [ "본문1", "본문2", ... ]  — 문자열 배열 → narration 섹션으로 변환
 * id 가 없거나 비면 s1, s2… 자동 부여. 중복 id 는 뒤쪽을 재발급.
 */
export function parseSoloSectionsJson(
  raw: string,
): { ok: true; sections: SoloFreeSection[] } | { ok: false; error: string } {
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch (e: unknown) {
    return { ok: false, error: 'JSON 파싱 오류: ' + (e instanceof Error ? e.message : String(e)) }
  }

  let list: unknown[]
  if (Array.isArray(parsed)) {
    list = parsed
  } else if (parsed && typeof parsed === 'object' && Array.isArray((parsed as { sections?: unknown }).sections)) {
    list = (parsed as { sections: unknown[] }).sections
  } else {
    return { ok: false, error: '{ "sections": [...] } 또는 배열 형식이어야 합니다' }
  }

  if (list.length === 0) {
    return { ok: true, sections: [] }
  }

  const used = new Set<string>()
  const sections: SoloFreeSection[] = []

  for (let i = 0; i < list.length; i++) {
    const item = list[i]

    // 문자열 한 줄 → 서술 섹션
    if (typeof item === 'string') {
      let id = `s${i + 1}`
      while (used.has(id)) id = nextId(sections)
      used.add(id)
      sections.push({ id, text: item, voice: 'tts', kind: 'narration' })
      continue
    }

    if (!item || typeof item !== 'object') {
      return { ok: false, error: `${i + 1}번째 항목이 객체/문자열이 아닙니다` }
    }
    const o = item as Record<string, unknown>
    if (typeof o.text !== 'string') {
      return { ok: false, error: `${i + 1}번째 항목에 text(문자열)가 필요합니다` }
    }

    let id = typeof o.id === 'string' && o.id.trim() ? o.id.trim() : `s${i + 1}`
    if (used.has(id)) {
      // 중복 id — 기존 번호 체계를 유지하며 재발급
      id = nextId(sections)
    }
    used.add(id)

    const sec: SoloFreeSection = { id, text: o.text }
    if (o.voice === 'tts' || o.voice === 'actor') sec.voice = o.voice
    else sec.voice = 'tts'
    if (o.kind === 'quote' || o.kind === 'narration') sec.kind = o.kind
    else sec.kind = 'narration'
    if (typeof o.quoteSource === 'string') sec.quoteSource = o.quoteSource
    if (typeof o.image === 'string' && o.image) sec.image = o.image
    if (typeof o.geminiVoice === 'string' && o.geminiVoice) sec.geminiVoice = o.geminiVoice
    if (Array.isArray(o.imageChangeAt)) {
      const changes = o.imageChangeAt
        .map(normalizeImageChange)
        .filter((c): c is SoloImageChange => c !== null)
      if (changes.length) sec.imageChangeAt = changes
    }
    sections.push(sec)
  }

  return { ok: true, sections }
}
