'use client'

/**
 * 음원 자리 어긋남 경고.
 *
 * 발언 음원은 자리 번호 + 발언자로 이름이 붙는다(T01-qin-shi-huang.wav). 발언을 중간에 넣거나 옮기면
 * 뒤 발언의 번호가 한 칸씩 밀리는데, 파일은 제자리에 있으므로 **번호와 인물이 어긋난다**.
 * 파일명에 인물을 함께 넣은 이유가 이것이고(눈으로 잡힌다), 이 배너가 그 대조를 자동으로 해 준다.
 *
 * 판정은 vnVerify(discourse-voice.ts)가 한다 — 렌더 쪽 voice-names.ts 와 규칙이 같아야 하는 함수다.
 */

import type { DiscourseScript } from '@/lib/discourse-types'

type Issue = { turnIndex: number; expected: string; found?: string }

type Props = {
  issues: Issue[]
  script: DiscourseScript
  /** 디스크에 있는 음원 개수 — 0이면 아직 음성을 만들기 전이라 경고할 것이 없다 */
  voiceCount: number
  onReload: () => void
}

export function VoiceMismatchBanner({ issues, script, voiceCount, onReload }: Props) {
  // 음원을 아직 하나도 만들지 않았으면 어긋날 것도 없다 — 빈 화면에 붉은 경고를 띄우지 않는다
  if (voiceCount === 0) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-border bg-bg-card/40 p-2.5 text-[11px] text-text-dim">
        <span>이 편의 발언 음성은 아직 없습니다. 음성을 만든 뒤에는 발언을 옮길 때마다 음원 자리가 맞는지 여기서 알려 드립니다.</span>
        <button onClick={onReload} className="ms-auto rounded border border-border px-2 py-0.5 text-text-secondary hover:border-accent hover:text-accent">
          다시 확인
        </button>
      </div>
    )
  }

  if (issues.length === 0) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-success-text/40 bg-success/15 p-2.5 text-[11px] font-semibold text-success-text">
        <span>음원 {voiceCount}개가 모두 제자리에 있습니다. 발언 순서와 음성이 맞습니다.</span>
        <button onClick={onReload} className="ms-auto rounded border border-success-text/40 px-2 py-0.5 hover:bg-success/25">
          다시 확인
        </button>
      </div>
    )
  }

  // 자리는 채워져 있는데 인물이 다르다 = 발언이 밀렸다는 신호. 그냥 없는 것과 구분해 알린다
  const shifted = issues.filter(i => i.found)
  const missing = issues.filter(i => !i.found)

  return (
    <div className="space-y-2 rounded-lg border-2 border-danger-text/50 bg-danger/15 p-3">
      <div className="flex items-center gap-2">
        <span className="text-sm font-bold text-danger-text">
          음성이 발언과 맞지 않습니다 — {issues.length}곳
        </span>
        <button onClick={onReload} className="ms-auto rounded border border-danger-text/40 px-2 py-0.5 text-[11px] text-danger-text hover:bg-danger/25">
          다시 확인
        </button>
      </div>

      {shifted.length > 0 && (
        <div className="space-y-1">
          <p className="text-[11px] font-semibold text-danger-text">
            아래 자리에는 다른 인물의 음성이 놓여 있습니다. 발언을 옮기면서 음원이 밀린 것으로 보입니다 —
            이대로 영상을 만들면 인물이 남의 대사를 말합니다.
          </p>
          <ul className="space-y-0.5">
            {shifted.map(i => (
              <li key={i.turnIndex} className="flex flex-wrap items-center gap-1.5 font-mono text-[11px] text-danger-text">
                <span className="rounded bg-danger-text/10 px-1.5 py-0.5 font-sans font-semibold">
                  {i.turnIndex + 1}번 · {script.cast[script.turns[i.turnIndex]?.cast]?.name ?? '?'}
                </span>
                <span>있어야 할 파일 {i.expected}</span>
                <span className="font-sans">→ 그 자리에 있는 것</span>
                <span className="font-bold">{i.found}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {missing.length > 0 && (
        <div className="space-y-1">
          <p className="text-[11px] font-semibold text-danger-text">
            아래 발언은 음성 파일이 아예 없습니다. 아직 만들지 않았거나, 이름이 규칙과 다릅니다.
          </p>
          <ul className="space-y-0.5">
            {missing.map(i => (
              <li key={i.turnIndex} className="flex flex-wrap items-center gap-1.5 font-mono text-[11px] text-danger-text">
                <span className="rounded bg-danger-text/10 px-1.5 py-0.5 font-sans font-semibold">
                  {i.turnIndex + 1}번 · {script.cast[script.turns[i.turnIndex]?.cast]?.name ?? '?'}
                </span>
                <span>{i.expected}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="text-[11px] text-danger-text">
        고치는 방법 — 에피소드 폴더의 voice 안에서 파일 이름을 위 「있어야 할 파일」로 직접 바꾸거나, 그 발언의 음성을 다시 만드세요.
      </p>
    </div>
  )
}
