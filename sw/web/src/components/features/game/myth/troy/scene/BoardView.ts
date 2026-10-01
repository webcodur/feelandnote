/*
  파일명: components/features/game/myth/troy/scene/BoardView.ts
  기능: 트로이 전쟁 3D 전장(명령형 진입점)
  책임: 판 자료를 받아 디오라마로 그리고, 칸 누름·가리킴을 알리고, 연출을 약속(Promise)으로 돌려준다.
        그리기·연출은 안쪽 층(world·board·units·anims…)에 맡기고 여기서는 이어 주기만 한다.
*/ // ------------------------------
import type { BattleMap, Mood, Point } from "../engine/types";
import { playAnim } from "./anims";
import { planDecor } from "./decorPlan";
import { maxTop, surfaceAt, tileKey } from "./grid";
import { BoardInput } from "./input";
import { Lighting } from "./lighting";
import { loadModels, modelCounts } from "./models";
import { pickTile, rayAt } from "./picking";
import { Stage } from "./stage";
import { UNIT_MODEL_KEYS, type BoardStats, type BoardViewOptions, type HighlightLayer, type SceneAnim, type SceneUnit } from "./types";
import { World } from "./world";

export type { BoardStats, BoardViewOptions, HighlightLayer, SceneAnim, SceneUnit } from "./types";

export class BoardView {
  private readonly stage: Stage;
  private readonly lighting: Lighting;
  private readonly world: World;
  private readonly input: BoardInput;
  private map: BattleMap | null = null;
  private buildToken = 0;
  private ready: Promise<void> = Promise.resolve();
  private hoverAt: { x: number; y: number } | null = null;
  private hovered = "";
  private disposed = false;

  constructor(private readonly options: BoardViewOptions) {
    this.stage = new Stage(options.canvas, options.quality);
    this.lighting = new Lighting(this.stage.scene, this.stage.renderer, options.quality === "high");
    this.world = new World(this.stage.scene, options.reducedMotion);
    this.world.units.onModel = () => { this.stage.shadowsDirty = true; };
    this.input = new BoardInput(options.canvas, this.stage.rig, {
      tap: (x, y) => {
        const p = this.pick(x, y);
        if (p) options.onTileTap(p);
      },
      hover: (x, y) => { this.hoverAt = { x, y }; },
      leave: () => {
        this.hoverAt = null;
        this.emitHover(null);
      },
    });
    this.stage.onFrame = (dt, now) => this.frame(dt, now);
    this.setMood("day");
    this.resize();
  }

  // #region 판·말
  // 모델을 읽고 판을 짓는다. flags로 성문 열림(gate-open)을 반영한다
  setMap(map: BattleMap, flags: string[] = []): Promise<void> {
    const token = ++this.buildToken;
    const job = (async () => {
      const plan = planDecor(map, flags);
      const templates = await loadModels([...plan.map((p) => p.key), ...UNIT_MODEL_KEYS]);
      if (token !== this.buildToken || this.disposed) return;
      const fresh = !this.map || this.map.width !== map.width || this.map.height !== map.height;
      if (fresh) this.world.burned.clear();
      this.map = map;
      this.world.board.build(map, plan, templates, this.world.burned);
      this.world.units.setMap(map);
      this.world.highlights.setMap(map);
      this.world.pathLine.refresh(map);
      this.lighting.fit(map);
      this.stage.rig.setBoard(map.width, map.height, maxTop(map), fresh);
      // 새 판일 때만 판의 분위기를 따른다(지형만 바뀐 판은 지금 분위기를 지킨다)
      if (fresh) this.setMood(map.mood);
      this.world.refreshFlames();
      this.stage.shadowsDirty = true;
    })();
    this.ready = job;
    return job;
  }

  // 있는 말은 자리·체력·상태만 고친다(연출 없이)
  setUnits(units: SceneUnit[]) {
    this.world.units.setUnits(units);
    this.stage.shadowsDirty = true;
  }

  highlight(layer: HighlightLayer, tiles: Point[]) {
    this.world.highlights.set(layer, tiles);
  }

  clearHighlights(layer?: HighlightLayer) {
    this.world.highlights.clear(layer);
  }

  showPath(path: Point[] | null) {
    this.world.pathLine.set(this.map, path);
  }

  setCursor(p: Point | null) {
    this.world.highlights.setCursor(p);
  }

  setSelected(unitId: string | null) {
    this.world.units.select(unitId);
    this.stage.shadowsDirty = true;
  }

  // 연출이 끝나면 풀린다. 끝난 뒤 말의 자리·체력은 anim 값과 같다
  async play(anim: SceneAnim): Promise<void> {
    await this.ready;
    if (this.disposed || !this.map) return;
    await playAnim(this.world.animCtx(this.map, this.stage.rig), anim);
    this.stage.shadowsDirty = true;
  }
  // #endregion

  // #region 카메라·분위기
  rotate(dir: 1 | -1) {
    this.stage.rig.rotate(dir);
  }

  zoomBy(factor: number) {
    this.stage.rig.zoomBy(factor);
  }

  focusOn(p: Point, animate = true) {
    if (!this.map) return;
    const at = surfaceAt(this.map, p);
    this.stage.rig.focus(at.x, at.z, animate);
  }

  setMood(mood: Mood) {
    const look = this.lighting.apply(mood);
    this.world.board.setLook(look);
    this.world.flames.setLevel(look.flame);
    this.stage.shadowsDirty = true;
  }

  // 연출 빠르기(1 = 보통). 판 위 움직임·타격·글자가 모두 이 몫만큼 빨리 흐른다
  get speed(): number { return this.world.tweens.scale; }
  setSpeed(scale: number) { this.world.tweens.scale = scale; }

  setAutoOrbit(on: boolean) {
    this.stage.rig.autoOrbit = on;
  }

  // 칸 윗면 가운데의 캔버스 안 좌표(CSS 픽셀). 카메라 뒤면 null
  screenOf(p: Point): { x: number; y: number } | null {
    if (!this.map) return null;
    const v = surfaceAt(this.map, p).project(this.stage.rig.camera);
    if (v.z > 1) return null;
    const c = this.options.canvas;
    return { x: ((v.x + 1) / 2) * c.clientWidth, y: ((1 - v.y) / 2) * c.clientHeight };
  }
  // #endregion

  // #region 바탕
  resize() {
    this.stage.resize();
    this.world.setPointScale(this.stage.renderer.domElement.height, this.stage.rig.camera.fov);
  }

  // 검수·성능 관찰용(명세 밖 덧붙임)
  stats(): BoardStats {
    return { ...this.stage.stats(), models: modelCounts() };
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.buildToken += 1;
    this.stage.stop();
    this.input.dispose();
    this.world.dispose();
    this.lighting.dispose();
    this.stage.dispose();
  }
  // #endregion

  // #region 안쪽
  private pick(x: number, y: number): Point | null {
    if (!this.map) return null;
    const c = this.options.canvas;
    return pickTile(this.map, rayAt(this.stage.rig.camera, x, y, c.clientWidth, c.clientHeight), this.world.units.all(), this.stage.rig.camera);
  }

  private emitHover(p: Point | null) {
    const key = p ? tileKey(p.x, p.y) : "";
    if (key === this.hovered) return;
    this.hovered = key;
    this.options.onTileHover(p);
  }

  private frame(dt: number, now: number) {
    this.world.update(dt, now);
    this.lighting.setFogRange(this.stage.rig.distance());
    if (this.hoverAt) this.emitHover(this.pick(this.hoverAt.x, this.hoverAt.y));
    if (this.world.busy()) this.stage.shadowsDirty = true;
  }
  // #endregion
}
