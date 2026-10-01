/*
  파일명: components/features/game/myth/troy/scene/plinth.ts
  기능: 디오라마 받침
  책임: 흙 단면(칸 기둥 옆면) 아래에 판보다 조금 큰 어두운 돌 받침판을 깔고, 윗면 둘레에 금빛 가는 선 하나를 두른다.
        받침 아래에는 부드러운 그림자 얼룩을 깔아 판이 허공에 뜬 것처럼 보이지 않게 한다.
*/ // ------------------------------
import { BoxGeometry, Color, Group, Mesh, MeshBasicMaterial, MeshStandardMaterial, PlaneGeometry } from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import type { BattleMap } from "../engine/types";
import { blobTexture } from "./fxTextures";
import { FLOOR_Y } from "./grid";
import { PLINTH } from "./palette";

const MARGIN = 0.34;
const THICK = 0.36;
const INSET = 0.15;
const LINE = 0.024;

export interface PlinthLayer {
  group: Group;
  dispose(): void;
}

export function buildPlinth(map: BattleMap): PlinthLayer {
  const group = new Group();
  const w = map.width + MARGIN * 2;
  const h = map.height + MARGIN * 2;
  const slabGeo = new RoundedBoxGeometry(w, THICK, h, 3, 0.07);
  slabGeo.translate(0, FLOOR_Y - THICK / 2 - 0.001, 0);
  const slabMat = new MeshStandardMaterial({ color: new Color(PLINTH.stone), roughness: 0.62, metalness: 0.08 });
  const slab = new Mesh(slabGeo, slabMat);
  slab.receiveShadow = true;
  group.add(slab);
  // 금빛 가는 선: 받침 윗면 둘레를 네 토막으로 두른다
  const goldMat = new MeshStandardMaterial({
    color: new Color(PLINTH.gold), roughness: 0.28, metalness: 0.9, emissive: new Color(PLINTH.gold), emissiveIntensity: 0.18,
  });
  const lw = w - INSET * 2;
  const lh = h - INSET * 2;
  const y = FLOOR_Y + 0.004;
  const bars: [number, number, number, number][] = [
    [lw, LINE, 0, -lh / 2], [lw, LINE, 0, lh / 2], [LINE, lh, -lw / 2, 0], [LINE, lh, lw / 2, 0],
  ];
  const lineGeos = bars.map(([sx, sz, x, z]) => {
    const geo = new BoxGeometry(sx, 0.008, sz);
    geo.translate(x, y, z);
    return geo;
  });
  lineGeos.forEach((geo) => group.add(new Mesh(geo, goldMat)));
  // 그림자 얼룩: 받침보다 한 칸 남짓 넓게, 화면 아래쪽(+z)으로 살짝 밀어 판 밑에 깔린 그늘로 보이게
  const blobGeo = new PlaneGeometry(w + 2.6, h + 2.6);
  blobGeo.rotateX(-Math.PI / 2);
  blobGeo.translate(0.25, FLOOR_Y - THICK - 0.05, 0.45);
  const blobMat = new MeshBasicMaterial({
    color: new Color(PLINTH.shadow), alphaMap: blobTexture(), transparent: true, opacity: 0.42, depthWrite: false, fog: false,
  });
  const blob = new Mesh(blobGeo, blobMat);
  blob.renderOrder = -1;
  group.add(blob);
  const dispose = () => {
    [slabGeo, blobGeo, ...lineGeos].forEach((g) => g.dispose());
    [slabMat, goldMat, blobMat].forEach((m) => m.dispose());
    group.clear();
  };
  return { group, dispose };
}
