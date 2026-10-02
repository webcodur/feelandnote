import type { RelationFocus } from "./types";

export const MOBILE_RELATION_PAGE_SIZE = 6;

type Direction = "up" | "left" | "right" | "down";

const directions: Record<RelationFocus, Direction> = {
  parents: "up", siblings: "left", spouses: "right", children: "down",
  up: "up", left: "left", right: "right", down: "down",
};

const tones: Record<Direction, string> = {
  up: "#7fb3ff", left: "#6fd3b8", right: "#e0a3d8", down: "#f0c268",
};

export function mobileRelationTone(focus: RelationFocus) {
  return tones[directions[focus]];
}

/** 전체 관계에서는 여러 갈래에 속한 사람도 한 번만 표시한다. */
export function mobileRelationPeople<T extends { id: string }>(
  options: readonly { key: RelationFocus; people: readonly T[] }[],
  focus: RelationFocus | null,
) {
  const people = options.filter(option => focus === null || option.key === focus)
    .flatMap(option => option.people);
  return [...new Map(people.map(person => [person.id, person])).values()];
}
