/*
  파일명: components/features/game/myth/troy/scene/input.ts
  기능: 판 조작(누름·끌기·확대·회전)
  책임: 캔버스 포인터를 받아 누름과 끌기를 8px 문턱으로 가른다. 왼쪽 끌기·한 손가락 끌기는 판 옮기기, 오른쪽 끌기는 자유 회전(PC),
        두 손가락은 벌리기 확대와 옮기기, 휠은 확대, Q·E는 90° 회전이다. 가리킴(마우스)은 다음 장면에서 한 번만 칸을 찾는다.
*/ // ------------------------------
import type { CameraRig } from "./cameraRig";

const TAP_SLOP = 8;
const TURN_KEYS: Partial<Record<string, 1 | -1>> = { q: -1, e: 1 };

interface Handlers {
  tap: (x: number, y: number) => void;
  hover: (x: number, y: number) => void;
  leave: () => void;
}

interface Touch {
  x: number;
  y: number;
  sx: number;
  sy: number;
  button: number;
}

export class BoardInput {
  private readonly touches = new Map<number, Touch>();
  private dragging = false;
  private pinch = 0;

  constructor(private readonly canvas: HTMLCanvasElement, private readonly rig: CameraRig, private readonly on: Handlers) {
    canvas.style.touchAction = "none";
    canvas.addEventListener("pointerdown", this.down);
    canvas.addEventListener("pointermove", this.move);
    canvas.addEventListener("pointerup", this.up);
    canvas.addEventListener("pointercancel", this.cancel);
    canvas.addEventListener("pointerleave", this.leave);
    canvas.addEventListener("wheel", this.wheel, { passive: false });
    canvas.addEventListener("contextmenu", this.menu);
    window.addEventListener("keydown", this.key);
  }

  private local(e: PointerEvent) {
    const rect = this.canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  private spread(): number {
    const [a, b] = [...this.touches.values()];
    return a && b ? Math.hypot(a.x - b.x, a.y - b.y) : 0;
  }

  private down = (e: PointerEvent) => {
    const p = this.local(e);
    this.canvas.setPointerCapture(e.pointerId);
    this.touches.set(e.pointerId, { x: p.x, y: p.y, sx: p.x, sy: p.y, button: e.button });
    if (this.touches.size >= 2) {
      this.dragging = true;
      this.pinch = this.spread();
    }
  };

  private move = (e: PointerEvent) => {
    const p = this.local(e);
    const t = this.touches.get(e.pointerId);
    if (!t) {
      if (e.pointerType === "mouse") this.on.hover(p.x, p.y);
      return;
    }
    const dx = p.x - t.x;
    const dy = p.y - t.y;
    const before = this.touches.size >= 2 ? this.center() : null;
    t.x = p.x;
    t.y = p.y;
    if (before) {
      const spread = this.spread();
      if (this.pinch > 0 && spread > 0) this.rig.zoomBy(this.pinch / spread);
      this.pinch = spread;
      const after = this.center();
      this.rig.panBy(after.x - before.x, after.y - before.y);
      return;
    }
    if (!this.dragging && Math.hypot(p.x - t.sx, p.y - t.sy) < TAP_SLOP) return;
    this.dragging = true;
    const rotate = t.button === 2 || (e.buttons & 2) === 2;
    if (rotate) this.rig.orbitBy(-dx * 0.008, dy * 0.005);
    else this.rig.panBy(dx, dy);
  };

  private center() {
    const list = [...this.touches.values()];
    return { x: list.reduce((s, t) => s + t.x, 0) / list.length, y: list.reduce((s, t) => s + t.y, 0) / list.length };
  }

  private up = (e: PointerEvent) => {
    const t = this.touches.get(e.pointerId);
    this.touches.delete(e.pointerId);
    if (this.canvas.hasPointerCapture(e.pointerId)) this.canvas.releasePointerCapture(e.pointerId);
    if (t && !this.dragging && t.button === 0) this.on.tap(t.x, t.y);
    if (this.touches.size === 0) this.dragging = false;
    this.pinch = this.touches.size >= 2 ? this.spread() : 0;
  };

  private cancel = (e: PointerEvent) => {
    this.touches.delete(e.pointerId);
    if (this.touches.size === 0) this.dragging = false;
  };

  private leave = (e: PointerEvent) => {
    if (e.pointerType === "mouse" && this.touches.size === 0) this.on.leave();
  };

  private wheel = (e: WheelEvent) => {
    e.preventDefault();
    this.rig.zoomBy(Math.exp(clamp(e.deltaY, -120, 120) * 0.0016));
  };

  private menu = (e: MouseEvent) => e.preventDefault();

  private key = (e: KeyboardEvent) => {
    const target = e.target as HTMLElement | null;
    const typing = !!target && (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName));
    if (typing || e.metaKey || e.ctrlKey || e.altKey) return;
    const dir = TURN_KEYS[e.key.toLowerCase()];
    if (dir) this.rig.rotate(dir);
  };

  dispose() {
    const c = this.canvas;
    c.removeEventListener("pointerdown", this.down);
    c.removeEventListener("pointermove", this.move);
    c.removeEventListener("pointerup", this.up);
    c.removeEventListener("pointercancel", this.cancel);
    c.removeEventListener("pointerleave", this.leave);
    c.removeEventListener("wheel", this.wheel);
    c.removeEventListener("contextmenu", this.menu);
    window.removeEventListener("keydown", this.key);
  }
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
