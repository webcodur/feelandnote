/*
  파일명: components/features/game/myth/troy/ui/battle/useDirectorHooks.ts
  기능: 트로이 전쟁 연출 재생기와 화면 알림 잇기
  책임: 연출 재생기(director)가 부르는 손잡이(대화 장면·맞수 장면·인물 외침·차례 알림·짧은 알림·이름표)를 알림 층과 문구로 채운다.
        인물 외침(DB 고유 대사)은 한 판에 한 사람 한 번만 하고, 맞수 장면에서 이미 외친 두 사람은 건너뛴다.
        외침은 지금 장면(장 배경·원정에서 죽은 인물·곁의 편·쓰러진 동료)에 맞는 줄만 고른다(campaign/lineRules.ts).
*/ // ------------------------------
"use client";

import { useMemo, useRef } from "react";
import { useTranslations } from "next-intl";
import { allied } from "../../engine";
import type { BattleState, StatusKey, Unit } from "../../engine";
import { lineScene } from "../../campaign/lineScene";
import type { ChapterStory } from "../../story/types";
import type { PickLine } from "../useFigureLines";
import type { Names } from "../useNames";
import type { DirectorHooks } from "./director";
import type { Overlays } from "./useOverlays";

// 말하는 사람 편의 판 위 인물과, 이번 판에 그 편이 쓰러진 적이 있는지
function boardOf(state: BattleState, unit: Unit) {
  const allies = state.units.filter((u) => allied(u.side, unit.side) && u.figureSlug).map((u) => u.figureSlug ?? "");
  const comradeFell = state.removed.some((u) => allied(u.side, unit.side) && state.fallen.includes(u.id));
  return { allies, comradeFell };
}

export function useDirectorHooks(
  units: DirectorHooks["units"], story: ChapterStory, overlays: Overlays, names: Names, pickLine: PickLine, campaignFlags: string[],
): Omit<DirectorHooks, "view"> {
  const t = useTranslations("gameMythTroy");
  const barked = useRef(new Set<string>());
  return useMemo(() => {
    const cry = (unit: Unit | null, foe: Unit | null, state: BattleState) => {
      if (!unit?.figureSlug) return null;
      const scene = lineScene(state.chapterId, campaignFlags, false, boardOf(state, unit));
      return pickLine(unit.figureSlug, "clash_attack", { scene, target: foe?.figureSlug });
    };
    return {
      units,
      scene: (id: string) => {
        const scene = story.scenes.find((s) => s.id === id);
        return scene ? overlays.showScene(scene) : Promise.resolve();
      },
      rival: (a: Unit | null, b: Unit | null, note: string | null, state: BattleState) => {
        for (const unit of [a, b]) if (unit?.figureSlug) barked.current.add(unit.figureSlug);
        return overlays.showRival({ a, b, note, lines: { a: cry(a, b, state), b: cry(b, a, state) } });
      },
      bark: (speaker: Unit | null, target: Unit | null, state: BattleState) => {
        const slug = speaker?.figureSlug;
        if (!speaker || !slug || barked.current.has(slug)) return;
        const text = cry(speaker, target, state);
        if (!text) return;
        barked.current.add(slug);
        overlays.bark(slug, speaker.side, text);
      },
      notice: overlays.showNotice,
      toast: overlays.toast,
      label: {
        phase: (phase: BattleState["phase"], turn: number) => `${t("banner.turnStart", { turn })} · ${t(`hud.phase.${phase}`)}`,
        status: (key: StatusKey) => t(`statuses.${key}`),
        skill: (key: string) => t(`skills.${key}.name`),
        levelUp: (unit: Unit, level: number) => t("banner.levelUpOf", { name: names.unitName(unit), level }),
        truce: t("banner.truce"),
        shipBurned: t("banner.shipBurned"),
      },
    };
  }, [units, story, overlays, names, pickLine, campaignFlags, t]);
}
