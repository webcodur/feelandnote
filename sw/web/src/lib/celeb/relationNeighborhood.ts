/*
  파일명: /lib/celeb/relationNeighborhood.ts
  기능: 한 인물을 둘러싼 관계를 방향별로 나누는 규칙의 단일 출처
  책임: 현재 인물 기준으로 변환된 관계 유형을 화면의 다섯 묶음으로 옮긴다.
        양끝 조회와 방향 변환은 relationRows.ts가 맡고 여기서는 나누고 줄 세우기만 한다.
*/

/** 화면이 읽는 묶음. 순서가 곧 화면에 서는 차례다 */
export type NeighborKind = "gave" | "took" | "rival" | "together" | "family";

/** 상대가 중심에게 무엇이었나 → 어느 묶음인가 */
const KIND_OF: Record<string, NeighborKind> = {
  // 상대가 중심의 스승이거나 중심에게 영향을 줬다
  teacher: "gave",
  influence: "gave",
  // 상대가 중심의 제자이거나 중심에게서 영향을 받았다
  student: "took",
  influenced: "took",
  rival: "rival",
  colleague: "together",
  cofounder: "together",
  partner: "together",
  spouse: "family",
  sibling: "family",
  parent: "family",
  child: "family",
  father: "family",
  mother: "family",
  relative: "family",
};

/** 묶음이 화면에 서는 차례. 준 쪽이 위, 받은 쪽이 아래에 오도록 둔다 */
export const NEIGHBOR_ORDER: readonly NeighborKind[] = [
  "gave",
  "took",
  "rival",
  "together",
  "family",
] as const;

export interface NeighborCandidate {
  id: string;
  slug: string | null;
  nickname: string;
  nicknameEn: string | null;
  avatarUrl: string | null;
  title: string | null;
  titleEn: string | null;
  influence: number;
}

export interface NeighborRelationInput {
  targetId: string;
  relType: string;
  note?: string | null;
  noteEn?: string | null;
}

export interface Neighbor {
  celeb: NeighborCandidate;
  relType: string;
  /** 어떻게 이어졌는지 적은 한 줄. 이 화면의 알맹이다 */
  note: string | null;
  noteEn: string | null;
}

export interface NeighborGroup {
  kind: NeighborKind;
  items: Neighbor[];
  /** 자르기 전의 전체 수 */
  total: number;
}

interface GroupInput {
  relations: readonly NeighborRelationInput[];
  candidates: ReadonlyMap<string, NeighborCandidate>;
  /** 묶음마다 세울 최대 인원 */
  limit: number;
}

/**
 * 관계를 묶음별로 나눈다.
 * 같은 상대가 여러 관계로 걸려 있으면(친구이면서 영향) 설명이 있는 쪽을 남긴다 —
 * 한 사람이 한 묶음 안에 두 번 서면 같은 얼굴이 나란히 붙는다.
 */
export function groupNeighbors({ relations, candidates, limit }: GroupInput): NeighborGroup[] {
  const buckets = new Map<NeighborKind, Map<string, Neighbor>>();

  for (const relation of relations) {
    const kind = KIND_OF[relation.relType];
    if (!kind) continue;

    const celeb = candidates.get(relation.targetId);
    // 이동할 주소가 없는 상대는 세우지 않는다 — 파고들 곳이 없다
    if (!celeb || !celeb.slug) continue;

    const neighbor: Neighbor = {
      celeb,
      relType: relation.relType,
      note: relation.note?.trim() || null,
      noteEn: relation.noteEn?.trim() || null,
    };

    let bucket = buckets.get(kind);
    if (!bucket) {
      bucket = new Map();
      buckets.set(kind, bucket);
    }
    const previous = bucket.get(celeb.id);
    if (!previous || (!previous.note && neighbor.note)) bucket.set(celeb.id, neighbor);
  }

  const groups: NeighborGroup[] = [];
  for (const kind of NEIGHBOR_ORDER) {
    const bucket = buckets.get(kind);
    if (!bucket || bucket.size === 0) continue;

    const items = [...bucket.values()].sort((a, b) => {
      // 어떻게 이어졌는지 아는 사람이 먼저다 — 이 화면은 그 문장을 읽으러 오는 곳이다
      if (Boolean(a.note) !== Boolean(b.note)) return a.note ? -1 : 1;
      if (a.celeb.influence !== b.celeb.influence) return b.celeb.influence - a.celeb.influence;
      return a.celeb.id.localeCompare(b.celeb.id);
    });

    groups.push({ kind, items: items.slice(0, limit), total: items.length });
  }

  return groups;
}
