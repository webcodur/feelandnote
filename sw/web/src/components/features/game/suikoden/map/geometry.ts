/*
  천도 v2 — 지도 계산 조각: 영토 세력권(보로노이 칸 ∩ 반경 원)과 이름표 자리 잡기.
  모두 확대 전 좌표(지도 그룹 좌표)로 계산한다.
*/

export type Pt = [number, number]

/** 선분 pq와 직선 ab의 교점 */
function intersect(p: Pt, q: Pt, a: Pt, b: Pt): Pt {
  const s1x = q[0] - p[0]
  const s1y = q[1] - p[1]
  const s2x = b[0] - a[0]
  const s2y = b[1] - a[1]
  const den = s1x * s2y - s1y * s2x
  if (Math.abs(den) < 1e-9) return q
  const t = ((a[0] - p[0]) * s2y - (a[1] - p[1]) * s2x) / den
  return [p[0] + t * s1x, p[1] + t * s1y]
}

/**
 * 볼록한 칸(clip)으로 다각형(subject)을 자른다 — 서덜랜드-호지먼.
 * 칸 안쪽 판정은 칸 안에 있는 점(site)과 같은 편인지로 한다(칸 꼭짓점 방향과 무관).
 */
export function clipToConvex(subject: Pt[], clip: Pt[], site: Pt): Pt[] {
  let output = subject
  const n = clip.length
  for (let i = 0; i < n && output.length > 0; i++) {
    const a = clip[i]
    const b = clip[(i + 1) % n]
    if (a[0] === b[0] && a[1] === b[1]) continue
    const side = (p: Pt) => (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0])
    const ref = Math.sign(side(site)) || 1
    const input = output
    output = []
    for (let j = 0; j < input.length; j++) {
      const cur = input[j]
      const prev = input[(j + input.length - 1) % input.length]
      const curIn = side(cur) * ref >= 0
      const prevIn = side(prev) * ref >= 0
      if (curIn) {
        if (!prevIn) output.push(intersect(prev, cur, a, b))
        output.push(cur)
      } else if (prevIn) {
        output.push(intersect(prev, cur, a, b))
      }
    }
  }
  return output
}

export function polygonPath(points: Pt[]): string {
  if (points.length < 3) return ''
  return `M${points.map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join('L')}Z`
}

// ── 이름표 ──

export interface Box { x0: number; y0: number; x1: number; y1: number }

export interface LabelItem {
  id: string
  x: number
  y: number
  /** 점(과 둘레 고리)의 반지름 — 그룹 좌표 */
  r: number
  text: string
  /** 클수록 먼저 자리를 잡는다 */
  priority: number
  /** 자리가 없어도 반드시 보인다 */
  force: boolean
}

export interface PlacedLabel {
  x: number
  y: number
  anchor: 'start' | 'middle' | 'end'
}

const CJK = /[\u1100-\u11ff\u3040-\u30ff\u3130-\u318f\u3400-\u9fff\uac00-\ud7af]/

/** 11px 굵은 글씨 기준 너비 어림 */
export function textWidth(text: string, px = 11): number {
  let w = 0
  for (const ch of text) w += CJK.test(ch) ? px : ch === ' ' ? px * 0.3 : px * 0.6
  return w
}

function hit(a: Box, b: Box): boolean {
  return a.x0 < b.x1 && a.x1 > b.x0 && a.y0 < b.y1 && a.y1 > b.y0
}

/**
 * 욕심쟁이 배치 — 중요한 이름부터 위·오른쪽·아래·왼쪽 순으로 빈자리를 찾는다.
 * 다른 점이나 먼저 선 이름과 겹치면 다음 자리로, 넷 다 막히면(꼭 보여야 하는 이름이 아니면) 숨긴다.
 * k: 확대 배율 — 글씨는 화면에서 같은 크기로 보이므로 그룹 좌표에서는 1/k로 줄어든다.
 */
export function layoutLabels(items: LabelItem[], k: number, obstacles: Box[], px = 11): Map<string, PlacedLabel> {
  const placed = new Map<string, PlacedLabel>()
  const taken: Box[] = []
  const h = (px + 3) / k
  const pad = 3 / k
  const sorted = [...items].sort((a, b) => b.priority - a.priority)
  for (const item of sorted) {
    const w = textWidth(item.text, px) / k
    const { x, y, r } = item
    const options: { box: Box; label: PlacedLabel }[] = [
      { box: { x0: x - w / 2, y0: y - r - pad - h, x1: x + w / 2, y1: y - r - pad }, label: { x, y: y - r - pad - h / 2, anchor: 'middle' } },
      { box: { x0: x + r + pad, y0: y - h / 2, x1: x + r + pad + w, y1: y + h / 2 }, label: { x: x + r + pad, y, anchor: 'start' } },
      { box: { x0: x - w / 2, y0: y + r + pad, x1: x + w / 2, y1: y + r + pad + h }, label: { x, y: y + r + pad + h / 2, anchor: 'middle' } },
      { box: { x0: x - r - pad - w, y0: y - h / 2, x1: x - r - pad, y1: y + h / 2 }, label: { x: x - r - pad, y, anchor: 'end' } },
    ]
    const own = (b: Box) => b.x0 <= x && b.x1 >= x && b.y0 <= y && b.y1 >= y
    const free = options.find((o) => !taken.some((b) => hit(o.box, b)) && !obstacles.some((b) => !own(b) && hit(o.box, b)))
    const pick = free ?? (item.force ? options[0] : null)
    if (!pick) continue
    placed.set(item.id, pick.label)
    taken.push(pick.box)
  }
  return placed
}
