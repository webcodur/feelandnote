/*
  파일명: components/features/game/myth/shared/relations.ts
  기능: 신화 게임 공용 관계 도우미
  책임: 표준 방향 관계(to가 from의 type)를 「보는 사람에게 상대가 무엇인가」로 바꾸고, 인물마다 이웃 목록을 만든다.
        화면에 쓰는 관계 이름표 키(gameMyth.relation.<키>)도 여기서 정한다.
*/ // ------------------------------
import { celebRelationTypeForViewer } from "@feelandnote/shared/constants/celeb-relations";
import type { MythGender, MythRelation } from "./types";

export interface Neighbor {
  id: string;
  // 보는 사람에게 상대가 무엇인가(예: father = 상대가 내 아버지)
  type: string;
  note: string | null;
}

export function viewedType(relation: MythRelation, viewerId: string): string | null {
  return celebRelationTypeForViewer({ fromId: relation.fromId, toId: relation.toId, relType: relation.type }, viewerId);
}

export function counterpartOf(relation: MythRelation, viewerId: string): string | null {
  if (relation.fromId === viewerId) return relation.toId;
  return relation.toId === viewerId ? relation.fromId : null;
}

export function buildNeighbors(relations: readonly MythRelation[]): Map<string, Neighbor[]> {
  const map = new Map<string, Neighbor[]>();
  const push = (viewerId: string, relation: MythRelation) => {
    const id = counterpartOf(relation, viewerId);
    const type = viewedType(relation, viewerId);
    if (!id || !type) return;
    const list = map.get(viewerId) ?? [];
    list.push({ id, type, note: relation.note });
    map.set(viewerId, list);
  };
  for (const relation of relations) {
    push(relation.fromId, relation);
    push(relation.toId, relation);
  }
  return map;
}

// 이름표 키 — 부모·자녀는 상대 성별을 알면 아버지·어머니·아들·딸로 좁힌다
const BY_GENDER: Record<string, Partial<Record<MythGender, string>>> = {
  parent: { male: "father", female: "mother" },
  child: { male: "son", female: "daughter" },
};

export const RELATION_LABEL_KEYS = [
  "father", "mother", "parent", "son", "daughter", "child", "spouse", "partner", "sibling", "relative",
  "teacher", "student", "rival", "friend", "colleague", "influence", "influenced", "counterpart", "cofounder",
] as const;

export function relationLabelKey(type: string, counterpartGender: MythGender | null): string {
  const narrowed = counterpartGender ? BY_GENDER[type]?.[counterpartGender] : undefined;
  const key = narrowed ?? type;
  return (RELATION_LABEL_KEYS as readonly string[]).includes(key) ? key : "relative";
}
