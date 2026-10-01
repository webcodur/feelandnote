/*
  파일명: components/features/game/myth/shared/ResultRays.tsx
  기능: 신화 게임 결과 빛살
  책임: 점수 뒤에서 금빛 빛살이 퍼지며 천천히 돈다. 움직임을 줄인 사람에게는 멈춘 빛만 남긴다.
        빛살은 부모 폭 안에서 잘라 휴대폰에서 가로 스크롤을 만들지 않는다.
*/ // ------------------------------
"use client";

import { motion } from "framer-motion";
import { useCalm } from "./motion";

const RAYS =
  "bg-[repeating-conic-gradient(from_0deg,rgba(var(--color-accent-rgb),0.22)_0deg_7deg,transparent_7deg_22deg)] [mask-image:radial-gradient(circle,black_6%,transparent_66%)]";

export default function ResultRays() {
  const calm = useCalm();
  return (
    <div aria-hidden className="pointer-events-none absolute inset-x-0 -top-24 -bottom-16 flex items-center justify-center overflow-hidden">
      <motion.div
        className={`aspect-square w-[30rem] shrink-0 rounded-full sm:w-[38rem] ${RAYS}`}
        initial={{ opacity: 0, scale: 0.6, rotate: 0 }}
        animate={calm ? { opacity: 0.7, scale: 1 } : { opacity: 1, scale: 1, rotate: 360 }}
        transition={calm ? { duration: 0.3 } : {
          opacity: { duration: 0.8 },
          scale: { duration: 0.9, ease: "easeOut" },
          rotate: { duration: 60, ease: "linear", repeat: Infinity },
        }}
      />
      <div className="absolute h-44 w-80 rounded-full bg-[radial-gradient(ellipse,rgba(var(--color-accent-rgb),0.24),transparent_70%)]" />
    </div>
  );
}
