/*
  파일명: components/features/game/myth/troy/ui/battle/useOverlays.ts
  기능: 트로이 전쟁 싸움 중 알림 층
  책임: 대화 장면·맞수 장면·차례 알림·짧은 알림(수준 오름 등)·인물 외침을 띄우고, 연출 재생기가 기다릴 수 있게 닫힐 때 풀리는 약속을 준다.
        차례 알림과 맞수 장면은 시간이 지나면 저절로 닫히고(차례 알림은 빠르게를 켜면 그만큼 짧다), 대화 장면은 사람이 끝까지 넘겨야 닫힌다. 외침과 짧은 알림은 기다리지 않는다.
*/ // ------------------------------
"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import type { Side, Unit } from "../../engine";
import type { StoryScene } from "../../story/types";

export interface RivalCard {
  a: Unit | null;
  b: Unit | null;
  note: string | null;
  // 두 사람의 싸움 외침(DB 고유 대사)
  lines: { a: string | null; b: string | null };
}

export interface Toast {
  id: number;
  text: string;
}

// 인물 한 사람의 짧은 외침
export interface Bark {
  id: number;
  slug: string;
  side: Side;
  text: string;
}

const NOTICE_MS = 1100;
const RIVAL_MS = 4200;
const TOAST_MS = 2400;
const BARK_MS = 2800;

export function useOverlays() {
  const [dialogue, setDialogue] = useState<StoryScene | null>(null);
  const [rival, setRival] = useState<RivalCard | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [barks, setBarks] = useState<Bark[]>([]);
  const resolver = useRef<(() => void) | null>(null);
  // 연출 빠르기 — 차례 알림도 그만큼 짧게 띄운다
  const speed = useRef(1);
  const timer = useRef<number | null>(null);
  const nextId = useRef(0);

  const close = useCallback(() => {
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = null;
    setDialogue(null);
    setRival(null);
    setNotice(null);
    const done = resolver.current;
    resolver.current = null;
    done?.();
  }, []);

  const hold = useCallback(
    (show: () => void, ms: number | null) =>
      new Promise<void>((resolve) => {
        // 앞 알림의 시계가 새 알림을 일찍 닫지 않게 먼저 거둔다
        if (timer.current !== null) window.clearTimeout(timer.current);
        timer.current = null;
        resolver.current?.();
        resolver.current = resolve;
        show();
        if (ms !== null) timer.current = window.setTimeout(close, ms);
      }),
    [close],
  );

  const showScene = useCallback((scene: StoryScene) => hold(() => setDialogue(scene), null), [hold]);
  const showRival = useCallback((card: RivalCard) => hold(() => setRival(card), RIVAL_MS), [hold]);
  const showNotice = useCallback((text: string) => hold(() => setNotice(text), NOTICE_MS / speed.current), [hold]);
  const setSpeed = useCallback((scale: number) => { speed.current = Math.max(1, scale); }, []);
  const toast = useCallback((text: string) => {
    const id = ++nextId.current;
    setToasts((list) => [...list.slice(-2), { id, text }]);
    window.setTimeout(() => setToasts((list) => list.filter((t) => t.id !== id)), TOAST_MS);
  }, []);
  const bark = useCallback((slug: string, side: Side, text: string) => {
    const id = ++nextId.current;
    setBarks((list) => [...list.slice(-1), { id, slug, side, text }]);
    window.setTimeout(() => setBarks((list) => list.filter((b) => b.id !== id)), BARK_MS);
  }, []);

  return useMemo(
    () => ({ dialogue, rival, notice, toasts, barks, close, showScene, showRival, showNotice, toast, bark, setSpeed }),
    [dialogue, rival, notice, toasts, barks, close, showScene, showRival, showNotice, toast, bark, setSpeed],
  );
}

export type Overlays = ReturnType<typeof useOverlays>;
