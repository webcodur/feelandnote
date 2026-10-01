/*
  파일명: components/features/game/myth/troy/scene/flames.ts
  기능: 불빛 층(횃불·화로·탄 배)
  책임: 불 자리마다 빛 번짐 스프라이트를 띄워 일렁이게 하고, 밤이면 서로 멀리 떨어진 불 넷까지만 점광원을 켠다.
        나머지 불은 방출 재질과 번짐 스프라이트로만 빛나 보이게 해 셰이더 비용을 묶어 둔다.
*/ // ------------------------------
import { AdditiveBlending, Color, Group, PointLight, Sprite, SpriteMaterial, type Vector3 } from "three";
import { glowTexture } from "./fxTextures";
import { FX } from "./palette";

const MAX_LIGHTS = 4;

export class Flames {
  readonly group = new Group();
  private readonly material = new SpriteMaterial({
    map: glowTexture(), color: new Color(FX.torch), blending: AdditiveBlending, depthWrite: false, transparent: true, toneMapped: false,
  });
  private readonly lights: PointLight[] = [];
  private glows: Sprite[] = [];
  private sources: Vector3[] = [];
  private level = 0;

  constructor() {
    for (let i = 0; i < MAX_LIGHTS; i += 1) {
      const light = new PointLight(new Color(FX.torchLight), 0, 4.6, 1.4);
      light.visible = false;
      this.lights.push(light);
      this.group.add(light);
    }
  }

  setSources(points: Vector3[]) {
    this.glows.forEach((g) => this.group.remove(g));
    this.sources = points.map((p) => p.clone());
    this.glows = this.sources.map((p) => {
      const sprite = new Sprite(this.material);
      sprite.position.copy(p);
      sprite.renderOrder = 5;
      this.group.add(sprite);
      return sprite;
    });
    this.placeLights();
  }

  // 0 낮 → 1 밤. 밤에만 점광원을 켠다(켜고 끌 때 셰이더가 한 번 다시 짜인다)
  setLevel(level: number) {
    this.level = level;
    this.material.opacity = 0.22 + level * 0.5;
    this.placeLights();
  }

  // 서로 가장 멀리 떨어진 불을 차례로 골라 점광원을 단다
  private placeLights() {
    const picked: Vector3[] = [];
    const pool = [...this.sources];
    while (picked.length < MAX_LIGHTS && pool.length > 0) {
      const score = (p: Vector3) => (picked.length === 0 ? -p.length() : Math.min(...picked.map((q) => q.distanceTo(p))));
      pool.sort((a, b) => score(b) - score(a));
      picked.push(pool.shift() as Vector3);
    }
    const on = this.level > 0.5;
    this.lights.forEach((light, i) => {
      const at = picked[i];
      light.visible = on && !!at;
      if (at) light.position.set(at.x, at.y + 0.32, at.z);
    });
  }

  update(time: number) {
    this.glows.forEach((g, i) => {
      const flicker = 0.88 + Math.sin(time * 9.1 + i * 1.7) * 0.07 + Math.sin(time * 23.3 + i * 3.1) * 0.05;
      g.scale.setScalar((0.34 + this.level * 0.4) * flicker);
    });
    this.lights.forEach((light, i) => {
      light.intensity = light.visible ? 1.5 * (0.86 + Math.sin(time * 11.3 + i * 2.3) * 0.08 + Math.sin(time * 27.1 + i) * 0.06) : 0;
    });
  }

  dispose() {
    this.material.dispose();
    this.lights.forEach((light) => light.dispose());
    this.group.clear();
  }
}
