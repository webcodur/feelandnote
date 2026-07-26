/**
 * 원고 편집 순수 로직 — 통짜 원고 텍스트 ↔ 발언(turns) 배열 변환·재분배.
 *
 * 원고 탭의 줄 규칙:
 * - 단일 개행 = 덩어리(chunk) 경계 — 사람이 엔터로 나눈다(자동 분할 없음, 프로젝트 관례).
 * - 빈 줄 = 발언(turn) 경계 — 담화에만 있는 확장(발언·화자 축).
 *
 * 파생 규칙: turn.chunks = 그 발언 구간의 줄들, turn.text = chunks.join(' ')
 * (팩션의 quoteChunks → quote 파생과 동일). 이중 입력은 없다 — text 는 항상 파생값이다.
 *
 * 재분배(remapTurns): 타이핑으로 문단이 늘고 줄어도 기존 발언의 속성(화자·사진·음성 메타·
 * origin·textEn/chunksEn)이 자기 문단을 따라간다. React 무관 — 순수 함수만 둔다.
 */

import type { Turn } from '@/lib/discourse-types'

/** 공백 정규화 — 연속 공백·개행을 단일 공백으로. 문단 ↔ 발언 대조는 전부 이 눈으로 본다 */
const norm = (s: string): string => s.replace(/\s+/g, ' ').trim()

/**
 * 발언 → 원고 줄들. chunks 가 있으면 그 배열, 없으면 text 를 줄 단위로.
 * text 내부의 빈 줄은 단일 개행으로 정규화한다(빈 줄은 발언 경계 전용이라 남기면 발언이 쪼개진다).
 */
export function turnLines(turn: Turn): string[] {
  const src = turn.chunks?.length ? turn.chunks : (turn.text ?? '').split('\n')
  return src.map(s => s.trim()).filter(Boolean)
}

/** 발언 배열 → 통짜 원고 텍스트. 발언 사이는 빈 줄 하나 */
export function scriptToText(turns: Turn[]): string {
  return turns.map(t => turnLines(t).join('\n')).join('\n\n')
}

/** 통짜 원고 → 문단(발언) 목록. 각 문단은 덩어리 줄들의 배열 */
export function textToParagraphs(text: string): string[][] {
  return text
    .split(/\n\s*\n/)
    .map(p => p.split('\n').map(s => s.trim()).filter(Boolean))
    .filter(p => p.length > 0)
}

/** 문단 줄들 → 발언 본문(파생값) */
const paraText = (lines: string[]): string => lines.join(' ')

/** 문단 줄들을 발언에 반영 — chunks·text 갱신, 범위를 벗어난 사진 교체 지점은 잘라낸다 */
function applyLines(turn: Turn, lines: string[]): Turn {
  const kept = (turn.imageChanges ?? []).filter(c => c.chunk < lines.length)
  return {
    ...turn,
    text: paraText(lines),
    chunks: lines,
    imageChanges: kept.length ? kept : undefined,
  }
}

/**
 * 통짜 원고 재분배 — 문단 목록을 기존 발언 배열에 되맞춘다.
 *
 * 매칭 규칙(순서대로):
 * 1. 정규화 완전 일치 + 순서 단조 증가(그리디) — 이 문단은 그 턴이다. 모든 속성 유지.
 * 2. 일치 앵커 사이 구간마다, 미일치 문단과 미일치 턴을 순서대로 짝지어 「그 턴의 텍스트 수정」으로 취급.
 * 3. 구제 — 남은 문단이 삭제 예정 턴과 정규화 일치하면 이동으로 살린다(문단 순서 이동 대응).
 * 4. 남은 문단 = 새 턴(직전 턴 화자 계승, 독백). 남은 턴 = dropped — 소멸(호출부가 undo·배너로 방어).
 *
 * stale = 내용이 실제로 바뀌었는데 음원 길이(duration)가 기록돼 있던 턴의 새 인덱스 — 음원 재생성 대상.
 */
export function remapTurns(oldTurns: Turn[], paragraphs: string[][]): {
  turns: Turn[]
  dropped: Turn[]
  stale: number[]
} {
  const oldNorms = oldTurns.map(t => norm(t.text ?? ''))
  const newNorms = paragraphs.map(p => norm(paraText(p)))
  /** 문단 → 기존 턴 인덱스 (-1 = 미배정) */
  const matchOld = new Array<number>(paragraphs.length).fill(-1)
  const usedOld = new Array<boolean>(oldTurns.length).fill(false)

  // 1) 정규화 완전 일치 — 순서 단조 증가
  let cursor = 0
  for (let ni = 0; ni < newNorms.length; ni++) {
    if (!newNorms[ni]) continue
    for (let oi = cursor; oi < oldNorms.length; oi++) {
      if (oldNorms[oi] === newNorms[ni]) {
        matchOld[ni] = oi
        usedOld[oi] = true
        cursor = oi + 1
        break
      }
    }
  }

  // 2) 앵커 사이 구간별 — 미일치 문단 ↔ 미일치 턴을 순서대로 짝짓기(텍스트 수정)
  const anchors: [number, number][] = [[-1, -1]]
  for (let ni = 0; ni < matchOld.length; ni++) {
    if (matchOld[ni] >= 0) anchors.push([ni, matchOld[ni]])
  }
  anchors.push([paragraphs.length, oldTurns.length])
  for (let a = 0; a < anchors.length - 1; a++) {
    const [nFrom, oFrom] = anchors[a]
    const [nTo, oTo] = anchors[a + 1]
    const freeNew: number[] = []
    for (let ni = nFrom + 1; ni < nTo; ni++) if (matchOld[ni] < 0) freeNew.push(ni)
    const freeOld: number[] = []
    for (let oi = oFrom + 1; oi < oTo; oi++) if (!usedOld[oi]) freeOld.push(oi)
    for (let k = 0; k < Math.min(freeNew.length, freeOld.length); k++) {
      matchOld[freeNew[k]] = freeOld[k]
      usedOld[freeOld[k]] = true
    }
  }

  // 3) 구제 — 남은 문단이 삭제 예정 턴과 정규화 일치하면 이동으로 살린다
  for (let ni = 0; ni < matchOld.length; ni++) {
    if (matchOld[ni] >= 0 || !newNorms[ni]) continue
    for (let oi = 0; oi < oldTurns.length; oi++) {
      if (!usedOld[oi] && oldNorms[oi] === newNorms[ni]) {
        matchOld[ni] = oi
        usedOld[oi] = true
        break
      }
    }
  }

  // 4) 결과 조립
  const turns: Turn[] = []
  const stale: number[] = []
  for (let ni = 0; ni < paragraphs.length; ni++) {
    const lines = paragraphs[ni]
    const oi = matchOld[ni]
    if (oi < 0) {
      // 새 문단 = 새 턴 — 직전 턴 화자 계승
      const prev = turns[turns.length - 1]
      turns.push({ cast: prev?.cast ?? 0, kind: 'monologue', text: paraText(lines), chunks: lines })
      continue
    }
    const old = oldTurns[oi]
    // 줄 나눔까지 그대로면 같은 객체 유지 — 손대지 않은 발언의 데이터를 바꾸지 않는다
    const oldLines = turnLines(old)
    if (oldLines.length === lines.length && oldLines.every((c, k) => c === lines[k])) {
      turns.push(old)
      continue
    }
    turns.push(applyLines(old, lines))
    if (oldNorms[oi] !== newNorms[ni] && old.duration != null) stale.push(turns.length - 1)
  }
  const dropped = oldTurns.filter((_, oi) => !usedOld[oi])
  return { turns, dropped, stale }
}
