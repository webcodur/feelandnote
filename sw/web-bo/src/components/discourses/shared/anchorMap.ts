/**
 * 한 발언 안에서 사진이 걸린 자리 ↔ 색 배정.
 *
 * 원고(줄 배경·표식)와 오른쪽 사진 카드가 이 한 벌을 함께 읽어 같은 색을 쓴다.
 * 색은 발언마다 처음부터 다시 돈다 — 구획이 발언 단위로 나뉘기 때문이다.
 *
 * 규칙(팩션 인물 대사와 동일):
 * - 발언 시작 사진이 있으면 첫 덩어리(0)가 첫 색을 갖는다
 * - 이후 사진이 걸린 자리마다 다음 색
 * - 자리는 잡아 뒀지만 사진을 아직 안 고른 자리는 색 없이 회색으로 표시한다
 */

import type { Turn } from '@/lib/discourse-types'
import { themeAt, type AnchorTheme } from '@feelandnote/shared/bo/media'

export type AnchorInfo = { hasImage: boolean; theme?: AnchorTheme }

export function turnAnchorMap(turn: Turn | undefined): Map<number, AnchorInfo> {
  const map = new Map<number, AnchorInfo>()
  if (!turn) return map

  let next = 0
  if (turn.image) map.set(0, { hasImage: true, theme: themeAt(next++) })

  const changes = [...(turn.imageChanges ?? [])].sort((a, b) => a.chunk - b.chunk)
  for (const c of changes) {
    if (c.image) map.set(c.chunk, { hasImage: true, theme: themeAt(next++) })
    else map.set(c.chunk, { hasImage: false })
  }
  return map
}
