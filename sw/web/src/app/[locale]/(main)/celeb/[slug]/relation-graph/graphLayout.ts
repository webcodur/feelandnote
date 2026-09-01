import { DiagramBuilder, type CenterRay, type RowBranch } from "./diagramPrimitives";
import type {
  DiagramLabels, DiagramTheme, PersonNode, RelationFocus, RelationMode, RelationModel,
} from "./types";
const CENTER_X = 480;
const SIDE_BUS_OFFSET = 160;
const SIDE_NODE_OFFSET = 46;
const SIDE_COLUMN_GAP = 80;
const SIDE_ROW_GAP = 96;
const AXIS_COLUMN_GAP = 104;
const AXIS_ROW_GAP = 96;
const AXIS_LANE_OFFSET = 98;
const COMPACT_COLUMN_GAP = 96;
const COMPACT_ROW_GAP = 100;
interface LayoutViewport {
  compact: boolean;
  width: number;
}
const balancedRows = <T,>(items: T[], maxSize: number) => {
  const rowCount = Math.ceil(items.length / maxSize);
  if (!rowCount) return [];
  const baseSize = Math.floor(items.length / rowCount);
  const remainder = items.length % rowCount;
  let cursor = 0;
  return Array.from({ length: rowCount }, (_, index) => {
    const size = baseSize + (index < remainder ? 1 : 0);
    const row = items.slice(cursor, cursor + size);
    cursor += size;
    return row;
  });
};
const centeredXs = (centerX: number, count: number, gap: number) => Array.from(
  { length: count }, (_, index) => centerX + (index - (count - 1) / 2) * gap,
);
const sideColumns = (count: number) => count > 18 ? 4 : count > 2 ? 3 : 2;
const sideRowCount = (count: number) => count
  ? Math.ceil(count / sideColumns(count))
  : 0;
function visibleGroups(mode: RelationMode, model: RelationModel, focuses: RelationFocus[]) {
  const groups = mode === "family"
    ? {
      up: model.family.parents,
      left: model.family.siblings,
      right: model.family.spouses,
      down: model.family.children,
    }
    : {
      up: model.social.up,
      left: model.social.left,
      right: model.social.right,
      down: model.social.down,
    };
  const keys = mode === "family"
    ? { up: "parents", left: "siblings", right: "spouses", down: "children" } as const
    : { up: "up", left: "left", right: "right", down: "down" } as const;
  const visible = new Set(focuses);
  return {
    up: visible.has(keys.up) ? groups.up : [],
    left: visible.has(keys.left) ? groups.left : [],
    right: visible.has(keys.right) ? groups.right : [],
    down: visible.has(keys.down) ? groups.down : [],
  };
}
export function graphStageHeight(mode: RelationMode, model: RelationModel, focuses: RelationFocus[]) {
  const groups = visibleGroups(mode, model, focuses);
  const sideGroups = [groups.left.length, groups.right.length];
  const axisGroups = [groups.up.length, groups.down.length];
  const longestWing = Math.max(0, ...sideGroups.map(sideRowCount));
  const deepestAxis = Math.max(0, ...axisGroups.map((count) => Math.ceil(count / 7)));
  const sideBase = deepestAxis ? 264 : 192;
  const sideHeight = longestWing ? sideBase + longestWing * SIDE_ROW_GAP : 0;
  const axisHeight = deepestAxis ? 360 + deepestAxis * AXIS_ROW_GAP * 2 : 0;
  return Math.max(360, sideHeight, axisHeight);
}
function connectWing(builder: DiagramBuilder, origin: string, rows: RowBranch[], centerY: number) {
  const upper = rows.filter((row) => row.y < centerY).sort((a, b) => b.y - a.y);
  const lower = rows.filter((row) => row.y >= centerY).sort((a, b) => a.y - b.y);
  builder.connectChain(origin, upper);
  builder.connectChain(origin, lower);
}
function addSideWing(
  builder: DiagramBuilder, id: string, people: PersonNode[], centerY: number, side: "left" | "right",
) {
  if (!people.length) return;
  const columns = sideColumns(people.length);
  const rows = balancedRows(people, columns);
  const direction = side === "left" ? -1 : 1;
  const busX = CENTER_X + direction * SIDE_BUS_OFFSET;
  const firstY = centerY - ((rows.length - 1) * SIDE_ROW_GAP) / 2;
  const branches = rows.map((row, rowIndex) => {
    const nodeY = firstY + rowIndex * SIDE_ROW_GAP;
    const busY = nodeY + (nodeY < centerY ? 49 : -49);
    const centeringOffset = side === "left" ? (columns - row.length) * SIDE_COLUMN_GAP / 2 : 0;
    const xs = row.map((_, columnIndex) => (
      busX + direction * (SIDE_NODE_OFFSET + centeringOffset + columnIndex * SIDE_COLUMN_GAP)
    ));
    return builder.horizontalRow(`${id}:${rowIndex}`, row, nodeY, busY, busX, xs);
  }).filter((row): row is RowBranch => Boolean(row));
  const ids = people.map(({ id: personId }) => personId);
  const origin = builder.junction(`${id}:origin`, busX, centerY, ids);
  builder.edge("center", origin, ids);
  connectWing(builder, origin, branches, centerY);
}
function addAxisWing(
  builder: DiagramBuilder, id: string, people: PersonNode[], height: number, side: "up" | "down",
) {
  if (!people.length) return;
  const rows = balancedRows(people, 7);
  const direction = side === "up" ? -1 : 1;
  const outerY = side === "up" ? 84 : height - 84;
  const branches = rows.map((row, index) => {
    const depth = side === "up" ? index : rows.length - index - 1;
    const nodeY = outerY - direction * depth * AXIS_ROW_GAP;
    const busY = nodeY - direction * 49;
    return builder.horizontalRow(
      `${id}:${index}`, row, nodeY, busY, CENTER_X, centeredXs(CENTER_X, row.length, AXIS_COLUMN_GAP),
    );
  }).filter((row): row is RowBranch => Boolean(row));
  const ordered = side === "up" ? [...branches].reverse() : branches;
  builder.connectChain("center", ordered);
}
function addSharedStructure(
  builder: DiagramBuilder, mode: RelationMode, model: RelationModel, focuses: RelationFocus[], centerName: string,
  centerAvatarUrl: string | null, labels: DiagramLabels,
) {
  const height = graphStageHeight(mode, model, focuses);
  const centerY = height / 2;
  const groups = visibleGroups(mode, model, focuses);
  const groupLabels = mode === "family"
    ? { up: labels.parents, left: labels.siblings, right: labels.spouses, down: labels.children }
    : { up: labels.up, left: labels.left, right: labels.right, down: labels.down };
  const rays = (Object.keys(groups) as CenterRay[]).filter((key) => groups[key].length);
  builder.center(centerName, centerAvatarUrl, CENTER_X, centerY, rays);
  builder.lane("lane:up", groupLabels.up, groups.up.length, CENTER_X, centerY - AXIS_LANE_OFFSET, groups.up.map(({ id }) => id));
  builder.lane("lane:left", groupLabels.left, groups.left.length, CENTER_X - 124, centerY, groups.left.map(({ id }) => id), true);
  builder.lane("lane:right", groupLabels.right, groups.right.length, CENTER_X + 124, centerY, groups.right.map(({ id }) => id), true);
  builder.lane("lane:down", groupLabels.down, groups.down.length, CENTER_X, centerY + AXIS_LANE_OFFSET, groups.down.map(({ id }) => id));
  addAxisWing(builder, `${mode}:up`, groups.up, height, "up");
  addSideWing(builder, `${mode}:left`, groups.left, centerY, "left");
  addSideWing(builder, `${mode}:right`, groups.right, centerY, "right");
  addAxisWing(builder, `${mode}:down`, groups.down, height, "down");
}
function addCompactFocusedStructure(
  builder: DiagramBuilder, mode: RelationMode, model: RelationModel, focuses: RelationFocus[],
  centerName: string, centerAvatarUrl: string | null, labels: DiagramLabels, viewportWidth: number,
) {
  const groups = visibleGroups(mode, model, focuses);
  const groupLabels = mode === "family"
    ? { up: labels.parents, left: labels.siblings, right: labels.spouses, down: labels.children }
    : { up: labels.up, left: labels.left, right: labels.right, down: labels.down };
  const selected = (["up", "left", "right", "down"] as const)
    .map((key) => ({ key, people: groups[key], label: groupLabels[key] }))
    .find(({ people }) => people.length);
  if (!selected) {
    builder.center(centerName, centerAvatarUrl, viewportWidth / 2, 180, []);
    return;
  }
  const { key, people, label } = selected;
  const columns = Math.min(people.length, people.length > 9 ? 4 : 3);
  const rows = balancedRows(people, columns);
  const centerX = viewportWidth / 2;
  const placesAbove = key === "up";
  const firstRowY = placesAbove ? 56 : 286;
  const centerY = placesAbove
    ? firstRowY + (rows.length - 1) * COMPACT_ROW_GAP + 190
    : 96;
  const direction = placesAbove ? -1 : 1;
  const branches = rows.map((row, index) => {
    const nodeY = firstRowY + index * COMPACT_ROW_GAP;
    const busY = nodeY - direction * 49;
    return builder.horizontalRow(
      `compact:${mode}:${key}:${index}`, row, nodeY, busY, centerX,
      centeredXs(centerX, row.length, COMPACT_COLUMN_GAP),
    );
  }).filter((row): row is RowBranch => Boolean(row));
  builder.center(centerName, centerAvatarUrl, centerX, centerY, [placesAbove ? "up" : "down"]);
  builder.lane(
    `lane:${key}`, label, people.length, centerX, centerY + direction * 105,
    people.map(({ id }) => id),
  );
  builder.connectChain("center", placesAbove ? [...branches].reverse() : branches);
}
export function buildGraphData(
  mode: RelationMode, model: RelationModel, focuses: RelationFocus[], centerName: string,
  centerAvatarUrl: string | null, labels: DiagramLabels, theme: DiagramTheme, viewport?: LayoutViewport,
) {
  const builder = new DiagramBuilder(theme);
  if (viewport?.compact && focuses.length === 1) {
    addCompactFocusedStructure(
      builder, mode, model, focuses, centerName, centerAvatarUrl, labels, viewport.width,
    );
  } else {
    addSharedStructure(builder, mode, model, focuses, centerName, centerAvatarUrl, labels);
  }
  return builder.data;
}
