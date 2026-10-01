/*
  파일명: components/features/game/myth/troy/scene/stage.ts
  기능: 그리는 바탕(렌더러·장면·그리는 고리)
  책임: WebGL 렌더러를 품질에 맞춰 세우고(톤 매핑 ACES, sRGB, 부드러운 그림자), 화면에 보일 때만 매 장면을 돌린다(document.hidden이면 쉰다).
        그림자 지도는 무언가 움직인 장면에만 다시 굽는다. 캔버스 크기를 맞추고, 장면 수·그리기 수·삼각형 수를 잰다.
        여러 초 이어 느리면 픽셀 배율을 스스로 낮춘다(perfGovernor.ts).
*/ // ------------------------------
import { ACESFilmicToneMapping, PCFShadowMap, Scene, SRGBColorSpace, WebGLRenderer } from "three";
import { CameraRig } from "./cameraRig";
import { PerfGovernor } from "./perfGovernor";
import type { SceneQuality } from "./types";

export class Stage {
  readonly renderer: WebGLRenderer;
  readonly scene = new Scene();
  readonly rig = new CameraRig();
  onFrame: (dt: number, now: number) => void = () => {};
  // 무언가 움직였으면 true — 다음 장면에서 그림자 지도를 다시 굽는다
  shadowsDirty = true;
  private raf = 0;
  private last = 0;
  private running = false;
  private disposed = false;
  private frameMs = 0;
  private fps = 0;
  private fpsFrames = 0;
  private fpsStart = 0;
  private readonly governor: PerfGovernor;

  constructor(private readonly canvas: HTMLCanvasElement, quality: SceneQuality) {
    // WebGL을 못 쓰면 여기서 던진다(BoardCanvas가 받아 onError로 알린다)
    this.renderer = new WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance", stencil: false });
    const r = this.renderer;
    r.toneMapping = ACESFilmicToneMapping;
    r.outputColorSpace = SRGBColorSpace;
    // r183에서 PCFSoftShadowMap은 PCFShadowMap으로 합쳐졌다. PCF가 shadow.radius로 부드럽게 흐린다
    r.shadowMap.enabled = quality === "high";
    r.shadowMap.type = PCFShadowMap;
    r.shadowMap.autoUpdate = false;
    this.governor = new PerfGovernor(quality === "high" ? Math.min(window.devicePixelRatio || 1, 2) : 1, performance.now());
    r.setPixelRatio(this.governor.ratio);
    document.addEventListener("visibilitychange", this.onVisibility);
    this.resize();
    this.start();
  }

  private onVisibility = () => (document.hidden ? this.stop() : this.start());

  start() {
    if (this.running || this.disposed || document.hidden) return;
    this.running = true;
    this.last = performance.now();
    // 쉬었다 돌아오면 그사이를 느린 장면으로 세지 않게 새로 잰다
    this.fpsStart = this.last;
    this.fpsFrames = 0;
    this.governor.rest(this.last);
    this.raf = requestAnimationFrame(this.loop);
  }

  stop() {
    this.running = false;
    cancelAnimationFrame(this.raf);
  }

  private loop = (t: number) => {
    if (!this.running) return;
    this.raf = requestAnimationFrame(this.loop);
    const dt = Math.min(0.05, Math.max(0, (t - this.last) / 1000));
    this.last = t;
    const t0 = performance.now();
    this.onFrame(dt, t / 1000);
    this.rig.update(dt);
    this.renderer.shadowMap.needsUpdate = this.shadowsDirty;
    this.shadowsDirty = false;
    this.renderer.render(this.scene, this.rig.camera);
    this.frameMs = this.frameMs * 0.92 + (performance.now() - t0) * 0.08;
    this.fpsFrames += 1;
    if (t - this.fpsStart >= 1000) {
      this.fps = (this.fpsFrames * 1000) / (t - this.fpsStart);
      this.fpsFrames = 0;
      this.fpsStart = t;
      const lower = this.governor.sample(this.fps, t);
      if (lower !== null) {
        this.renderer.setPixelRatio(lower);
        this.resize();
      }
    }
  };

  resize() {
    const w = Math.max(1, this.canvas.clientWidth);
    const h = Math.max(1, this.canvas.clientHeight);
    this.renderer.setSize(w, h, false);
    this.rig.resize(w, h);
    this.governor.rest(performance.now());
  }

  stats() {
    const info = this.renderer.info.render;
    return {
      fps: Math.round(this.fps), frameMs: Math.round(this.frameMs * 100) / 100, calls: info.calls, triangles: info.triangles,
      pixelRatio: this.renderer.getPixelRatio(),
    };
  }

  dispose() {
    this.disposed = true;
    this.stop();
    document.removeEventListener("visibilitychange", this.onVisibility);
    this.renderer.dispose();
  }
}
