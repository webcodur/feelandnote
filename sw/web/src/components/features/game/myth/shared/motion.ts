/*
  파일명: components/features/game/myth/shared/motion.ts
  기능: 신화 게임 공용 움직임
  책임: 순차 등장·튀어 오름·흔들림을 게임마다 같은 박자로 쓰게 한다.
        움직임 줄이기(prefers-reduced-motion)를 켠 사람에게는 옮김·확대 없이 짧은 페이드만 남긴다.
*/ // ------------------------------
"use client";

import { useReducedMotion, type Variants } from "framer-motion";

export const EASE_OUT = [0.22, 1, 0.36, 1] as const;

export function useCalm(): boolean {
  return Boolean(useReducedMotion());
}

// 부모에 걸어 자식(rise·pop)을 차례로 띄운다
export function stagger(calm: boolean, gap = 0.07, delay = 0.04): Variants {
  return { hidden: {}, show: { transition: { staggerChildren: calm ? 0 : gap, delayChildren: calm ? 0 : delay } } };
}

export function rise(calm: boolean, distance = 18): Variants {
  if (calm) return { hidden: { opacity: 0 }, show: { opacity: 1, transition: { duration: 0.18 } } };
  return {
    hidden: { opacity: 0, y: distance },
    show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: EASE_OUT } },
  };
}

export function pop(calm: boolean, from = 0.7): Variants {
  if (calm) return { hidden: { opacity: 0 }, show: { opacity: 1, transition: { duration: 0.18 } } };
  return {
    hidden: { opacity: 0, scale: from },
    show: { opacity: 1, scale: 1, transition: { type: "spring", stiffness: 380, damping: 22 } },
  };
}

// 틀렸을 때 좌우로 짧게 흔든다. 움직임을 줄인 사람에게는 흔들지 않는다
export function shakeKeyframes(calm: boolean) {
  return calm ? { x: 0 } : { x: [0, -10, 9, -6, 4, -2, 0] };
}

export const SHAKE_TRANSITION = { duration: 0.45, ease: "easeOut" } as const;
