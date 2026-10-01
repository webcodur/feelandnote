/*
  파일명: components/features/game/myth/troy/scene/lighting.ts
  기능: 분위기(mood)별 빛
  책임: 해(밤에는 달)·반구광·보조광의 색·세기·방향과 배경·안개·비침 환경·노출을 분위기마다 맞춘다.
        그림자 카메라는 판을 다 덮는 크기로 맞춘다. 횃불·화로 빛은 flames.ts가 맡는다.
*/ // ------------------------------
import {
  Color, DirectionalLight, Fog, HemisphereLight, Vector3, type Scene, type WebGLRenderer, type WebGLRenderTarget,
} from "three";
import type { BattleMap, Mood } from "../engine/types";
import { MOOD_COLORS } from "./palette";
import { buildEnvironment, skyTexture } from "./sky";

interface MoodLight {
  // 해의 올려 본 각·방위(도). 방위 0은 +Z(판 아래쪽)
  el: number;
  az: number;
  sun: number;
  hemi: number;
  fill: number;
  env: number;
  exposure: number;
  glint: number;
  flame: number;
}

const DEG = Math.PI / 180;
const MOOD_LIGHT: Record<Mood, MoodLight> = {
  day: { el: 52, az: -24, sun: 2.9, hemi: 0.95, fill: 0.35, env: 0.42, exposure: 1.0, glint: 1.0, flame: 0.2 },
  dusk: { el: 20, az: -112, sun: 2.8, hemi: 0.92, fill: 0.55, env: 0.42, exposure: 1.08, glint: 1.1, flame: 0.55 },
  dawn: { el: 19, az: 82, sun: 2.5, hemi: 0.82, fill: 0.42, env: 0.4, exposure: 1.05, glint: 0.95, flame: 0.4 },
  night: { el: 56, az: 28, sun: 0.9, hemi: 0.55, fill: 0.32, env: 0.3, exposure: 1.2, glint: 0.7, flame: 1 },
};

// 물·불빛 층이 받아 쓰는 분위기 값
export interface MoodLook {
  sunDir: Vector3;
  sunColor: Color;
  sky: Color;
  waterTint: Color;
  glint: number;
  flame: number;
}

export class Lighting {
  readonly sun = new DirectionalLight();
  readonly fill = new DirectionalLight();
  readonly hemi = new HemisphereLight();
  private readonly fog = new Fog(new Color(MOOD_COLORS.day.fog), 20, 60);
  private env: WebGLRenderTarget | null = null;
  private radius = 12;

  constructor(private readonly scene: Scene, private readonly renderer: WebGLRenderer, shadows: boolean) {
    this.sun.castShadow = shadows;
    this.sun.shadow.mapSize.set(2048, 2048);
    this.sun.shadow.bias = -0.0004;
    this.sun.shadow.normalBias = 0.022;
    this.sun.shadow.radius = 3;
    scene.add(this.sun, this.sun.target, this.fill, this.fill.target, this.hemi);
    scene.fog = this.fog;
  }

  // 그림자 카메라가 판 전체(높은 칸·말 키 포함)를 덮게 한다
  fit(map: BattleMap) {
    this.radius = Math.hypot(map.width, map.height) / 2 + 1.6;
    const cam = this.sun.shadow.camera;
    cam.left = -this.radius;
    cam.right = this.radius;
    cam.top = this.radius;
    cam.bottom = -this.radius;
    cam.near = 0.5;
    cam.far = this.radius * 2 + 40;
    cam.updateProjectionMatrix();
  }

  apply(mood: Mood): MoodLook {
    const light = MOOD_LIGHT[mood];
    const color = MOOD_COLORS[mood];
    const el = light.el * DEG;
    const az = light.az * DEG;
    const dir = new Vector3(Math.cos(el) * Math.sin(az), Math.sin(el), Math.cos(el) * Math.cos(az));
    this.sun.position.copy(dir).multiplyScalar(this.radius + 20);
    this.sun.color.set(color.sun);
    this.sun.intensity = light.sun;
    this.fill.position.set(-dir.x, 0.55, -dir.z).normalize().multiplyScalar(20);
    this.fill.color.set(color.fill);
    this.fill.intensity = light.fill;
    this.hemi.color.set(color.hemiSky);
    this.hemi.groundColor.set(color.hemiGround);
    this.hemi.intensity = light.hemi;
    this.scene.background = skyTexture(mood);
    this.fog.color.set(color.fog);
    this.env?.dispose();
    this.env = buildEnvironment(this.renderer, mood, dir);
    this.scene.environment = this.env.texture;
    this.scene.environmentIntensity = light.env;
    this.renderer.toneMappingExposure = light.exposure;
    return {
      sunDir: dir, sunColor: new Color(color.sun), sky: new Color(color.waterSky), waterTint: new Color(color.waterTint),
      glint: light.glint, flame: light.flame,
    };
  }

  // 카메라가 멀어지고 가까워져도 판 먼 쪽만 살짝 흐리게
  setFogRange(distance: number) {
    this.fog.near = distance * 0.95;
    this.fog.far = distance * 2.6;
  }

  dispose() {
    this.env?.dispose();
    this.env = null;
    this.sun.shadow.map?.dispose();
  }
}
