/**
 * BGM 덕킹 — 음성·대사 재생 중 배경음악 음량을 자동으로 낮추고 끝나면 복원한다.
 *
 * Remotion의 FactionBgm.tsx 덕킹(음성 구간 BGM을 musicDuckVolume으로)에서 따왔으며,
 * 브라우저 Web Audio API(GainNode + linearRampToValueAtTime)로 구현했다.
 *
 * 쓰는 법:
 * 1. BGM 컴포넌트에서 connectBgm(audioEl) — <audio>를 GainNode 경유로 연결
 * 2. 음성 재생 시작 시 duckBgm() → 돌려받은 함수를 저장
 * 3. 음성 재생 끝날 때 저장한 함수 호출 → BGM 원음 복원
 */

const DUCK_VOLUME = 0.3 // 대사 중 BGM 30%
const RAMP_SEC = 0.15 // 전환 시간(초) — 짧고 부드럽게

let ctx: AudioContext | null = null
let bgmGain: GainNode | null = null
let disconnectCurrent: (() => void) | null = null

function ensureCtx(): AudioContext {
  if (!ctx) ctx = new AudioContext()
  if (ctx.state === "suspended") void ctx.resume()
  return ctx
}

/**
 * <audio> 요소의 출력을 GainNode 경유로 돌려 덕킹 제어 아래 둔다.
 * 한 번에 한 BGM만 이 경로에 물린다 — 새 BGM이 연결되면 이전 것은 끊긴다.
 *
 * @returns 연결 해제 함수 — 컴포넌트가 언마운트될 때 호출
 */
export function connectBgm(audioEl: HTMLAudioElement): () => void {
  disconnectCurrent?.()

  const c = ensureCtx()
  const source = c.createMediaElementSource(audioEl)
  const gain = c.createGain()
  gain.gain.value = 1
  source.connect(gain)
  gain.connect(c.destination)
  bgmGain = gain

  const cleanup = () => {
    // 노드가 이미 다른 BGM으로 교체됐다면 건드리지 않는다
    if (bgmGain !== gain) return
    source.disconnect()
    gain.disconnect()
    bgmGain = null
    disconnectCurrent = null
  }
  disconnectCurrent = cleanup
  return cleanup
}

/**
 * BGM 음량을 30%로 부드럽게 낮춘다. 음성·대사 재생 직전에 호출.
 *
 * @returns 복원 함수 — 음성이 끝나면 호출해 BGM을 다시 100%로 올린다.
 *          아무 BGM도 연결돼 있지 않으면 빈 함수(no-op)를 반환한다.
 */
export function duckBgm(): () => void {
  const gain = bgmGain
  if (!gain) return () => {}

  const c = ensureCtx()
  const now = c.currentTime

  // 이전에 예약된 값 변경을 취소하고 현재 값에서 시작
  gain.gain.cancelScheduledValues(now)
  gain.gain.setValueAtTime(gain.gain.value, now)
  gain.gain.linearRampToValueAtTime(DUCK_VOLUME, now + RAMP_SEC)

  let done = false
  return () => {
    if (done) return
    done = true
    // 이 BGM이 이미 교체됐으면 조용히 무시
    if (bgmGain !== gain) return
    const c2 = ensureCtx()
    const n = c2.currentTime
    gain.gain.cancelScheduledValues(n)
    gain.gain.setValueAtTime(gain.gain.value, n)
    gain.gain.linearRampToValueAtTime(1, n + RAMP_SEC)
  }
}
