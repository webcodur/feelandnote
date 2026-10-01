/*
  파일명: components/features/game/myth/troy/ui/useSave.ts
  기능: 트로이 전쟁 원정 기록 구독
  책임: 브라우저 localStorage의 원정 기록을 외부 저장소로 구독한다(서버 첫 화면은 빈 기록, 브라우저에서 실제 기록으로 바뀐다).
        같은 문자열이면 같은 객체를 돌려줘 화면이 쓸데없이 다시 그려지지 않게 한다. 다른 탭에서 바꿔도 따라온다.
*/ // ------------------------------
"use client";

import { useCallback, useSyncExternalStore } from "react";
import { emptySave, parseSave, SAVE_KEY, writeSave } from "../campaign/progress";
import type { CampaignSave } from "../model";

const EMPTY = emptySave();
let cache: { raw: string | null; save: CampaignSave } = { raw: null, save: EMPTY };
const listeners = new Set<() => void>();

function snapshot(): CampaignSave {
  const raw = window.localStorage.getItem(SAVE_KEY);
  if (raw === cache.raw) return cache.save;
  cache = { raw, save: raw ? parseSave(raw) : EMPTY };
  return cache.save;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

export function useSave(): [CampaignSave, (next: CampaignSave) => void] {
  const save = useSyncExternalStore(subscribe, snapshot, () => EMPTY);
  const commit = useCallback((next: CampaignSave) => {
    writeSave(next);
    listeners.forEach((listener) => listener());
  }, []);
  return [save, commit];
}
