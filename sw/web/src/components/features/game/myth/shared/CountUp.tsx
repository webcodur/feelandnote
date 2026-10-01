/*
  파일명: components/features/game/myth/shared/CountUp.tsx
  기능: 신화 게임 숫자 차오름
  책임: 결과 점수를 0에서 목표값까지 짧게 세어 올린다. 움직임을 줄인 사람에게는 바로 목표값을 보인다.
*/ // ------------------------------
"use client";

import { useEffect } from "react";
import { animate, motion, useMotionValue, useTransform } from "framer-motion";
import { EASE_OUT, useCalm } from "./motion";

interface Props {
  value: number;
  format?: (value: number) => string;
  delay?: number;
  className?: string;
}

const plain = (value: number) => value.toLocaleString();

export default function CountUp({ value, format = plain, delay = 0.2, className = "" }: Props) {
  const calm = useCalm();
  const current = useMotionValue(calm ? value : 0);
  const shown = useTransform(current, (latest) => format(Math.round(latest)));

  useEffect(() => {
    if (calm) {
      current.set(value);
      return;
    }
    const controls = animate(current, value, { duration: Math.min(1.6, 0.6 + value / 2000), delay, ease: EASE_OUT });
    return () => controls.stop();
  }, [calm, current, value, delay]);

  return <motion.span className={className}>{shown}</motion.span>;
}
