import { motion, AnimatePresence } from "framer-motion";
import type { ReactNode } from "react";
import { useTranslations } from "next-intl";

interface Props {
  isVisible: boolean;
  winner: "player" | "ai" | "draw";
  playerScore?: ReactNode;
  aiScore?: ReactNode;
  message?: ReactNode;
  themeColor?: string; // unused in result since it uses standard gold/red based on winner, kept for consistency if needed later
}

export default function ArenaResult({
  isVisible,
  winner,
  playerScore,
  aiScore,
  message,
}: Props) {
  const t = useTranslations("shared.game.duel");
  const isPlayerWin = winner === "player";
  const isAiWin = winner === "ai";

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className="absolute inset-0 flex items-center justify-center z-20"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <div className="absolute inset-0" style={{
            background: isPlayerWin
              ? "radial-gradient(ellipse at center, rgba(212,175,55,0.08) 0%, rgba(10,10,10,0.9) 60%)"
              : isAiWin
                ? "radial-gradient(ellipse at center, rgba(160,48,48,0.12) 0%, rgba(10,10,10,0.9) 60%)"
                : "rgba(10,10,10,0.88)",
          }} />
          
          <div className="relative text-center px-10 py-8 rounded-sm"
            style={{
              background: "linear-gradient(to bottom, #1e1c18, #111)",
              border: `1px solid ${isPlayerWin ? "rgba(212,175,55,0.2)" : isAiWin ? "rgba(160,48,48,0.2)" : "rgba(255,255,255,0.06)"}`,
              boxShadow: "0 16px 48px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.04)",
            }}
          >
            <div className={`text-2xl md:text-3xl font-cinzel tracking-[0.25em] font-bold ${
              isPlayerWin ? "text-[#d4af37]" : isAiWin ? "text-[#c04040]" : "text-white/40"
            }`}
              style={isPlayerWin
                ? { textShadow: "0 0 20px rgba(212,175,55,0.35), 0 0 40px rgba(212,175,55,0.15)" }
                : isAiWin
                  ? { textShadow: "0 0 16px rgba(192,64,64,0.3)" }
                  : undefined
              }
            >
              {isPlayerWin ? t("result.victory") : isAiWin ? t("result.defeat") : t("result.draw")}
            </div>
            
            {playerScore !== undefined && aiScore !== undefined && (
              <div className="text-[11px] md:text-xs font-mono text-white/30 mt-3 tabular-nums">
                {playerScore} vs {aiScore}
              </div>
            )}
            
            {message && (
              <div className="text-[11px] md:text-xs font-serif text-white/40 mt-3">
                {message}
              </div>
            )}
            
            <div className="text-[10px] md:text-[11px] font-serif text-white/25 mt-2">
              {isPlayerWin ? t("result.playerEffect")
                : isAiWin ? t("result.enemyEffect")
                : t("result.drawEffect")}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
