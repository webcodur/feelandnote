/*
  파일명: components/features/game/myth/troy/scene/highlights.ts
  기능: 강조 층과 커서
  책임: 칸 윗면 위에 얇게 뜬 판으로 이동·공격·회복·위험(빗금)·목표(깜빡임)·출진·구역을 층마다 따로 켜고 끈다.
        같은 층끼리 맞닿은 칸은 사이 테두리를 지워 한 덩이 영역으로 보이게 하고, 가리킨 칸은 흰 테두리로 표시한다.
*/ // ------------------------------
import {
  Color, Group, InstancedBufferAttribute, InstancedMesh, Matrix4, PlaneGeometry, ShaderMaterial,
} from "three";
import type { BattleMap, Point } from "../engine/types";
import { DIRS, surfaceY, tileAt, tileKey, worldX, worldZ } from "./grid";
import { HIGHLIGHT_COLOR } from "./palette";
import { HIGHLIGHT_LAYERS, type HighlightLayer } from "./types";

type LayerKey = HighlightLayer | "cursor";
// mode: 0 채움+테두리 · 1 빗금 · 2 깜빡이는 테두리 · 3 커서
const LOOK: Record<LayerKey, { mode: number; fill: number; edge: number; lift: number }> = {
  move: { mode: 0, fill: 0.44, edge: 1, lift: 0.012 },
  attack: { mode: 0, fill: 0.48, edge: 1, lift: 0.014 },
  heal: { mode: 0, fill: 0.44, edge: 1, lift: 0.016 },
  danger: { mode: 1, fill: 0.36, edge: 0.9, lift: 0.018 },
  target: { mode: 2, fill: 0.16, edge: 1, lift: 0.02 },
  deploy: { mode: 0, fill: 0.5, edge: 1, lift: 0.022 },
  zone: { mode: 0, fill: 0.44, edge: 1, lift: 0.024 },
  cursor: { mode: 3, fill: 0.14, edge: 1, lift: 0.028 },
};

const VERT = /* glsl */ `
attribute vec4 aEdges;
varying vec2 vUv;
varying vec4 vEdges;
varying vec2 vW;
void main() {
  vUv = uv;
  vEdges = aEdges;
  vec4 w = modelMatrix * instanceMatrix * vec4(position, 1.0);
  vW = w.xz;
  gl_Position = projectionMatrix * viewMatrix * w;
}
`;

const FRAG = /* glsl */ `
uniform vec3 uColor;
uniform float uMode;
uniform float uFill;
uniform float uEdge;
uniform float uTime;
uniform float uMotion;
varying vec2 vUv;
varying vec4 vEdges;
varying vec2 vW;
void main() {
  float big = 9.0;
  float dx = min(mix(vUv.x, big, vEdges.x), mix(1.0 - vUv.x, big, vEdges.y));
  float dy = min(mix(vUv.y, big, vEdges.z), mix(1.0 - vUv.y, big, vEdges.w));
  float r = 0.16;
  float e = (dx < r && dy < r) ? r - length(vec2(r - dx, r - dy)) : min(dx, dy);
  float m = 0.045;
  float inside = smoothstep(m, m + 0.012, e);
  if (inside <= 0.0) discard;
  float bw = uMode > 2.5 ? 0.07 : 0.055;
  float border = inside * (1.0 - smoothstep(m + bw, m + bw + 0.02, e));
  float t = uTime * uMotion;
  float fill = uFill * (1.0 + 0.14 * sin(t * 2.6));
  if (uMode > 0.5 && uMode < 1.5) fill *= 0.35 + 1.7 * step(0.5, fract((vW.x + vW.y) * 2.4 - t * 0.35));
  float edgeA = uEdge;
  if (uMode > 1.5 && uMode < 2.5) edgeA *= 0.45 + 0.55 * (0.5 + 0.5 * sin(uTime * 7.0 * uMotion + 1.57 * (1.0 - uMotion)));
  if (uMode > 2.5) edgeA *= 0.8 + 0.2 * sin(t * 4.0);
  vec3 edgeCol = mix(uColor, vec3(1.0), 0.5);
  // 밝은 모래·돌 위에서도 묻히지 않게 채움 색을 조금 짙게 누른다
  vec3 fillCol = uColor * 0.9;
  gl_FragColor = vec4(mix(fillCol, edgeCol, border), max(fill * inside, border * edgeA));
  #include <colorspace_fragment>
}
`;

interface Layer {
  mesh: InstancedMesh;
  edges: InstancedBufferAttribute;
  tiles: Point[];
}

export class Highlights {
  readonly group = new Group();
  private readonly layers = new Map<LayerKey, Layer>();
  private readonly time = { value: 0 };
  private map: BattleMap | null = null;
  private readonly m = new Matrix4();

  constructor(private readonly reduced: boolean) {}

  private layer(key: LayerKey, capacity: number): Layer {
    const old = this.layers.get(key);
    if (old && old.mesh.instanceMatrix.count >= capacity) return old;
    if (old) this.drop(old);
    const geo = new PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
    const edges = new InstancedBufferAttribute(new Float32Array(capacity * 4), 4);
    geo.setAttribute("aEdges", edges);
    const look = LOOK[key];
    const mat = new ShaderMaterial({
      vertexShader: VERT, fragmentShader: FRAG, transparent: true, depthWrite: false,
      uniforms: {
        uColor: { value: new Color(HIGHLIGHT_COLOR[key]) }, uMode: { value: look.mode }, uFill: { value: look.fill },
        uEdge: { value: look.edge }, uTime: this.time, uMotion: { value: this.reduced ? 0 : 1 },
      },
    });
    const mesh = new InstancedMesh(geo, mat, capacity);
    mesh.count = 0;
    mesh.frustumCulled = false;
    mesh.renderOrder = 3 + HIGHLIGHT_LAYERS.indexOf(key as HighlightLayer);
    const layer = { mesh, edges, tiles: old?.tiles ?? [] };
    this.layers.set(key, layer);
    this.group.add(mesh);
    return layer;
  }

  private drop(layer: Layer) {
    this.group.remove(layer.mesh);
    layer.mesh.geometry.dispose();
    (layer.mesh.material as ShaderMaterial).dispose();
    layer.mesh.dispose();
  }

  private fill(key: LayerKey, tiles: Point[]) {
    const map = this.map;
    const layer = this.layer(key, map ? Math.max(1, map.width * map.height) : 1);
    layer.tiles = tiles;
    if (!map) return;
    const inside = tiles.filter((p) => tileAt(map, p.x, p.y));
    const set = new Set(inside.map((p) => tileKey(p.x, p.y)));
    const order = [3, 1, 0, 2];
    inside.forEach((p, i) => {
      const tile = tileAt(map, p.x, p.y);
      this.m.makeTranslation(worldX(map, p.x), (tile ? surfaceY(tile) : 0) + LOOK[key].lift, worldZ(map, p.y));
      layer.mesh.setMatrixAt(i, this.m);
      const has = order.map((d) => (key !== "cursor" && set.has(tileKey(p.x + DIRS[d].x, p.y + DIRS[d].y)) ? 1 : 0));
      layer.edges.setXYZW(i, has[0], has[1], has[2], has[3]);
    });
    layer.mesh.count = inside.length;
    layer.mesh.instanceMatrix.needsUpdate = true;
    layer.edges.needsUpdate = true;
  }

  setMap(map: BattleMap) {
    this.map = map;
    this.layers.forEach((layer, key) => this.fill(key, layer.tiles));
  }

  set(key: HighlightLayer, tiles: Point[]) {
    this.fill(key, tiles);
  }

  clear(key?: HighlightLayer) {
    (key ? [key] : HIGHLIGHT_LAYERS).forEach((k) => this.fill(k, []));
  }

  setCursor(p: Point | null) {
    this.fill("cursor", p ? [p] : []);
  }

  update(time: number) {
    this.time.value = time;
  }

  dispose() {
    this.layers.forEach((layer) => this.drop(layer));
    this.layers.clear();
  }
}
