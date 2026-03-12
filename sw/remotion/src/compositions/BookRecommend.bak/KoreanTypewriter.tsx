import { interpolate, useCurrentFrame } from 'remotion'

type Props = {
  text: string
  startFrame: number
  /** 전체 타이핑이 완료되기까지의 프레임 */
  spreadFrames: number
  color: string
  fontSize: number
  style?: React.CSSProperties
}

// 초성 → 호환 자모 매핑
const CHO = 'ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ'.split('')

/** 한글 음절(가~힣)인지 */
const isSyllable = (ch: string) => {
  const c = ch.charCodeAt(0)
  return c >= 0xac00 && c <= 0xd7a3
}

/**
 * 텍스트를 타이핑 스텝 배열로 분해한다.
 * "한글" → ["ㅎ", "하", "한", "한ㄱ", "한그", "한글"]
 * 비한글 문자는 그대로 한 스텝.
 */
function buildSteps(text: string): string[] {
  const steps: string[] = []
  let built = ''

  for (const ch of text) {
    if (isSyllable(ch)) {
      const code = ch.charCodeAt(0) - 0xac00
      const cho = Math.floor(code / (21 * 28))
      const jung = Math.floor((code / 28) % 21)
      const jong = code % 28

      // 스텝 1: 초성만
      steps.push(built + CHO[cho])
      // 스텝 2: 초성 + 중성
      const noJong = String.fromCharCode(0xac00 + cho * 21 * 28 + jung * 28)
      steps.push(built + noJong)
      // 스텝 3: 종성 있으면 완성형
      if (jong > 0) {
        steps.push(built + ch)
      }
    } else {
      // 공백, 구두점 등
      steps.push(built + ch)
    }
    built += ch
  }

  return steps
}

export const KoreanTypewriter: React.FC<Props> = ({
  text,
  startFrame,
  spreadFrames,
  color,
  fontSize,
  style,
}) => {
  const frame = useCurrentFrame()
  const steps = buildSteps(text)
  const totalSteps = steps.length

  const progress = interpolate(frame - startFrame, [0, spreadFrames], [0, totalSteps], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })

  const stepIndex = Math.min(Math.floor(progress), totalSteps - 1)
  const display = stepIndex < 0 ? '' : steps[stepIndex]

  return (
    <div
      style={{
        color,
        fontSize,
        fontFamily: 'system-ui',
        lineHeight: 1.7,
        whiteSpace: 'pre-wrap',
        ...style,
      }}
    >
      {display}
      {/* 커서 깜빡임 */}
      {stepIndex >= 0 && stepIndex < totalSteps - 1 && (
        <span
          style={{
            opacity: Math.sin(frame * 0.3) > 0 ? 1 : 0,
            color: '#c8a46e',
            fontWeight: 300,
          }}
        >
          |
        </span>
      )}
    </div>
  )
}
