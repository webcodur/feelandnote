/*
  파일명: components/features/game/myth/troy/scene/cameraRig.ts
  기능: 판을 도는 궤도 카메라
  책임: 방위·올려 본 각·확대·과녁을 목표값으로 두고 매 장면 부드럽게 따라간다. 지금 방향·화면비에서 판 전체가 들어오는 거리를
        셈해(세로로 긴 휴대폰이면 멀어진다) 확대 배율의 기준으로 삼고, 흔들림을 얹는다. 과녁은 판 밖으로 나가지 않고,
        당겨 볼 때는 화면이 판 끝 너머 빈 하늘만 비추지 않는 곳까지만 간다(cameraFit.ts).
*/ // ------------------------------
import { MathUtils, PerspectiveCamera, Vector3 } from "three";
import { centerWeight, clampToView, computeFit, createFit, FOV, TARGET_Y, type BoardBox } from "./cameraFit";

const DEG = Math.PI / 180;
const AZ0 = 45 * DEG;
const EL0 = 50 * DEG;
const EL_MIN = 24 * DEG;
const EL_MAX = 80 * DEG;
const ZOOM_MIN = 0.3;
const ZOOM_MAX = 1.25;
const QUARTER = Math.PI / 2;

export class CameraRig {
  readonly camera = new PerspectiveCamera(FOV, 1, 0.1, 400);
  autoOrbit = false;
  private az = AZ0;
  private el = EL0;
  private zoom = 1;
  private goalAz = AZ0;
  private goalEl = EL0;
  private goalZoom = 1;
  private readonly target = new Vector3(0, TARGET_Y, 0);
  // 바라고 싶은 과녁(판 안). 실제로 가는 곳은 화면 폭에 맞게 가둔 viewGoal이다
  private readonly goalTarget = new Vector3(0, TARGET_Y, 0);
  private readonly viewGoal = new Vector3(0, TARGET_Y, 0);
  private snap = false;
  private readonly box: BoardBox = { hw: 8, hh: 6, top: 1 };
  private shakeAmp = 0;
  private viewH = 800;
  private readonly tmp = new Vector3();
  private readonly fit = createFit();
  private readonly look = new Vector3();

  setBoard(width: number, height: number, maxTop: number, reset: boolean) {
    this.box.hw = width / 2;
    this.box.hh = height / 2;
    this.box.top = maxTop;
    if (!reset) return;
    this.az = this.goalAz = AZ0;
    this.el = this.goalEl = EL0;
    this.zoom = this.goalZoom = 1;
    this.target.set(0, TARGET_Y, 0);
    this.goalTarget.copy(this.target);
  }

  resize(w: number, h: number) {
    this.viewH = Math.max(1, h);
    this.camera.aspect = Math.max(1, w) / this.viewH;
    this.camera.updateProjectionMatrix();
  }

  // 90°씩 돈다. 자유 회전으로 어긋난 뒤에도 45°+90°k 칸에 다시 맞춘다
  rotate(dir: 1 | -1) {
    const base = Math.round((this.goalAz - AZ0) / QUARTER) * QUARTER + AZ0;
    this.goalAz = base + dir * QUARTER;
  }

  orbitBy(dAz: number, dEl: number) {
    this.goalAz += dAz;
    this.goalEl = MathUtils.clamp(this.goalEl + dEl, EL_MIN, EL_MAX);
  }

  zoomBy(factor: number) {
    this.goalZoom = MathUtils.clamp(this.goalZoom * factor, ZOOM_MIN, ZOOM_MAX);
  }

  // 화면 픽셀만큼 판을 끈다(판이 손가락을 따라온다). 가둔 자리에서 출발해 판 끝 너머로 쌓인 몫이 없게 한다
  panBy(dx: number, dy: number) {
    const perPx = (2 * this.distance() * Math.tan((FOV * DEG) / 2)) / this.viewH;
    const g = this.goalTarget.copy(this.clampedGoal());
    g.addScaledVector(this.tmp.set(Math.cos(this.az), 0, -Math.sin(this.az)), -dx * perPx);
    g.x += -Math.sin(this.az) * dy * perPx / Math.sin(this.el);
    g.z += -Math.cos(this.az) * dy * perPx / Math.sin(this.el);
    this.clampBoard(g);
  }

  focus(x: number, z: number, animate: boolean) {
    this.goalTarget.set(x, TARGET_Y, z);
    this.clampBoard(this.goalTarget);
    this.snap = !animate;
  }

  shake(strength: number) {
    this.shakeAmp = Math.max(this.shakeAmp, 0.045 * MathUtils.clamp(strength, 0, 3));
  }

  distance(): number {
    return this.fit.d * this.zoom;
  }

  private clampBoard(t: Vector3) {
    t.x = MathUtils.clamp(t.x, -this.box.hw, this.box.hw);
    t.z = MathUtils.clamp(t.z, -this.box.hh, this.box.hh);
  }

  // 목표 확대·방향에서 화면 폭에 맞게 가둔 과녁
  private clampedGoal(): Vector3 {
    const d = this.fit.d * this.goalZoom;
    const w = centerWeight(this.goalZoom);
    return clampToView(this.viewGoal.copy(this.goalTarget), this.box, this.goalAz, this.goalEl, d, this.camera.aspect, w);
  }

  update(dt: number) {
    if (this.autoOrbit) this.goalAz += dt * 0.12;
    const k = 1 - Math.exp(-dt * 7);
    this.az += (this.goalAz - this.az) * k;
    this.el += (this.goalEl - this.el) * k;
    this.zoom += (this.goalZoom - this.zoom) * k;
    computeFit(this.box, this.az, this.el, this.camera.aspect, this.fit);
    const goal = this.clampedGoal();
    if (this.snap) this.target.copy(goal);
    else this.target.lerp(goal, k);
    this.snap = false;
    const d = this.distance();
    const w = centerWeight(this.zoom);
    const look = this.look.copy(this.target).addScaledVector(this.fit.r, this.fit.sr * w).addScaledVector(this.fit.u, this.fit.su * w);
    const cam = this.camera;
    cam.position.set(
      look.x + d * Math.cos(this.el) * Math.sin(this.az),
      look.y + d * Math.sin(this.el),
      look.z + d * Math.cos(this.el) * Math.cos(this.az),
    );
    cam.lookAt(look);
    if (this.shakeAmp > 0.0005) {
      const t = performance.now() / 1000;
      cam.position.x += Math.sin(t * 61) * this.shakeAmp;
      cam.position.y += Math.sin(t * 47 + 1.3) * this.shakeAmp * 0.6;
      cam.position.z += Math.cos(t * 53 + 0.7) * this.shakeAmp;
      this.shakeAmp *= Math.exp(-dt * 8);
    }
    cam.near = Math.max(0.1, d * 0.05);
    cam.far = d * 4 + 40;
    cam.updateProjectionMatrix();
  }
}
