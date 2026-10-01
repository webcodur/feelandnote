/*
  파일명: components/features/game/myth/troy/ui/flow.ts
  기능: 트로이 전쟁 화면 흐름 자료
  책임: 화면 단계(제목·장 고르기·이야기·출진 준비·싸움·결과·엔딩)의 모양과, 판을 세울 때 쓰는 도움 함수(관계 → 인연·맞수, 장 이야기 고르기)를 둔다.
*/ // ------------------------------
import { BOND_TYPES, createBattle } from "../engine";
import type { BattleState, Bond } from "../engine";
import type { ChapterEntry } from "../campaign";
import { tuneBattle } from "../campaign/difficulty";
import { rosterFor } from "../campaign/progress";
import type { CampaignSave, TroyRelation } from "../model";
import type { ChapterStory, StoryLocale, StoryScene } from "../story/types";

export type StoryPart = "intro" | "outro";

export type Screen =
  | { kind: "title" }
  | { kind: "chapters" }
  | { kind: "story"; chapterId: string; part: StoryPart }
  | { kind: "prep"; chapterId: string }
  | { kind: "battle"; chapterId: string; start: BattleState; fresh: boolean }
  // bench: 이긴 판에서 진영에 남아 몫을 받은 영웅 수와 그 경험(졌으면 null)
  | { kind: "result"; chapterId: string; start: BattleState; final: BattleState; bench: { count: number; amount: number } | null }
  | { kind: "ending" };

const BONDS = new Set<string>(BOND_TYPES);

// DB 관계 → 규칙이 쓰는 인연·맞수(대응 신격·영향 관계는 뺀다)
export function bondsFrom(relations: TroyRelation[]): Bond[] {
  return relations.flatMap((r) => {
    const kind = r.type === "rival" ? "rival" : BONDS.has(r.type) ? "bond" : null;
    return kind ? [{ a: r.a, b: r.b, kind, type: r.type, note: r.note }] : [];
  });
}

export function storyOf(entry: ChapterEntry, locale: StoryLocale): ChapterStory {
  return entry.story[locale];
}

// 이야기 한 토막 — 표지에 따라 다른 길 장면을 고른다
export function storyScene(entry: ChapterEntry, locale: StoryLocale, part: StoryPart, flags: string[]): StoryScene {
  const story = storyOf(entry, locale);
  if (part === "intro") {
    const alt = entry.introAltFlag && flags.includes(entry.introAltFlag) ? story.scenes.find((s) => s.id === "intro-alt") : null;
    return alt ?? story.intro;
  }
  const altOutro = entry.outroAltFlag && flags.includes(entry.outroAltFlag) ? story.outroAlt : null;
  return altOutro ?? story.outro;
}

// 판에 서는(또는 사건으로 나올) DB 인물 slug
export function castOf(state: BattleState): string[] {
  const spawns = state.events.flatMap((e) => e.actions.flatMap((a) => (a.do === "spawn" ? a.units : [])));
  const slugs = [...state.units, ...state.removed, ...spawns].flatMap((u) => (u.figureSlug ? [u.figureSlug] : []));
  return [...new Set(slugs)];
}

export function newBattle(entry: ChapterEntry, save: CampaignSave, deployed: string[], relations: TroyRelation[]): BattleState {
  const seed = (Date.now() ^ Math.floor(Math.random() * 0x7fffffff)) >>> 0;
  return createBattle(tuneBattle(entry.battle, save.difficulty), deployed, rosterFor(entry, save), bondsFrom(relations), seed);
}
