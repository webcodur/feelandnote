import type { CelebRelationItem } from "@/actions/user/getCelebBySlug";

export type RelationMode = "family" | "social";
export type KinRank = "parents" | "siblings" | "spouses" | "children";
export type SocialBand = "up" | "left" | "right" | "down";
export type RelationFocus = KinRank | SocialBand;

export interface RelationGraphProps {
  centerName: string;
  centerAvatarUrl: string | null;
  relations: CelebRelationItem[];
  isFiction?: boolean;
}

export interface PersonNode {
  id: string;
  slug: string | null;
  listed: boolean;
  name: string;
  avatarUrl: string | null;
  types: string[];
  groups: CelebRelationItem["relGroup"][];
  note: string | null;
  profession: string | null;
  nationality: string | null;
  birthDate: string | null;
  deathDate: string | null;
  qid: string | null;
}

export interface RelationModel {
  people: PersonNode[];
  family: Record<KinRank, PersonNode[]>;
  social: Record<SocialBand, PersonNode[]>;
  familyPeople: PersonNode[];
  socialPeople: PersonNode[];
}

export interface DiagramLabels {
  parents: string;
  siblings: string;
  spouses: string;
  children: string;
  up: string;
  left: string;
  right: string;
  down: string;
}

export interface DiagramNode {
  id: string;
  type: string;
  data: {
    kind: "person" | "center" | "lane" | "junction";
    nodeType: string;
    personId?: string;
    personIds?: string[];
  };
  style: Record<string, unknown>;
}

export interface DiagramEdge {
  id: string;
  source: string;
  target: string;
  type: "polyline";
  data: { personIds: string[]; layer: "base" | "ink" };
  style: Record<string, unknown>;
}

export interface DiagramData {
  nodes: DiagramNode[];
  edges: DiagramEdge[];
  combos: never[];
}

export interface DiagramTheme {
  deep: string;
  edge: string;
  accent: string;
}
