/*
  파일명: components/features/game/myth/shared/hub/HubHeroArt.tsx
  기능: 신화 게임 목록 머리 그림
  책임: 게임 표지 그림을 몇 초마다 천천히 겹쳐 바꾸며 머리 구역 뒤에 깐다. 첫 그림은 서버가 그린 화면부터 보인다.
        움직임을 줄인 사람에게는 첫 그림 하나만 멈춰 둔다.
*/ // ------------------------------
"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useCalm } from "../motion";

const HOLD_MS = 7000;

export default function HubHeroArt({ images }: { images: string[] }) {
  const calm = useCalm();
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (calm || images.length < 2) return;
    const timer = window.setInterval(() => setIndex((current) => (current + 1) % images.length), HOLD_MS);
    return () => window.clearInterval(timer);
  }, [calm, images.length]);

  const src = images[index];
  if (!src) return null;
  return (
    <div aria-hidden className="absolute inset-0 -z-10 overflow-hidden">
      <AnimatePresence initial={false}>
        <motion.img
          key={src}
          src={src}
          alt=""
          decoding="async"
          className="absolute inset-0 h-full w-full object-cover"
          initial={{ opacity: 0, scale: 1 }}
          animate={{ opacity: 0.6, scale: calm ? 1 : 1.08 }}
          exit={{ opacity: 0 }}
          transition={{ opacity: { duration: 1.6, ease: "easeInOut" }, scale: { duration: HOLD_MS / 1000 + 1.6, ease: "linear" } }}
        />
      </AnimatePresence>
    </div>
  );
}
