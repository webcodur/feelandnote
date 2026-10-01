/*
  파일명: components/features/game/myth/troy/scene/perfGovernor.ts
  기능: 느린 기기에서 그리는 해상도 낮추기(동적 해상도)
  책임: 1초마다 잰 장면 수를 받아, 여러 초 이어 느리면 픽셀 배율을 한 단 낮춘다. 한 번 낮춘 배율은 이 페이지가 살아 있는 동안
        다음 판에도 이어 쓴다. 다시 올리지는 않는다(오르내림이 되풀이되면 화면이 번쩍인다). WebGL과 떨어진 순수 계산이라 시험할 수 있다.
*/ // ------------------------------

// 내려갈 픽셀 배율 단계(기기 배율 2 이상인 휴대폰은 2에서 시작한다)
const STEPS = [2, 1.5, 1.25, 1, 0.75];
const SLOW_FPS = 45;
const SLOW_SECONDS = 3;
// 새로 그리기 시작하거나 크기가 바뀐 직후는 재지 않는다(모델 읽기·셰이더 굽기로 끊기는 몫)
const WARM_MS = 2500;

let remembered: number | null = null;

export class PerfGovernor {
  ratio: number;
  private slow = 0;
  private warmUntil: number;

  constructor(max: number, now: number) {
    this.ratio = Math.min(max, remembered ?? max);
    this.warmUntil = now + WARM_MS;
  }

  rest(now: number) {
    this.warmUntil = now + WARM_MS;
    this.slow = 0;
  }

  // 1초 동안 잰 장면 수. 배율을 낮춰야 하면 새 배율을, 아니면 null을 돌려준다
  sample(fps: number, now: number): number | null {
    if (now < this.warmUntil) return null;
    this.slow = fps < SLOW_FPS ? this.slow + 1 : 0;
    if (this.slow < SLOW_SECONDS) return null;
    this.slow = 0;
    const next = STEPS.find((step) => step < this.ratio - 1e-6);
    if (next === undefined) return null;
    this.ratio = next;
    remembered = next;
    this.warmUntil = now + WARM_MS;
    return next;
  }
}

// 시험에서만 부른다 — 앞 시험이 낮춘 배율을 지운다
export function forgetRatio() {
  remembered = null;
}
