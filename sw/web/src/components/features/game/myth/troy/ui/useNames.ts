/*
  파일명: components/features/game/myth/troy/ui/useNames.ts
  기능: 트로이 전쟁 이름·얼굴 찾기
  책임: 장수·이야기 화자의 이름과 아바타·대표 사진을 요청 언어로 찾는다. DB 값(pool)을 먼저 쓰고, 없으면 예비 이름표를 본다.
*/ // ------------------------------
"use client";

import { useCallback, useMemo } from "react";
import { useLocale } from "next-intl";
import type { Unit } from "../engine";
import { FIGURE_NAMES, SOLDIER_NAMES } from "../campaign/names";
import type { TroyFigure, TroyPool } from "../model";
import { SPEAKERS } from "../story/speakers";
import type { StoryLocale } from "../story/types";

export interface Names {
  locale: StoryLocale;
  figure: (slug: string) => TroyFigure | null;
  figureName: (slug: string) => string;
  unitName: (unit: Pick<Unit, "figureSlug" | "nameKey" | "id">) => string;
  speakerName: (speaker: string | null) => string | null;
}

export function useNames(pool: TroyPool): Names {
  const locale: StoryLocale = useLocale() === "ko" ? "ko" : "en";
  const bySlug = useMemo(() => new Map(pool.figures.map((f) => [f.slug, f])), [pool.figures]);
  const figure = useCallback((slug: string) => bySlug.get(slug) ?? null, [bySlug]);
  const figureName = useCallback(
    (slug: string) => bySlug.get(slug)?.name ?? FIGURE_NAMES[slug]?.[locale] ?? SPEAKERS[slug]?.[locale] ?? slug,
    [bySlug, locale],
  );
  const unitName = useCallback(
    (unit: Pick<Unit, "figureSlug" | "nameKey" | "id">) =>
      unit.figureSlug ? figureName(unit.figureSlug) : (unit.nameKey && SOLDIER_NAMES[unit.nameKey]?.[locale]) || unit.id,
    [figureName, locale],
  );
  const speakerName = useCallback((speaker: string | null) => (speaker ? figureName(speaker) : null), [figureName]);
  return useMemo(() => ({ locale, figure, figureName, unitName, speakerName }), [locale, figure, figureName, unitName, speakerName]);
}
