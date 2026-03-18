/*
  말풍선 컴포넌트
*/
import { motion } from "framer-motion";

export default function SpeechBubble({ text, side }: { text: string; side: "player" | "ai" }) {
  const isPlayer = side === "player";
  // DuelFighter는 200×200, 아바타(88px)는 중앙 배치 → 머리 위 = top ≈ 36px
  // 양쪽 모두 인물 머리 바로 위에 띄운다
  return (
    <motion.div
      className="absolute z-30 pointer-events-none"
      style={{
        width: 170,
        bottom: 160, // 200px 컨테이너 바닥에서 160px 위 = 머리 바로 위
        ...(isPlayer ? { left: -10 } : { right: -10 }),
      }}
      initial={{ scale: 0.6, opacity: 0, y: 8 }}
      animate={{ scale: 1, opacity: 1, y: 0 }}
      exit={{ scale: 0.7, opacity: 0 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
    >
      <div
        className="relative rounded-lg px-3 py-2 text-xs leading-relaxed text-white/90"
        style={{
          background: "rgba(10,8,6,0.9)",
          border: "1px solid rgba(212,175,55,0.2)",
          boxShadow: "0 4px 16px rgba(0,0,0,0.6)",
        }}
      >
        {text}
        {/* Tail — 말풍선 꼬리 (항상 아래쪽) */}
        <div
          className="absolute w-2.5 h-2.5 rotate-45"
          style={{
            background: "rgba(10,8,6,0.9)",
            bottom: -5,
            ...(isPlayer
              ? { left: 20, borderRight: "1px solid rgba(212,175,55,0.2)", borderBottom: "1px solid rgba(212,175,55,0.2)" }
              : { right: 20, borderRight: "1px solid rgba(212,175,55,0.2)", borderBottom: "1px solid rgba(212,175,55,0.2)" }),
          }}
        />
      </div>
    </motion.div>
  );
}
