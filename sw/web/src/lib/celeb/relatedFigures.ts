/*
  인물 상세 맨 아래 「이어지는 인물」의 순위 단일 출처.
  근거가 있는 관계를 먼저 세우고, 모자란 자리만 직군·시대·나라 거리로 채운다.
  조회는 호출처가 하고 여기서는 받은 자료로 순서만 정한다.
*/

/** 관계 유형별 가까움. 이름 붙은 사이일수록 크고, 남발되는 영향 관계는 낮다.
 *  영향(influence·influenced)은 전체 관계의 절반을 차지해 그대로 두면
 *  라이벌·사제가 이름 없는 피영향 인물에게 밀린다. */
const REL_WEIGHT: Record<string, number> = {
  spouse: 1,
  sibling: 1,
  parent: 1,
  child: 1,
  father: 1,
  mother: 1,
  cofounder: 1,
  partner: 0.95,
  relative: 0.9,
  teacher: 0.95,
  student: 0.95,
  rival: 0.95,
  friend: 0.85,
  influence: 0.6,
  influenced: 0.6,
};

/** 표에 없는 관계 — 이름은 붙었으니 영향보다는 위, 가족보다는 아래 */
const DEFAULT_REL_WEIGHT = 0.7;

/** 영향력 총점의 실측 상한(89)에 여유를 둔 값. 관계 가중치와 같은 자릿수로 맞춘다 */
const INFLUENCE_SCALE = 90;

/** 생년이 이만큼 벌어지면 직군이 통째로 어긋난 것과 같게 센다 */
const YEAR_SCALE = 50;

/** 나라가 다를 때의 벌점. 직군(1)보다 무겁다 — 같은 값으로 두면 같은 시대라는 이유로
 *  유관순 옆에 쇼와 천황이 서고 같은 나라의 문인이 그 뒤로 밀렸다. */
const NATION_GAP = 1.2;

export interface RelatedCandidate {
  id: string;
  slug: string | null;
  nickname: string;
  nickname_en: string | null;
  avatar_url: string | null;
  profession: string | null;
  nationality: string | null;
  birthYear: number | null;
  /** celeb_influence.total_score. 없으면 0 */
  influence: number;
  isFiction: boolean;
}

/** 순위에 필요한 관계 정보만 추린 최소 형태 */
export interface RelatedRelationInput {
  id: string;
  relType: string;
  relGroup: string;
  slug: string | null;
}

export interface RelatedFigureRanked {
  candidate: RelatedCandidate;
  /** relation = 근거 있는 사이, similar = 직군·시대·나라로 계산한 결과 */
  kind: "relation" | "similar";
  /** kind가 relation일 때만 채워진다 */
  relGroup?: string;
}

interface SelfInput {
  id: string;
  profession: string | null;
  nationality: string | null;
  birthYear: number | null;
  isFiction: boolean;
}

/** 직군·나라·생년으로 잰 거리. 0이면 셋 다 같다 */
export function figureDistance(
  self: Pick<SelfInput, "profession" | "nationality" | "birthYear">,
  other: Pick<RelatedCandidate, "profession" | "nationality" | "birthYear">,
): number | null {
  if (self.birthYear === null || other.birthYear === null) return null;

  const professionGap = self.profession === other.profession ? 0 : 1;
  const nationGap = self.nationality === other.nationality ? 0 : NATION_GAP;
  const yearGap = Math.abs(self.birthYear - other.birthYear) / YEAR_SCALE;

  return Math.sqrt(
    professionGap * professionGap + nationGap * nationGap + yearGap * yearGap,
  );
}

/** 관계 한 건의 점수. 같은 유형이면 더 큰 인물이 위로 온다 */
function relationScore(relType: string, influence: number): number {
  const weight = REL_WEIGHT[relType] ?? DEFAULT_REL_WEIGHT;
  return weight + influence / INFLUENCE_SCALE;
}

/**
 * 관계를 먼저 세우고 남은 자리를 계산으로 채운다.
 * 같은 인물과 관계가 둘 이상일 수 있으므로(친구이면서 영향) 가장 가까운 한 건만 남긴다.
 */
export function rankRelatedFigures({
  self,
  relations,
  candidates,
  limit,
}: {
  self: SelfInput;
  relations: readonly RelatedRelationInput[];
  candidates: readonly RelatedCandidate[];
  limit: number;
}): RelatedFigureRanked[] {
  const byId = new Map(candidates.map((candidate) => [candidate.id, candidate]));

  // 1) 근거 있는 사이 — 이동할 페이지가 있는 인물만 세운다
  const best = new Map<string, { relation: RelatedRelationInput; score: number }>();
  for (const relation of relations) {
    if (relation.id === self.id || !relation.slug) continue;
    const candidate = byId.get(relation.id);
    if (!candidate || candidate.isFiction !== self.isFiction) continue;

    const score = relationScore(relation.relType, candidate.influence);
    const previous = best.get(relation.id);
    if (!previous || score > previous.score) {
      best.set(relation.id, { relation, score });
    }
  }

  const ranked: RelatedFigureRanked[] = [...best.entries()]
    .sort((a, b) => b[1].score - a[1].score)
    .map(([id, entry]) => ({
      candidate: byId.get(id)!,
      kind: "relation" as const,
      relGroup: entry.relation.relGroup,
    }));

  if (ranked.length >= limit) return ranked.slice(0, limit);

  // 2) 남은 자리 — 직군·시대·나라가 가까운 순, 같으면 더 큰 인물부터
  const taken = new Set(ranked.map((item) => item.candidate.id));
  const scored: { candidate: RelatedCandidate; distance: number }[] = [];

  for (const candidate of candidates) {
    if (candidate.id === self.id || taken.has(candidate.id)) continue;
    if (!candidate.slug || candidate.isFiction !== self.isFiction) continue;

    const distance = figureDistance(self, candidate);
    if (distance === null) continue;
    scored.push({ candidate, distance });
  }

  scored.sort((a, b) => {
    if (a.distance !== b.distance) return a.distance - b.distance;
    if (a.candidate.influence !== b.candidate.influence) {
      return b.candidate.influence - a.candidate.influence;
    }
    return a.candidate.id.localeCompare(b.candidate.id);
  });

  for (const { candidate } of scored) {
    if (ranked.length >= limit) break;
    ranked.push({ candidate, kind: "similar" });
  }

  return ranked;
}
