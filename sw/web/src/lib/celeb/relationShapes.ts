/*
  파일명: /lib/celeb/relationShapes.ts
  기능: 관계가 많은 인물·맞수·무리에서 탐색기 시작점을 고른다.
  책임: 화면에 별도 그래프를 만들지 않고, 방문자가 관계 탐색을 시작할 인물만 고른다.
*/

export interface ShapeCandidate {
  id: string;
  slug: string | null;
  nickname: string;
  nicknameEn: string | null;
  avatarUrl: string | null;
  title: string | null;
  titleEn: string | null;
  birthYear: number | null;
  influence: number;
}

export type ShapeLinkKind = "mentor" | "influence";

export interface ShapeRelationInput {
  fromId: string;
  toId: string;
  relType: string;
  note?: string | null;
  noteEn?: string | null;
}

/** 한 사람에게서 뻗어나갔거나 한 사람에게로 모여든 갈래 */
export interface RelationFan {
  id: string;
  center: ShapeCandidate;
  /** out = 이 사람에게서 뻗어나갔다, in = 이 사람에게로 모여들었다 */
  direction: "out" | "in";
  spokes: { celeb: ShapeCandidate; kind: ShapeLinkKind; note: string | null; noteEn: string | null }[];
  /** 잘라내기 전의 전체 수. 「33명 중 10명」을 적기 위한 값 */
  total: number;
}

/** 서로 맞선 두 사람 */
export interface RelationRivalry {
  id: string;
  a: ShapeCandidate;
  b: ShapeCandidate;
  note: string | null;
  noteEn: string | null;
}

/** 같은 자리에 함께 있던 사람들 */
export interface RelationCircle {
  id: string;
  members: ShapeCandidate[];
  /** 무리를 설명하는 한 줄. 회사·그룹 이름이 문장 안에 들어 있다 */
  note: string | null;
  noteEn: string | null;
}

/** 방향이 있는 관계 — 갈래를 이룬다 */
const FLOW_TYPES = new Set(["teacher", "student", "influence", "influenced"]);

/** 한자리에 함께 있던 사이 — 무리를 이룬다 */
const CIRCLE_TYPES = new Set(["colleague", "cofounder"]);

/** 창업 동료는 같은 팀 동료보다 이야기가 많다. 무리를 고를 때 먼저 본다 */
const FOUNDING_TYPE = "cofounder";

const MENTOR_TYPES = new Set(["teacher", "student"]);

/** 세울 수 있는 인물인가 — 이동할 주소와 얼굴이 있어야 한다 */
function isPlaceable(candidate: ShapeCandidate): boolean {
  return Boolean(candidate.slug) && Boolean(candidate.avatarUrl);
}

interface DirectedLink {
  giver: string;
  taker: string;
  kind: ShapeLinkKind;
  note: string | null;
  noteEn: string | null;
}

/**
 * 준 사람에서 받은 사람으로 향하는 관계만 남긴다.
 * 원장은 같은 사이를 양방향 두 행으로 적으므로 한 쌍을 하나로 접는다.
 */
function directedLinks(
  relations: readonly ShapeRelationInput[],
  byId: Map<string, ShapeCandidate>,
): DirectedLink[] {
  const merged = new Map<string, DirectedLink>();

  for (const relation of relations) {
    if (!FLOW_TYPES.has(relation.relType)) continue;

    // teacher·influence는 to_id가 준 사람, student·influenced는 from_id가 준 사람이다
    const reversed = relation.relType === "teacher" || relation.relType === "influence";
    const giver = reversed ? relation.toId : relation.fromId;
    const taker = reversed ? relation.fromId : relation.toId;
    if (giver === taker) continue;
    if (!byId.has(giver) || !byId.has(taker)) continue;

    const candidate: DirectedLink = {
      giver,
      taker,
      kind: MENTOR_TYPES.has(relation.relType) ? "mentor" : "influence",
      note: relation.note?.trim() || null,
      noteEn: relation.noteEn?.trim() || null,
    };

    const key = `${giver}|${taker}`;
    const previous = merged.get(key);
    if (!previous) {
      merged.set(key, candidate);
      continue;
    }
    // 사제가 영향보다 또렷하고, 설명이 있는 행이 없는 행보다 낫다
    const better =
      (candidate.kind === "mentor" && previous.kind === "influence") ||
      (candidate.kind === previous.kind && Boolean(candidate.note) && !previous.note);
    if (better) merged.set(key, candidate);
  }

  return [...merged.values()];
}

/** 영향력 큰 사람이 앞에 서고, 같으면 늘 같은 차례가 나오게 id로 가른다 */
function byInfluence(a: ShapeCandidate, b: ShapeCandidate): number {
  if (a.influence !== b.influence) return b.influence - a.influence;
  return a.id.localeCompare(b.id);
}

interface FanInput {
  relations: readonly ShapeRelationInput[];
  candidates: readonly ShapeCandidate[];
  /** 뽑을 갈래 수 — 방향마다 이만큼 */
  countPerDirection: number;
  /** 한 갈래에 세울 최대 인원 */
  spokeLimit: number;
  /** 이보다 갈래가 적으면 그래프로 볼 것이 없다 */
  minSpokes: number;
}

/**
 * 갈래와 모여듦. 뻗어나간 쪽과 모여든 쪽을 각각 고르되 중심 인물이 겹치지 않게 한다 —
 * 같은 얼굴이 두 그래프의 한가운데 앉으면 두 판이 한 판으로 보인다.
 */
export function buildRelationFans({
  relations,
  candidates,
  countPerDirection,
  spokeLimit,
  minSpokes,
}: FanInput): RelationFan[] {
  const byId = new Map(candidates.filter(isPlaceable).map((item) => [item.id, item]));
  const links = directedLinks(relations, byId);

  const outgoing = new Map<string, DirectedLink[]>();
  const incoming = new Map<string, DirectedLink[]>();
  const push = (map: Map<string, DirectedLink[]>, key: string, link: DirectedLink) => {
    const list = map.get(key);
    if (list) list.push(link);
    else map.set(key, [link]);
  };
  for (const link of links) {
    push(outgoing, link.giver, link);
    push(incoming, link.taker, link);
  }

  const usedCenters = new Set<string>();

  const pick = (source: Map<string, DirectedLink[]>, direction: "out" | "in"): RelationFan[] => {
    const ranked = [...source.entries()]
      .filter(([id, list]) => list.length >= minSpokes && !usedCenters.has(id))
      .sort((a, b) => {
        if (a[1].length !== b[1].length) return b[1].length - a[1].length;
        return byInfluence(byId.get(a[0])!, byId.get(b[0])!);
      });

    const fans: RelationFan[] = [];
    for (const [centerId, list] of ranked) {
      if (fans.length >= countPerDirection) break;
      if (usedCenters.has(centerId)) continue;

      const spokes = list
        .map((link) => ({
          celeb: byId.get(direction === "out" ? link.taker : link.giver)!,
          kind: link.kind,
          note: link.note,
          noteEn: link.noteEn,
        }))
        .sort((a, b) => byInfluence(a.celeb, b.celeb))
        .slice(0, spokeLimit);

      usedCenters.add(centerId);
      fans.push({
        id: `${direction}-${centerId}`,
        center: byId.get(centerId)!,
        direction,
        spokes,
        total: list.length,
      });
    }
    return fans;
  };

  // 뻗어나간 갈래를 먼저 고른다 — 중심을 선점해 모여듦이 같은 얼굴을 다시 쓰지 않게 한다
  return [...pick(outgoing, "out"), ...pick(incoming, "in")];
}

interface RivalryInput {
  relations: readonly ShapeRelationInput[];
  candidates: readonly ShapeCandidate[];
  count: number;
}

/**
 * 맞수. 구형 양방향 행과 새 단일 행을 모두 한 쌍으로 접는다.
 */
export function buildRivalries({ relations, candidates, count }: RivalryInput): RelationRivalry[] {
  const byId = new Map(candidates.filter(isPlaceable).map((item) => [item.id, item]));
  const pairs = new Map<string, RelationRivalry>();

  for (const relation of relations) {
    if (relation.relType !== "rival") continue;
    const a = byId.get(relation.fromId);
    const b = byId.get(relation.toId);
    if (!a || !b || a.id === b.id) continue;

    // 두 행 중 이야기가 있는 쪽을 남긴다
    const note = relation.note?.trim() || null;
    const noteEn = relation.noteEn?.trim() || null;
    const [first, second] = a.id < b.id ? [a, b] : [b, a];
    const key = `${first.id}|${second.id}`;
    const previous = pairs.get(key);
    if (!previous || (!previous.note && note)) {
      pairs.set(key, { id: key, a: first, b: second, note, noteEn });
    }
  }

  const used = new Set<string>();
  const picked: RelationRivalry[] = [];
  const ranked = [...pairs.values()]
    .sort((x, y) => {
      // 두 사람 다 큰 인물인 쌍이 먼저다 — 작은 쪽 영향력으로 견준다
      const weak = (pair: RelationRivalry) => Math.min(pair.a.influence, pair.b.influence);
      if (weak(x) !== weak(y)) return weak(y) - weak(x);
      return x.id.localeCompare(y.id);
    });

  for (const pair of ranked) {
    if (picked.length >= count) break;
    // 같은 얼굴이 여러 대결에 겹쳐 나오면 판이 반복돼 보인다
    if (used.has(pair.a.id) || used.has(pair.b.id)) continue;
    used.add(pair.a.id);
    used.add(pair.b.id);
    picked.push(pair);
  }

  return picked;
}

interface CircleInput {
  relations: readonly ShapeRelationInput[];
  candidates: readonly ShapeCandidate[];
  count: number;
  minSize: number;
  maxSize: number;
}

/**
 * 무리. 함께 있던 사이로 이어진 덩어리를 통째로 찾는다.
 * 창업 동료가 낀 무리를 먼저 세운다 — 같은 팀이라는 사실만 있는 무리보다 이야기가 있다.
 */
export function buildRelationCircles({
  relations,
  candidates,
  count,
  minSize,
  maxSize,
}: CircleInput): RelationCircle[] {
  const byId = new Map(candidates.filter(isPlaceable).map((item) => [item.id, item]));

  const adjacency = new Map<string, Set<string>>();
  const founding = new Set<string>();
  /** 무리를 설명할 문장 후보. 창업 문장을 우선한다 */
  const notes = new Map<string, { note: string; noteEn: string | null; founding: boolean }>();

  for (const relation of relations) {
    if (!CIRCLE_TYPES.has(relation.relType)) continue;
    if (!byId.has(relation.fromId) || !byId.has(relation.toId)) continue;

    for (const [a, b] of [
      [relation.fromId, relation.toId],
      [relation.toId, relation.fromId],
    ]) {
      const list = adjacency.get(a);
      if (list) list.add(b);
      else adjacency.set(a, new Set([b]));
    }

    const note = relation.note?.trim();
    const isFounding = relation.relType === FOUNDING_TYPE;
    if (isFounding) {
      founding.add(relation.fromId);
      founding.add(relation.toId);
    }
    if (note) {
      const previous = notes.get(relation.fromId);
      if (!previous || (isFounding && !previous.founding)) {
        notes.set(relation.fromId, {
          note,
          noteEn: relation.noteEn?.trim() || null,
          founding: isFounding,
        });
      }
    }
  }

  // 이어진 덩어리를 통째로 모은다
  const seen = new Set<string>();
  const groups: string[][] = [];
  for (const id of [...adjacency.keys()].sort()) {
    if (seen.has(id)) continue;
    const stack = [id];
    const group: string[] = [];
    seen.add(id);
    while (stack.length > 0) {
      const current = stack.pop()!;
      group.push(current);
      for (const next of [...(adjacency.get(current) ?? [])].sort()) {
        if (seen.has(next)) continue;
        seen.add(next);
        stack.push(next);
      }
    }
    groups.push(group);
  }

  const ranked = groups
    .filter((group) => group.length >= minSize && group.length <= maxSize)
    .map((group) => {
      const members = group.map((id) => byId.get(id)!).sort(byInfluence);
      const foundingMembers = group.filter((id) => founding.has(id)).length;
      // 무리 전체를 대표할 문장 — 창업 문장이 있으면 그것을 쓴다
      const noteEntry = group
        .map((id) => notes.get(id))
        .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry))
        .sort((x, y) => Number(y.founding) - Number(x.founding))[0];
      return {
        id: `circle-${members[0].id}`,
        members,
        note: noteEntry?.note ?? null,
        noteEn: noteEntry?.noteEn ?? null,
        foundingMembers,
        weight: members.reduce((sum, member) => sum + member.influence, 0),
      };
    })
    .sort((x, y) => {
      // 창업 동료가 낀 무리를 먼저, 그 다음은 무게로
      if ((x.foundingMembers > 0) !== (y.foundingMembers > 0)) return x.foundingMembers > 0 ? -1 : 1;
      if (x.weight !== y.weight) return y.weight - x.weight;
      return x.id.localeCompare(y.id);
    });

  return ranked.slice(0, count).map(({ id, members, note, noteEn }) => ({ id, members, note, noteEn }));
}
