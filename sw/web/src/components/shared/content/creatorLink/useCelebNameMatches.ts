/*
  파일명: /components/shared/content/creatorLink/useCelebNameMatches.ts
  기능: 창작자 이름과 이름이 같은 등록 인물을 한 번만 조회해 나눠 쓴다.
  책임: 한 카드 안에서 제목 줄·감독·출연이 각자 조회하면 같은 이름을 여러 번 묻게 된다.
        이미 물어본 이름은 모듈에 남겨 두고, 아직 안 물어본 이름만 모아 한 번에 묻는다.
*/ // ------------------------------
"use client";

import { useEffect, useState } from "react";

import { findCelebsByNames, type CelebNameMatch } from "@/actions/celebs/findCelebsByNames";
import { normalizeCreatorName } from "@/lib/utils/creator-names";

export type CelebNameMatchMap = Record<string, CelebNameMatch[]>;

/** 화면 언어별로 답이 달라 언어까지 열쇠에 넣는다 */
const answered = new Map<string, CelebNameMatch[]>();
const asking = new Map<string, Promise<void>>();

const seatOf = (locale: string, key: string) => `${locale}:${key}`;

async function ask(locale: string, keys: string[]): Promise<void> {
  const found = await findCelebsByNames(keys, locale);
  for (const key of keys) {
    answered.set(seatOf(locale, key), found[key] ?? []);
  }
}

/**
 * 이름 목록에 걸린 인물 후보를 돌려준다. 후보가 없는 이름은 열쇠 자체가 없다.
 * 조회가 끝나기 전에는 빈 값이라 이름이 평문으로 먼저 보이고, 답이 오면 누를 수 있게 바뀐다.
 */
export function useCelebNameMatches(names: string[], locale: string): CelebNameMatchMap {
  const keys = [...new Set(names.map(normalizeCreatorName).filter(Boolean))].sort();
  const cacheKey = `${locale}|${keys.join("|")}`;
  const [, setTick] = useState(0);

  useEffect(() => {
    if (keys.length === 0) return;

    const unasked = keys.filter((key) => !answered.has(seatOf(locale, key)));
    if (unasked.length === 0) return;

    let alive = true;
    const pending = asking.get(cacheKey) ?? ask(locale, unasked).finally(() => asking.delete(cacheKey));
    asking.set(cacheKey, pending);
    pending
      .then(() => {
        if (alive) setTick((n) => n + 1);
      })
      .catch((error: unknown) => {
        // 대조에 실패해도 이름은 평문으로 남는다 — 화면이 깨지지 않는다
        console.error("인물 이름 대조 실패:", error);
      });

    return () => {
      alive = false;
    };
    // keys는 cacheKey로 압축해 담는다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cacheKey, locale]);

  const map: CelebNameMatchMap = {};
  for (const key of keys) {
    const hit = answered.get(seatOf(locale, key));
    if (hit && hit.length > 0) map[key] = hit;
  }
  return map;
}
