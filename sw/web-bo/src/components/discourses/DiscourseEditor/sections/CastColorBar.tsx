'use client'

/**
 * 인물색 한눈 띠 — 인물 색이 서로 갈리는지 한 줄로 보여준다.
 *
 * 담화는 **지금 누가 말하는지를 색으로 알린다**(이름·자막 강조). 두 인물이 비슷한 색을 쓰면
 * 시청자가 발언자를 놓치므로, 색 겹침을 편집 화면에서 미리 잡는다.
 * 색을 비운 인물은 렌더가 기본 팔레트를 자리 번호로 돌려 쓴다(castColor) — 그 값을 그대로 보여준다.
 */

import { CAST_COLORS } from '@feelandnote/remotion/src/compositions/Discourse/constants'
import type { Speaker } from '@/lib/discourse-types'

/** 렌더 castColor 미러 — 색이 없으면 기본 팔레트를 자리 번호로 돌려 쓴다 */
export const castColorOf = (sp: Speaker | undefined, i: number): string =>
  sp?.color ?? CAST_COLORS[i % CAST_COLORS.length]

/** 두 색이 사람 눈에 갈리는가 — RGB 거리로 거칠게 본다 */
function tooClose(a: string, b: string): boolean {
  const rgb = (h: string) => {
    const c = h.replace('#', '')
    if (c.length < 6) return null
    return [parseInt(c.slice(0, 2), 16), parseInt(c.slice(2, 4), 16), parseInt(c.slice(4, 6), 16)]
  }
  const x = rgb(a), y = rgb(b)
  if (!x || !y) return false
  const d = Math.sqrt(x.reduce((s, v, i) => s + (v - y[i]) ** 2, 0))
  return d < 60
}

export function CastColorBar({ cast }: { cast: Speaker[] }) {
  if (cast.length === 0) return null

  const colors = cast.map((sp, i) => castColorOf(sp, i))
  // 서로 헷갈릴 만큼 가까운 색 쌍
  const clashes: string[] = []
  for (let i = 0; i < colors.length; i++) {
    for (let j = i + 1; j < colors.length; j++) {
      if (tooClose(colors[i], colors[j])) clashes.push(`${cast[i].name || `${i + 1}번`} · ${cast[j].name || `${j + 1}번`}`)
    }
  }

  return (
    <div className="space-y-1.5 rounded-lg border border-border bg-bg-card/40 p-2.5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[11px] text-text-dim">인물색</span>
        {cast.map((sp, i) => (
          <span key={i} className="flex items-center gap-1.5 rounded-md border border-border bg-bg-card px-2 py-1">
            <span className="h-4 w-4 shrink-0 rounded-full border border-border" style={{ backgroundColor: colors[i] }} />
            <span className="text-xs font-semibold">{sp.name || `${i + 1}번 인물`}</span>
            <span className="font-mono text-[10px] text-text-dim">{colors[i]}{sp.color ? '' : ' (기본)'}</span>
          </span>
        ))}
      </div>
      {clashes.length > 0 && (
        <p className="text-[11px] font-semibold text-warning-text">
          색이 서로 비슷해 발언자를 구분하기 어렵습니다 — {clashes.join(' / ')}. 한쪽 색을 바꿔 주세요.
        </p>
      )}
    </div>
  )
}
