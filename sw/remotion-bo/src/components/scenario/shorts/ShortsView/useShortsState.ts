'use client'

import type { EpisodeData } from '../../../EpisodeEditor'
import type { Speaker } from '../../SpeakerPanel'
import { buildHostSpeaker } from '../../speakerHelpers'
import { setField } from '../../utils'
import { remapChangeAnchors } from '../../anchorSync'

/**
 * 쇼츠 1개 상태 + 세그먼트 CRUD 한 곳 모음.
 *
 * - shorts 배열 정규화·writeShorts(전체 교체) 캡슐화.
 * - 세그먼트 텍스트/필드 갱신, 삽입(인용·맥락), 삭제, 단일 저장.
 * - undefined·false 값은 JSON 깔끔하게 유지하기 위해 필드 자체를 제거한다(false 의미가 있는 zoomIn은 별도 헬퍼로 보존).
 *
 * 파라미터로 series·name을 받아 saveSegment 같은 fetch 콜에서 사용.
 */
export function useShortsState(
  episode: EpisodeData,
  shortsIndex: number,
  onUpdate: (ep: EpisodeData) => void,
  series: string,
  name: string,
) {
  const shortsArr: any[] = Array.isArray(episode.shorts) ? episode.shorts : (episode.shorts ? [episode.shorts] : [])
  const currentShorts = shortsArr[shortsIndex - 1]
  const segments: any[] = currentShorts?.segments ?? []

  // 화자 풀: host 가상 화자(맨 앞 고정) + episode.speakers(통합 SSoT) + 옛 shorts[i].speakers(읽기 호환 폴백, id 충돌은 episode 측 우선)
  // host는 별도 행(HostSpeakerRow)에서 편집되지만, 세그먼트 화자 지정 드롭다운에서도 명시 선택 가능하도록 가상 Speaker로 합성한다.
  // 옛 데이터에 'host' id를 가진 추가 화자가 들어 있어도 가상 host가 우선이라 의도 명확.
  const episodeSpeakers: Speaker[] = Array.isArray(episode.speakers) ? episode.speakers : []
  const legacyShortSpeakers: Speaker[] = Array.isArray((currentShorts as { speakers?: Speaker[] })?.speakers)
    ? (currentShorts as { speakers: Speaker[] }).speakers
    : []
  const hostSpeaker = buildHostSpeaker(episode)
  const used = new Set<string>(['host'])
  const speakers: Speaker[] = [
    hostSpeaker,
    ...episodeSpeakers.filter(s => !used.has(s.id) && (used.add(s.id), true)),
    ...legacyShortSpeakers.filter(s => !used.has(s.id) && (used.add(s.id), true)),
  ]

  const writeShorts = (next: any) => {
    const arr = [...shortsArr]
    arr[shortsIndex - 1] = next
    onUpdate({ ...episode, shorts: arr } as any)
  }

  // prev: 커밋 직전 본문. 본문이 바뀌면 이 구간의 이미지 전환점(imageChangeAt) 앵커를 옛→새 본문 위치로 이전한다.
  const updateSeg = (i: number, text: string, prev?: string) => {
    const cur = segments[i] ?? {}
    const newSeg: any = { ...cur, text }
    const oldText = prev ?? cur.text ?? ''
    if (oldText !== text && Array.isArray(cur.imageChangeAt) && cur.imageChangeAt.length) {
      const remapped = remapChangeAnchors(oldText, text, cur.imageChangeAt as any[], msg => console.info(`[쇼츠 #${i + 1}] ${msg}`))
      if (remapped.length) newSeg.imageChangeAt = remapped
      else delete newSeg.imageChangeAt
    }
    const newSegs = [...segments]; newSegs[i] = newSeg
    writeShorts({ ...currentShorts, segments: newSegs })
  }

  /** undefined·false 시 필드 제거 (JSON 깔끔). speaker/style/topRight 등 기본값 의미가 있는 필드용. */
  const updateSegField = (i: number, field: string, value: any) => {
    const newSegs = [...segments]
    newSegs[i] = setField(newSegs[i] ?? {}, field, value, { dropFalse: true })
    writeShorts({ ...currentShorts, segments: newSegs })
  }

  /** undefined만 제거하고 false는 보존 — zoomIn=false 같은 강제 OFF 의미를 살린다. */
  const updateSegFieldKeepFalse = (i: number, field: string, value: any) => {
    const newSegs = [...segments]
    newSegs[i] = setField(newSegs[i] ?? {}, field, value)
    writeShorts({ ...currentShorts, segments: newSegs })
  }

  // confirm 통과 시에만 삭제하고 true 반환 — 호출부가 wav 정리·뒤 구간 rename 여부를 판단한다.
  const removeSegment = (i: number): boolean => {
    const seg = segments[i]
    if (!confirm(`#${i + 1} ${seg?.id ?? ''} 구간 삭제?`)) return false
    writeShorts({ ...currentShorts, segments: segments.filter((_, j) => j !== i) })
    return true
  }

  // 디스크의 최신 상태를 읽어 해당 id만 교체. 다른 탭이 수정한 다른 구간·필드는 보존된다.
  const saveSegment = async (i: number) => {
    const seg = segments[i]
    if (!seg?.id) throw new Error('구간 id가 없어 저장할 수 없습니다')
    const res = await fetch(`/api/${series}/episodes/${name}/segment`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ shortsIndex, segmentId: seg.id, segment: seg }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.error ?? res.statusText)
    }
  }

  // 신규 구간를 atIdx 위치에 삽입. atIdx === segments.length 면 끝에 append.
  // visual은 삽입 위치 주변 맥락(인트로 vs 책)을 보고 결정.
  const insertSegmentAt = (atIdx: number, kind: 'quote' | 'context') => {
    const firstBookIdx = segments.findIndex((s: any) => s?.visual === 'book')
    // 끝에 추가([인용/맥락 추가])는 본문이므로 항상 book. 중간 삽입만 위치로 인트로 여부를 판정한다.
    // (book 세그먼트가 아직 없다고 끝 추가까지 intro 로 보면 본문이 인트로로 잘못 분류된다)
    const atEnd = atIdx >= segments.length
    const inIntro = !atEnd && (firstBookIdx < 0 ? true : atIdx <= firstBookIdx)

    let newSeg: any
    if (kind === 'quote') {
      // id는 'celeb-' 접두사 필수 (ElevenLabs 라우팅 판별용). 기존 id와 충돌 방지.
      const celebCount = segments.filter((s: any) => s?.role === 'celeb').length
      const id = celebCount === 0 ? 'celeb-mid' : `celeb-${celebCount + 1}`
      // 셀럽 발화 기본형: 하단 골드 라인 + Typewriter 하이라이트 자막 모드.
      newSeg = {
        id, role: 'celeb', text: '', visual: inIntro ? 'intro' : 'book',
        subtitle: true, textOverlay: 'bottom', topRight: 'none',
      }
    } else {
      const ctxSegs = segments.filter((s: any) => typeof s?.id === 'string' && (s.id === 'book-context' || s.id.startsWith('book-context-')))
      let id: string
      if (ctxSegs.length === 0) {
        id = 'book-context'
      } else {
        const nums = ctxSegs.map((s: any) => {
          const m = s.id.match(/-(\d+)$/)
          return m ? parseInt(m[1], 10) : 1
        })
        id = `book-context-${Math.max(...nums) + 1}`
      }
      newSeg = { id, role: 'narrator', text: '', visual: inIntro ? 'intro' : 'book' }
    }

    const next = [...segments]
    next.splice(atIdx, 0, newSeg)
    writeShorts({ ...currentShorts, segments: next })
  }

  const setRevealBg = (fileName: string, assignedFiles: Set<string>) => {
    if (assignedFiles.has(fileName)) return
    writeShorts({ ...currentShorts, revealBg: fileName })
  }
  const removeRevealBg = () => {
    const { revealBg: _, ...rest } = currentShorts ?? {}
    writeShorts({ ...rest, segments })
  }

  /** 마지막 로고(엔드 카드) 길이 설정. undefined 또는 비유한 값이면 자동(BGM 유무 폴백)으로 되돌리기 위해 필드 제거. */
  const setLogoDurationSec = (next: number | undefined) => {
    if (next === undefined || !Number.isFinite(next)) {
      const { logoDurationSec: _, ...rest } = (currentShorts ?? {}) as { logoDurationSec?: number } & Record<string, unknown>
      writeShorts({ ...rest, segments })
      return
    }
    writeShorts({ ...currentShorts, logoDurationSec: next })
  }

  const moveSegment = (fromIdx: number, toIdx: number) => {
    if (fromIdx === toIdx) return
    const next = [...segments]
    const [moved] = next.splice(fromIdx, 1)
    next.splice(toIdx, 0, moved)
    writeShorts({ ...currentShorts, segments: next })
  }

  return {
    currentShorts, segments, speakers,
    writeShorts,
    updateSeg, updateSegField, updateSegFieldKeepFalse,
    removeSegment, saveSegment, insertSegmentAt, moveSegment,
    setRevealBg, removeRevealBg,
    setLogoDurationSec,
  }
}
