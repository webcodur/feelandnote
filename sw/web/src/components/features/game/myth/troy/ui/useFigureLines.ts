/*
  파일명: components/features/game/myth/troy/ui/useFigureLines.ts
  기능: 트로이 전쟁 인물 고유 대사
  책임: DB에 인물마다 써 둔 게임 대사(celeb_dialogues)를 판에 서는 인물만 한 번씩 받아 두고, 지금 장면에 맞는 한 줄을 고른다.
        맞는지 가리는 규칙(상대·죽은 인물·장 배경·곁의 우리 편)은 campaign/lineRules.ts가 쥔다. 못 받으면 없는 셈 친다.
*/ // ------------------------------
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocale } from "next-intl";
import { getMythFigureLines } from "@/actions/game/myth/getMythFigureLines";
import type { MythLines, MythLineSituation } from "../../shared/types";
import { pickFitting, type CastName, type LineScene } from "../campaign/lineRules";
import type { TroyPool } from "../model";

const cache = new Map<string, Promise<MythLines | null>>();

function load(id: string): Promise<MythLines | null> {
  const hit = cache.get(id);
  if (hit) return hit;
  const request = getMythFigureLines(id).catch(() => null);
  cache.set(id, request);
  return request;
}

export interface LinePick {
  scene: LineScene;
  // 싸움 외침을 듣는 상대
  target?: string | null;
  // 주면 늘 같은 줄을 고른다(화면을 다시 그려도 바뀌지 않게)
  seed?: number;
}

export type PickLine = (slug: string, situation: MythLineSituation, pick: LinePick) => string | null;

export function useFigureLines(pool: TroyPool, slugs: string[]): PickLine {
  const [loaded, setLoaded] = useState<Partial<Record<string, MythLines>>>({});
  const wanted = [...new Set(slugs)].sort().join(",");
  useEffect(() => {
    let live = true;
    const ids = wanted.split(",").flatMap((slug) => {
      const figure = pool.figures.find((f) => f.slug === slug);
      return figure ? [[slug, figure.id] as const] : [];
    });
    void Promise.all(ids.map(async ([slug, id]) => [slug, await load(id)] as const)).then((pairs) => {
      if (!live) return;
      const found = pairs.filter((pair): pair is readonly [string, MythLines] => pair[1] !== null);
      if (found.length > 0) setLoaded((prev) => ({ ...prev, ...Object.fromEntries(found) }));
    });
    return () => {
      live = false;
    };
  }, [wanted, pool.figures]);
  // 「트로이의 헬레네」「리키아의 사르페돈」은 대사에서 「헬레네」「사르페돈」으로만 불리기도 한다(영어는 Helen of Troy → Helen)
  const ko = useLocale() === "ko";
  const cast = useMemo<CastName[]>(() => pool.figures.map((f) => {
    const words = f.name.split(" ");
    const short = ko ? words[words.length - 1] : words[0];
    return { slug: f.slug, names: [f.name, short].filter((n): n is string => Boolean(n) && [...(n ?? "")].length >= 2) };
  }), [pool.figures, ko]);
  return useCallback<PickLine>((slug, situation, pick) => {
    const lines = loaded[slug]?.lines[situation] ?? [];
    const roll = pick.seed === undefined ? Math.random() : ((Math.abs(pick.seed) * 2654435761) % 4294967296) / 4294967296;
    return pickFitting(lines, { speaker: slug, situation, target: pick.target }, pick.scene, cast, roll);
  }, [loaded, cast]);
}
