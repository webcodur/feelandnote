/*
  파일명: components/features/game/myth/troy/scene/fallbackUnits.ts
  기능: 장수 말 대신 그리기
  책임: GLB가 아직 없을 때 장수 말 14종을 간단한 도형으로 조립한다. 보드게임 말처럼 머리·투구·방패·무기를 크게 과장하고,
        재질 이름(TEAM·BRONZE…)은 GLB 규격과 같게 둔다. 원점은 발밑 가운데, 앞은 +Z, 키 0.72~0.85(신은 1.3배).
*/ // ------------------------------
import type { Group } from "three";
import type { ModelKey } from "../engine/types";
import type { MaterialName } from "./materials";
import { assemble, HALF_PI, type Part } from "./shapes";

type Head = "helm" | "cap" | "crown" | "band" | "leather" | "bare";
type Weapon = "spear" | "longSpear" | "bow" | "javelins" | "sword" | "staff" | "trident" | "scepter" | "none";

interface Kit {
  head: Head;
  crest?: "normal" | "tall";
  shield?: "round" | "boss" | "pelta";
  weapon: Weapon;
  body?: MaterialName;
  armor?: boolean;
  robe?: boolean;
  cape?: boolean;
  halo?: boolean;
  bag?: boolean;
  quiver?: boolean;
  trim?: boolean;
}

const HEADS: Record<Head, Part[]> = {
  helm: [["hemi", "BRONZE", [0, 0.54, 0], [0.2, 0.21, 0.2]], ["box", "BRONZE", [0, 0.5, 0.055], [0.15, 0.1, 0.05]]],
  cap: [["cone", "TEAM", [0, 0.65, 0.03], [0.18, 0.2, 0.18], [0.45, 0, 0]], ["torus", "TEAM_DARK", [0, 0.575, 0], [0.18, 0.18, 0.25], [HALF_PI, 0, 0]]],
  crown: [["torus", "GOLD", [0, 0.6, 0], [0.19, 0.19, 0.45], [HALF_PI, 0, 0]], ["cone", "GOLD", [0, 0.64, 0.07], [0.05, 0.07, 0.05]]],
  band: [["hemi", "LEATHER", [0, 0.55, -0.01], [0.18, 0.13, 0.18]], ["torus", "TEAM_DARK", [0, 0.575, 0], [0.18, 0.18, 0.22], [HALF_PI, 0, 0]]],
  leather: [["hemi", "LEATHER", [0, 0.555, 0], [0.19, 0.15, 0.19]]],
  bare: [["hemi", "LEATHER", [0, 0.56, -0.012], [0.18, 0.12, 0.18]]],
};

const CRESTS: Record<"normal" | "tall", Part[]> = {
  normal: [["box", "TEAM", [0, 0.69, -0.01], [0.04, 0.1, 0.24]], ["box", "BRONZE", [0, 0.64, 0], [0.03, 0.04, 0.05]]],
  tall: [["box", "TEAM", [0, 0.74, -0.03], [0.045, 0.17, 0.28]], ["box", "BRONZE", [0, 0.65, 0], [0.035, 0.06, 0.05]]],
};

const SHIELDS: Record<"round" | "boss" | "pelta", Part[]> = {
  round: [["disc", "TEAM", [0.155, 0.35, 0.07], [0.36, 0.035, 0.36], [HALF_PI, 0, 0]], ["torus", "BRONZE", [0.155, 0.35, 0.09], [0.35, 0.35, 0.35]]],
  boss: [
    ["disc", "TEAM", [0.16, 0.35, 0.07], [0.4, 0.035, 0.4], [HALF_PI, 0, 0]], ["torus", "BRONZE", [0.16, 0.35, 0.09], [0.39, 0.39, 0.4]],
    ["sphere", "BRONZE", [0.16, 0.35, 0.1], [0.1, 0.1, 0.05]],
  ],
  pelta: [["disc", "TEAM", [0.15, 0.36, 0.07], [0.3, 0.03, 0.26], [HALF_PI, 0, 0]], ["arc", "BRONZE", [0.15, 0.33, 0.085], [0.27, 0.27, 0.4], [0, 0, Math.PI]]],
};

const WEAPONS: Record<Weapon, Part[]> = {
  spear: [["cyl", "WOOD", [-0.17, 0.41, 0.03], [0.022, 0.74, 0.022]], ["cone", "BRONZE", [-0.17, 0.81, 0.03], [0.042, 0.08, 0.042]]],
  longSpear: [["cyl", "WOOD", [-0.18, 0.43, 0.03], [0.024, 0.78, 0.024]], ["cone", "BRONZE", [-0.18, 0.86, 0.03], [0.05, 0.1, 0.05]]],
  bow: [["arc", "WOOD", [0.15, 0.4, 0.07], [0.22, 0.34, 0.6], [0, 0, -HALF_PI]], ["cyl", "CLOTH", [0.15, 0.4, 0.07], [0.008, 0.34, 0.008]]],
  javelins: [
    ["cyl", "WOOD", [-0.16, 0.4, 0.02], [0.016, 0.66, 0.016], [0, 0, 0.08]], ["cyl", "WOOD", [-0.2, 0.39, 0.0], [0.016, 0.64, 0.016], [0, 0, -0.06]],
    ["cone", "BRONZE", [-0.186, 0.74, 0.02], [0.03, 0.06, 0.03]],
  ],
  sword: [["box", "BRONZE", [-0.16, 0.28, 0.07], [0.035, 0.22, 0.014], [0.25, 0, 0]], ["box", "GOLD", [-0.16, 0.39, 0.04], [0.08, 0.02, 0.03]]],
  staff: [["cyl", "WOOD", [-0.16, 0.4, 0.04], [0.024, 0.78, 0.024]], ["ico", "LEAF", [-0.16, 0.8, 0.04], [0.11, 0.09, 0.11]]],
  trident: [
    ["cyl", "GOLD", [-0.18, 0.42, 0.03], [0.024, 0.78, 0.024]], ["box", "GOLD", [-0.18, 0.8, 0.03], [0.14, 0.02, 0.02]],
    ["cone", "GOLD", [-0.235, 0.85, 0.03], [0.025, 0.08, 0.025]], ["cone", "GOLD", [-0.18, 0.87, 0.03], [0.03, 0.1, 0.03]],
    ["cone", "GOLD", [-0.125, 0.85, 0.03], [0.025, 0.08, 0.025]],
  ],
  scepter: [["cyl", "GOLD", [-0.16, 0.36, 0.05], [0.02, 0.62, 0.02]], ["sphere", "GOLD", [-0.16, 0.69, 0.05], 0.06]],
  none: [],
};

// 사람 모양 말 하나를 부품 표로 짠다
function figure(kit: Kit): Part[] {
  const body = kit.body ?? "CLOTH";
  const parts: Part[] = [
    ["cyl", "SKIN", [0.05, 0.08, 0], [0.07, 0.16, 0.07]], ["cyl", "SKIN", [-0.05, 0.08, 0], [0.07, 0.16, 0.07]],
    ["cyl", "BRONZE", [0.05, 0.05, 0.004], [0.08, 0.09, 0.08]], ["cyl", "BRONZE", [-0.05, 0.05, 0.004], [0.08, 0.09, 0.08]],
    ["taper", body, [0, 0.2, 0], [0.27, 0.15, 0.24]],
    ["cyl", kit.armor ? "BRONZE" : body, [0, 0.35, 0], [0.22, 0.18, 0.19]],
    ["cyl", "LEATHER", [0, 0.275, 0], [0.228, 0.03, 0.198]],
    ["sphere", "SKIN", [0.135, 0.4, 0], 0.075], ["sphere", "SKIN", [-0.135, 0.4, 0], 0.075],
    ["sphere", "SKIN", [0, 0.53, 0], [0.17, 0.18, 0.17]],
    ...HEADS[kit.head],
    ...(kit.crest ? CRESTS[kit.crest] : []),
    ...(kit.shield ? SHIELDS[kit.shield] : []),
    ...WEAPONS[kit.weapon],
  ];
  if (kit.robe) parts.push(["taper", body, [0, 0.19, 0], [0.31, 0.38, 0.29]]);
  if (kit.trim) parts.push(["torus", "GOLD", [0, 0.02, 0], [0.3, 0.3, 0.3], [HALF_PI, 0, 0]]);
  if (kit.cape) parts.push(["box", "TEAM_DARK", [0, 0.29, -0.11], [0.27, 0.44, 0.03], [0.14, 0, 0]]);
  if (kit.halo) parts.push(["torus", "GLOW", [0, 0.57, -0.1], [0.36, 0.36, 0.2]]);
  if (kit.bag) parts.push(["box", "LEATHER", [0.14, 0.27, 0.02], [0.08, 0.11, 0.13]], ["box", "LEATHER", [0, 0.36, 0], [0.23, 0.02, 0.2], [0, 0, 0.6]]);
  if (kit.quiver) parts.push(["cyl", "LEATHER", [-0.04, 0.43, -0.12], [0.075, 0.26, 0.075], [0.3, 0, 0.35]]);
  return parts;
}

// 부품 표를 옮기고 줄인다(전차 몰이꾼·기병을 말 위에 앉힐 때)
function shift(parts: Part[], dx: number, dy: number, dz: number, k: number): Part[] {
  return parts.map(([kind, mat, p, s, r]) => {
    const size = typeof s === "number" ? s * k : ([s[0] * k, s[1] * k, s[2] * k] as [number, number, number]);
    return [kind, mat, [p[0] * k + dx, p[1] * k + dy, p[2] * k + dz], size, r];
  });
}

const horse = (x: number, z: number, k: number): Part[] => shift([
  ["box", "HORSE", [0, 0.25, 0], [0.13, 0.15, 0.4]],
  ["cyl", "HORSE", [0.045, 0.1, 0.13], [0.04, 0.2, 0.04]], ["cyl", "HORSE", [-0.045, 0.1, 0.13], [0.04, 0.2, 0.04]],
  ["cyl", "HORSE", [0.045, 0.1, -0.13], [0.04, 0.2, 0.04]], ["cyl", "HORSE", [-0.045, 0.1, -0.13], [0.04, 0.2, 0.04]],
  ["box", "HORSE", [0, 0.37, 0.19], [0.08, 0.2, 0.09], [0.5, 0, 0]], ["box", "HORSE", [0, 0.45, 0.27], [0.075, 0.075, 0.15]],
  ["box", "LEATHER", [0, 0.44, 0.17], [0.03, 0.12, 0.08], [0.5, 0, 0]], ["cone", "LEATHER", [0, 0.24, -0.23], [0.05, 0.14, 0.05], [-2.4, 0, 0]],
], x, 0, z, k);

const chariot = (): Part[] => [
  ["box", "WOOD", [0, 0.2, -0.13], [0.36, 0.14, 0.24]], ["box", "TEAM", [0, 0.24, -0.13], [0.38, 0.08, 0.2]],
  ["torus", "WOOD", [0.21, 0.13, -0.15], [0.27, 0.27, 0.45], [0, HALF_PI, 0]], ["torus", "WOOD", [-0.21, 0.13, -0.15], [0.27, 0.27, 0.45], [0, HALF_PI, 0]],
  ["cyl", "WOOD", [0, 0.13, -0.15], [0.03, 0.46, 0.03], [0, 0, HALF_PI]], ["cyl", "WOOD", [0, 0.16, 0.1], [0.025, 0.4, 0.025], [HALF_PI, 0, 0]],
  ...horse(0.1, 0.24, 0.72), ...horse(-0.1, 0.24, 0.72),
  ...shift(figure({ head: "helm", crest: "normal", weapon: "spear", armor: true }), 0, 0.12, -0.14, 0.8),
];

const rider = (): Part[] => [
  ...horse(0, 0, 1.05),
  ...shift(figure({ head: "helm", crest: "tall", shield: "pelta", weapon: "spear", body: "TEAM_DARK" }).slice(4), 0, 0.2, -0.02, 0.8),
];

const riverGod = (): Part[] => [
  ["taper", "WATER", [0, 0.28, 0], [0.42, 0.56, 0.42]], ["torus", "WATER", [0, 0.16, 0], [0.46, 0.46, 0.7], [HALF_PI, 0, 0]],
  ["torus", "WATER", [0, 0.4, 0], [0.34, 0.34, 0.6], [HALF_PI, 0, 0.4]], ["cyl", "WATER", [0, 0.7, 0], [0.28, 0.3, 0.24]],
  ["sphere", "WATER", [0.18, 0.78, 0], 0.11], ["sphere", "WATER", [-0.18, 0.78, 0], 0.11], ["sphere", "WATER", [0, 0.96, 0], 0.2],
  ["ico", "LEAF", [0, 1.1, -0.02], [0.24, 0.12, 0.22]], ["cone", "LEAF_DARK", [0, 0.9, 0.08], [0.12, 0.12, 0.06], [Math.PI, 0, 0]],
];

const BUILDERS: Record<ModelKey, () => Part[]> = {
  hoplite: () => figure({ head: "helm", crest: "normal", shield: "round", weapon: "spear", armor: true }),
  hero: () => figure({ head: "helm", crest: "tall", shield: "boss", weapon: "longSpear", armor: true, cape: true }),
  king: () => figure({ head: "crown", weapon: "scepter", body: "TEAM", robe: true, cape: true, shield: undefined }),
  archer: () => figure({ head: "cap", weapon: "bow", body: "TEAM_DARK", quiver: true }),
  skirmisher: () => figure({ head: "leather", shield: "pelta", weapon: "javelins" }),
  chariot,
  rider,
  seer: () => figure({ head: "band", weapon: "staff", robe: true }),
  healer: () => figure({ head: "leather", weapon: "sword", bag: true, body: "CLOTH" }),
  godWarrior: () => figure({ head: "helm", crest: "tall", shield: "boss", weapon: "longSpear", armor: true, halo: true, trim: true }),
  godArcher: () => figure({ head: "band", weapon: "bow", halo: true, trim: true, quiver: true }),
  godRobed: () => figure({ head: "crown", weapon: "none", robe: true, halo: true, trim: true }),
  godTrident: () => figure({ head: "crown", weapon: "trident", body: "TEAM_DARK", robe: true, halo: true, trim: true }),
  riverGod,
};

const SCALE: Partial<Record<ModelKey, number>> = { hero: 1.07, godWarrior: 1.3, godArcher: 1.3, godRobed: 1.3, godTrident: 1.3 };

export function fallbackUnit(key: ModelKey): Group {
  return assemble(BUILDERS[key](), SCALE[key] ?? 1);
}
