/*
  파일명: components/features/game/myth/troy/scene/board.ts
  기능: 판 덩어리(칸·물·받침·소품)
  책임: 새 판을 받을 때마다 칸 기둥·물 면·디오라마 받침·소품을 한꺼번에 다시 짓고, 옛것을 푼다.
        칸·물 재질은 한 번만 만들어 판이 바뀌어도 이어 쓴다(셰이더를 다시 짜지 않는다).
*/ // ------------------------------
import { Group, type Mesh, type ShaderMaterial } from "three";
import type { BattleMap } from "../engine/types";
import type { Placement } from "./decorPlan";
import type { MoodLook } from "./lighting";
import type { ModelTemplate } from "./models";
import { buildPlinth, type PlinthLayer } from "./plinth";
import { PropLayer } from "./props";
import { createTileMaterial, type TileMaterial } from "./tileShader";
import { buildTiles, type TileLayer } from "./tiles";
import type { ModelName } from "./types";
import { buildWater } from "./water";
import { createWaterMaterial } from "./waterShader";

export class BoardMesh {
  readonly group = new Group();
  readonly props = new PropLayer();
  private readonly tileMaterial: TileMaterial = createTileMaterial();
  private readonly waterMaterial: ShaderMaterial = createWaterMaterial();
  private tiles: TileLayer | null = null;
  private plinth: PlinthLayer | null = null;
  private water: Mesh | null = null;
  private plinthSize = "";

  constructor() {
    this.group.add(this.props.group);
  }

  build(map: BattleMap, plan: Placement[], templates: Map<ModelName, ModelTemplate>, burned: Set<string>) {
    this.tiles?.dispose();
    this.tiles = buildTiles(map, this.tileMaterial);
    this.group.add(this.tiles.group);
    const size = `${map.width}x${map.height}`;
    if (size !== this.plinthSize) {
      this.plinth?.dispose();
      this.plinth = buildPlinth(map);
      this.plinthSize = size;
      this.group.add(this.plinth.group);
    }
    if (this.water) {
      this.group.remove(this.water);
      this.water.geometry.dispose();
    }
    this.water = buildWater(map, this.waterMaterial);
    if (this.water) this.group.add(this.water);
    this.props.build(plan, templates, burned);
  }

  setLook(look: MoodLook) {
    const u = this.waterMaterial.uniforms;
    u.uSunDir.value.copy(look.sunDir);
    u.uSunColor.value.copy(look.sunColor);
    u.uSky.value.copy(look.sky);
    u.uTint.value.copy(look.waterTint);
    u.uGlint.value = look.glint;
  }

  update(time: number) {
    this.waterMaterial.uniforms.uTime.value = time;
  }

  dispose() {
    this.tiles?.dispose();
    this.plinth?.dispose();
    this.water?.geometry.dispose();
    this.props.dispose();
    this.tileMaterial.material.dispose();
    this.waterMaterial.dispose();
    this.group.clear();
  }
}
