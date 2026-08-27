/*
  파일명: /lib/celeb/influenceChains.ts
  기능: 사제·영향 관계를 이어 붙인 「이어진 사람들」 사슬의 단일 출처
  책임: 관계 원장에서 방향이 있는 간선만 골라 시대순 사슬로 잇고, 화면에 세울 몇 개를 고른다.
        조회는 호출처가 하고 여기서는 받은 자료로 순서만 정한다 — relatedFigures.ts와 같은 규약이다.
        한 번 세운 인물은 빼고 다음 사슬을 찾는다. 그러지 않으면 고대 인물과 허브 인물
        (호메로스·니체)을 지나는 경로가 겹쳐 나와 다섯 줄이 한 줄처럼 보인다.
*/

/** 방향이 있는 관계만 사슬이 된다. 동료·맞수·가족은 흐름이 없어 제외한다.
 *  rel_type은 "to_id가 from_id에게 무엇인가"를 뜻한다(celeb_relations의 방향 규약).
 *  사슬은 준 쪽에서 받은 쪽으로 흐르므로 유형에 따라 방향을 뒤집어 읽는다. */
const FLOW: Record<string, "reversed" | "forward"> = {
  // (A,B,teacher) = B는 A의 스승 ⇒ B에서 A로 흐른다
  teacher: "reversed",
  // (A,B,influence) = B가 A에게 영향을 줬다 ⇒ B에서 A로 흐른다
  influence: "reversed",
  // (A,B,student) = B는 A의 제자 ⇒ A에서 B로 흐른다
  student: "forward",
  // (A,B,influenced) = B가 A에게서 영향받았다 ⇒ A에서 B로 흐른다
  influenced: "forward",
};

/** 사제는 이름이 붙은 사이라 영향보다 또렷하다. 같은 두 사람에 둘 다 있으면 사제를 남긴다 */
const MENTOR_TYPES = new Set(["teacher", "student"]);

/* 관계 한 건은 원장에 양방향 두 행으로 있고, 두 행의 설명이 서로 다른 시점으로 쓰여 있다.
   「A는 B에게 배웠다」와 「B는 A를 가르쳤다」 중 사슬에 어울리는 쪽은 받은 사람의 말이다 —
   사슬은 물려받은 자취를 따라가므로, 받은 쪽 시점이 다음 인물로 넘어가는 문장이 된다.
   reversed 유형(teacher·influence)의 행이 그 시점으로 적혀 있다. */
const RECEIVER_VOICE = new Set(["teacher", "influence"]);

export type ChainLinkKind = "mentor" | "influence";

export interface ChainRelationInput {
  fromId: string;
  toId: string;
  relType: string;
  /** 두 사람이 어떻게 이어졌는지 적은 한 줄. 원장의 92%가 값을 갖는다 */
  note?: string | null;
  noteEn?: string | null;
}

export interface ChainCandidate {
  id: string;
  slug: string | null;
  nickname: string;
  nicknameEn: string | null;
  avatarUrl: string | null;
  title: string | null;
  titleEn: string | null;
  /** 없으면 사슬에 세우지 않는다 — 시대순을 못 정해 사슬이 되돌아 흐른다 */
  birthYear: number | null;
}

export interface ChainNode {
  celeb: ChainCandidate;
  /** 다음 사람으로 건너간 관계. 사슬의 마지막 사람만 null이다 */
  kind: ChainLinkKind | null;
  /** 다음 사람과 벌어진 햇수. 사슬의 낙차를 그리는 값이다 */
  gap: number | null;
  /** 다음 사람과 어떻게 이어졌는지. 원장에 없으면 null */
  note: string | null;
  noteEn: string | null;
}

export interface InfluenceChain {
  /** 양 끝 인물로 만든 안정된 값 — 자료가 그대로면 새로 고쳐도 같은 값이 나온다 */
  id: string;
  nodes: ChainNode[];
  /** 첫 사람과 마지막 사람의 생년 */
  fromYear: number;
  toYear: number;
  /** 카드에 펼쳐 보일 한 고리. 가장 멀리 건넌 고리 중 설명이 있는 것을 고른다.
   *  고리마다 설명을 다 적으면 일곱 문장이 겹쳐 사슬이 읽히지 않는다 */
  highlight: { index: number; gap: number } | null;
}

interface Edge {
  src: string;
  dst: string;
  kind: ChainLinkKind;
  note: string | null;
  noteEn: string | null;
  /** 받은 사람 시점으로 쓰인 설명인가 — 같은 고리의 두 행 중 이쪽을 남긴다 */
  receiverVoice: boolean;
}

interface BuildInput {
  relations: readonly ChainRelationInput[];
  candidates: readonly ChainCandidate[];
  /** 만들 사슬 수 */
  maxChains: number;
  /** 이보다 짧으면 사슬로 치지 않는다 */
  minLength: number;
  /** 한 줄에 세울 수 있는 상한. 넘기면 화면에서 읽히지 않는다 */
  maxLength: number;
}

/** 사슬에 세울 수 있는 인물인가 — 이동할 주소와 얼굴, 시대가 있어야 한다 */
function isPlaceable(candidate: ChainCandidate): boolean {
  return Boolean(candidate.slug) && Boolean(candidate.avatarUrl) && candidate.birthYear !== null;
}

/**
 * 방향 간선 원장. 시대를 거스르는 간선은 여기서 끊는다.
 * 끊지 않으면 사슬이 순환해 최장 경로가 끝나지 않는다.
 */
function buildEdges(
  relations: readonly ChainRelationInput[],
  byId: Map<string, ChainCandidate>,
): Map<string, Edge> {
  const edges = new Map<string, Edge>();

  for (const relation of relations) {
    const flow = FLOW[relation.relType];
    if (!flow) continue;

    const src = flow === "reversed" ? relation.toId : relation.fromId;
    const dst = flow === "reversed" ? relation.fromId : relation.toId;
    if (src === dst) continue;

    const from = byId.get(src);
    const to = byId.get(dst);
    if (!from || !to) continue;

    // 자료 오류로 후대가 선대에게 영향을 준 것처럼 적힌 간선을 버린다.
    if (from.birthYear! > to.birthYear!) continue;
    // 동갑은 한 방향만 남긴다 — 둘 다 남기면 생년만으로는 순서를 정하지 못해 순환한다.
    if (from.birthYear === to.birthYear && src >= dst) continue;

    const candidate: Edge = {
      src,
      dst,
      kind: MENTOR_TYPES.has(relation.relType) ? "mentor" : "influence",
      note: relation.note?.trim() || null,
      noteEn: relation.noteEn?.trim() || null,
      receiverVoice: RECEIVER_VOICE.has(relation.relType),
    };

    const key = `${src}|${dst}`;
    const previous = edges.get(key);
    if (!previous || isBetterEdge(candidate, previous)) edges.set(key, candidate);
  }

  return edges;
}

/** 같은 두 사람을 잇는 행이 여럿일 때 남길 하나 */
function isBetterEdge(candidate: Edge, current: Edge): boolean {
  // 사제는 이름이 붙은 사이라 영향보다 또렷하다
  if (candidate.kind !== current.kind) return candidate.kind === "mentor";
  // 설명이 있는 행이 먼저다 — 없는 행을 남기면 고리가 말을 잃는다
  if (Boolean(candidate.note) !== Boolean(current.note)) return Boolean(candidate.note);
  // 둘 다 설명이 있으면 받은 사람 시점으로 쓰인 쪽을 남긴다
  if (candidate.receiverVoice !== current.receiverVoice) return candidate.receiverVoice;
  return false;
}

/**
 * 카드에 펼쳐 보일 고리 하나. 설명이 있는 고리 중 가장 멀리 건넌 것을 고른다 —
 * 사슬에서 놀라운 대목은 늘 시대를 크게 건너뛴 자리다.
 */
function pickHighlight(nodes: readonly ChainNode[]): InfluenceChain["highlight"] {
  let picked: { index: number; gap: number } | null = null;
  nodes.forEach((node, index) => {
    if (!node.note || node.gap === null) return;
    if (!picked || node.gap > picked.gap) picked = { index, gap: node.gap };
  });
  return picked;
}

interface Best {
  len: number;
  /** 이 사람에서 시작하는 최선 사슬의 마지막 생년 — 시대 폭 비교에 쓴다 */
  endYear: number;
  next: Edge | null;
}

/** 한 사람에서 뻗는 갈래 중 더 나은 쪽. 시작이 같으므로 끝이 멀수록 넓게 건넌 것이다 */
function isBetterBranch(candidate: Best, current: Best): boolean {
  if (candidate.len !== current.len) return candidate.len > current.len;
  if (candidate.endYear !== current.endYear) return candidate.endYear > current.endYear;
  // 자료가 같으면 늘 같은 사슬이 나오게 마지막 기준을 둔다
  return (candidate.next?.dst ?? "") < (current.next?.dst ?? "");
}

/**
 * 사제·영향으로 이어진 사슬을 긴 것부터 고른다.
 * 생년 오름차순으로만 진행하므로 순환이 없고, 위상 순서는 생년 역순 하나로 족하다.
 */
export function buildInfluenceChains({
  relations,
  candidates,
  maxChains,
  minLength,
  maxLength,
}: BuildInput): InfluenceChain[] {
  const byId = new Map(candidates.filter(isPlaceable).map((item) => [item.id, item]));
  const live = buildEdges(relations, byId);

  // 늦게 태어난 사람부터 = 위상 역순. 동갑이면 간선이 향하는 쪽(id가 큰 쪽)을 먼저 푼다
  const ordered = [...new Set([...live.values()].flatMap((edge) => [edge.src, edge.dst]))].sort(
    (a, b) => byId.get(b)!.birthYear! - byId.get(a)!.birthYear! || b.localeCompare(a),
  );

  const chains: InfluenceChain[] = [];

  for (let round = 0; round < maxChains; round += 1) {
    const adjacency = new Map<string, Edge[]>();
    for (const edge of live.values()) {
      const list = adjacency.get(edge.src);
      if (list) list.push(edge);
      else adjacency.set(edge.src, [edge]);
    }

    const best = new Map<string, Best>();
    for (const id of ordered) {
      let current: Best = { len: 1, endYear: byId.get(id)!.birthYear!, next: null };
      for (const edge of adjacency.get(id) ?? []) {
        const nextBest = best.get(edge.dst);
        if (!nextBest || nextBest.len + 1 > maxLength) continue;
        const candidate: Best = { len: nextBest.len + 1, endYear: nextBest.endYear, next: edge };
        if (isBetterBranch(candidate, current)) current = candidate;
      }
      best.set(id, current);
    }

    /* 시작점이 서로 다른 사슬끼리는 끝 연도가 아니라 건넌 폭으로 견준다 —
       끝만 보면 같은 곳에 닿은 사슬 중 늦게 시작한 짧은 쪽이 뽑힌다 */
    const span = (id: string) => best.get(id)!.endYear - byId.get(id)!.birthYear!;
    let head: string | null = null;
    for (const id of ordered) {
      const entry = best.get(id);
      if (!entry || entry.len < minLength) continue;
      if (head === null) {
        head = id;
        continue;
      }
      const champion = best.get(head)!;
      if (entry.len !== champion.len) {
        if (entry.len > champion.len) head = id;
      } else if (span(id) !== span(head)) {
        if (span(id) > span(head)) head = id;
      } else if (id < head) {
        head = id;
      }
    }
    if (head === null) break;

    const nodes: ChainNode[] = [];
    const used = new Set<string>();
    let cursor: string = head;
    for (;;) {
      const entry = best.get(cursor)!;
      const celeb = byId.get(cursor)!;
      const next = entry.next;
      nodes.push({
        celeb,
        kind: next?.kind ?? null,
        gap: next ? byId.get(next.dst)!.birthYear! - celeb.birthYear! : null,
        note: next?.note ?? null,
        noteEn: next?.noteEn ?? null,
      });
      used.add(cursor);
      if (!next) break;
      cursor = next.dst;
    }

    /* 세운 인물이 닿는 간선을 통째로 뺀다. 간선만 빼면 같은 사람이 여러 줄의
       시작점으로 되풀이된다 — 오래 산 고대 인물일수록 시대 폭에서 유리한 탓이다 */
    for (const [key, edge] of live) {
      if (used.has(edge.src) || used.has(edge.dst)) live.delete(key);
    }

    chains.push({
      id: `${nodes[0].celeb.id}-${nodes[nodes.length - 1].celeb.id}`,
      nodes,
      fromYear: nodes[0].celeb.birthYear!,
      toYear: nodes[nodes.length - 1].celeb.birthYear!,
      highlight: pickHighlight(nodes),
    });
  }

  return chains;
}
