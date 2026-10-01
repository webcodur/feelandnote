/*
  파일명: components/features/game/duel/SimonArena/simonSound.ts
  기능: 지략전 칸 소리
  책임: 여섯 칸에 도·레·미·파·솔·라를 하나씩 붙여 짧게 울린다. 오디오 문맥은 하나만 만들어 다시 쓴다.
*/

const NOTE_FREQS = [523.25, 587.33, 659.25, 698.46, 783.99, 880.0]; // C5~A5

let audioCtx: AudioContext | null = null;

function context(): AudioContext | null {
  try {
    if (!audioCtx || audioCtx.state === "closed") audioCtx = new AudioContext();
    return audioCtx;
  } catch {
    return null;
  }
}

export function playCellTone(cell: number) {
  const ctx = context();
  if (!ctx) return;
  try {
    // 휴대폰 자동 재생 제한으로 멈춰 있으면 깨운다
    if (ctx.state === "suspended") void ctx.resume();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = NOTE_FREQS[cell] ?? NOTE_FREQS[0];
    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.35);
  } catch {
    // 소리를 낼 수 없는 환경은 조용히 넘긴다
  }
}
