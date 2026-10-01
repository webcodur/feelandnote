/*
  파일명: components/features/game/myth/troy/scene/tween.ts
  기능: 시간 흐름 도우미
  책임: 그리는 고리의 시각에 맞춰 0→1로 흐르는 일을 돌리고 끝나면 약속(Promise)을 푼다. 뷰를 치우면 남은 일을 끝으로 보내 풀어 준다.
        빠르기(scale)를 올리면 모든 일이 그만큼 빨리 흐른다.
        자주 쓰는 완급(easing)도 여기 둔다.
*/ // ------------------------------
export type Ease = (k: number) => number;

export const EASE = {
  linear: (k: number) => k,
  inQuad: (k: number) => k * k,
  outQuad: (k: number) => 1 - (1 - k) * (1 - k),
  outCubic: (k: number) => 1 - Math.pow(1 - k, 3),
  inCubic: (k: number) => k * k * k,
  inOutSine: (k: number) => 0.5 - Math.cos(Math.PI * k) / 2,
  outBack: (k: number) => 1 + 2.70158 * Math.pow(k - 1, 3) + 1.70158 * Math.pow(k - 1, 2),
  outBounce: (k: number) => {
    const n = 7.5625;
    const d = 2.75;
    if (k < 1 / d) return n * k * k;
    if (k < 2 / d) return n * (k - 1.5 / d) * (k - 1.5 / d) + 0.75;
    if (k < 2.5 / d) return n * (k - 2.25 / d) * (k - 2.25 / d) + 0.9375;
    return n * (k - 2.625 / d) * (k - 2.625 / d) + 0.984375;
  },
};

interface Job {
  start: number;
  dur: number;
  step: (k: number) => void;
  ease: Ease;
  done: () => void;
}

export class Tweens {
  private jobs: Job[] = [];
  // 연출 시계. 그리는 고리의 시각을 scale 몫만큼 빨리 흘려 쌓는다
  private now = performance.now() / 1000;
  private last: number | null = null;
  // 연출 빠르기(1 = 보통, 2 = 두 배). 판 위 움직임·타격·떠오르는 글자가 모두 따른다
  scale = 1;

  // dur초 동안 step(0→1)을 부르고, 끝나면 풀린다
  run(dur: number, step: (k: number) => void, ease: Ease = EASE.outCubic): Promise<void> {
    return new Promise((resolve) => {
      if (dur <= 0) {
        step(1);
        resolve();
        return;
      }
      this.jobs.push({ start: this.now, dur, step, ease, done: resolve });
    });
  }

  wait(dur: number): Promise<void> {
    return this.run(dur, () => {}, EASE.linear);
  }

  update(now: number) {
    this.now += this.last === null ? 0 : Math.max(0, now - this.last) * this.scale;
    this.last = now;
    const live: Job[] = [];
    const finished: Job[] = [];
    this.jobs.forEach((job) => {
      const k = Math.min(1, (this.now - job.start) / job.dur);
      job.step(job.ease(Math.max(0, k)));
      (k >= 1 ? finished : live).push(job);
    });
    this.jobs = [...live, ...this.jobs.slice(live.length + finished.length)];
    finished.forEach((job) => job.done());
  }

  busy(): boolean {
    return this.jobs.length > 0;
  }

  // 남은 일을 모두 끝 상태로 보내고 푼다(뷰를 치울 때)
  finishAll() {
    const jobs = this.jobs;
    this.jobs = [];
    jobs.forEach((job) => {
      job.step(job.ease(1));
      job.done();
    });
  }
}
