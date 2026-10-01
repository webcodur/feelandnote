/*
  파일명: components/features/game/myth/shared/Stars.tsx
  기능: 신화 게임 별점
  책임: 빈 별 자리를 먼저 두고, 받은 별을 하나씩 차례로 채워 넣는다. 별이 앉을 때 금빛 고리가 퍼진다.
        읽기 도구에는 「별 n개」 같은 이름 하나로 알린다.
*/ // ------------------------------
"use client";

import { motion } from "framer-motion";
import { Star } from "lucide-react";
import { useCalm } from "./motion";

interface Props {
  count: number;
  max?: number;
  size?: number;
  // 첫 별이 앉기까지 기다리는 초
  delay?: number;
  label?: string;
  className?: string;
}

export default function Stars({ count, max = 3, size = 34, delay = 0.25, label, className = "" }: Props) {
  const calm = useCalm();
  return (
    <span role="img" aria-label={label} className={`flex items-center justify-center gap-2 ${className}`}>
      {Array.from({ length: max }, (_, index) => {
        const at = delay + index * 0.32;
        return (
          <span key={index} aria-hidden className="relative inline-flex" style={{ width: size, height: size }}>
            <Star size={size} strokeWidth={1.5} className="absolute inset-0 fill-bg-main/60 text-accent-dim" />
            {index < count && (
              <>
                <motion.span
                  className="absolute inset-0"
                  initial={calm ? { opacity: 0 } : { opacity: 0, scale: 0.2, rotate: -40 }}
                  animate={{ opacity: 1, scale: 1, rotate: 0 }}
                  transition={calm ? { duration: 0.2, delay: at } : { type: "spring", stiffness: 420, damping: 15, delay: at }}
                >
                  <Star size={size} strokeWidth={1.5} className="fill-accent text-accent-hover drop-shadow-[0_0_10px_rgba(var(--color-accent-rgb),0.75)]" />
                </motion.span>
                {!calm && (
                  <motion.span
                    className="absolute -inset-2 rounded-full border-2 border-accent"
                    initial={{ opacity: 0, scale: 0.4 }}
                    animate={{ opacity: [0, 0.9, 0], scale: [0.4, 1.1, 1.6] }}
                    transition={{ duration: 0.7, delay: at + 0.05, ease: "easeOut" }}
                  />
                )}
              </>
            )}
          </span>
        );
      })}
    </span>
  );
}
