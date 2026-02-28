import { motion, AnimatePresence } from "framer-motion";
import type { BattleCard } from "@/lib/game/types";

interface RuleItem {
  icon: string;
  text: React.ReactNode;
}

interface Props {
  isVisible: boolean;
  onDismiss: () => void;
  playerCard: BattleCard;
  aiCard: BattleCard;
  title: string;
  themeColor?: string; // rgb format e.g. "212,175,55"
  themeColorHex?: string; // hex format e.g. "#d4af37"
  rules: RuleItem[];
  footerText: string;
}

export default function ArenaIntro({
  isVisible,
  onDismiss,
  playerCard,
  aiCard,
  title,
  themeColor = "212,175,55",
  themeColorHex = "#d4af37",
  rules,
  footerText,
}: Props) {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className="absolute inset-0 z-30 flex items-center justify-center px-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="absolute inset-0" style={{ background: "rgba(10,10,10,0.88)" }} />
          <button
            onClick={(e) => { e.stopPropagation(); onDismiss(); }}
            className="relative w-full max-w-[300px] md:max-w-xs text-left rounded-sm px-5 py-5 space-y-4"
            style={{
              background: "linear-gradient(to bottom, #1e1c18, #141310)",
              border: `1px solid rgba(${themeColor}, 0.25)`,
              boxShadow: `inset 0 1px 0 rgba(255,255,255,0.05), inset 0 -1px 0 rgba(0,0,0,0.3), 0 12px 40px rgba(0,0,0,0.7), 0 0 60px rgba(${themeColor}, 0.06)`,
            }}
          >
            <div className="absolute top-0 left-4 right-4 h-px"
              style={{ background: `linear-gradient(to right, transparent, rgba(${themeColor}, 0.3), transparent)` }}
            />
            
            <div className="text-center">
              <div className="font-cinzel text-xl tracking-[0.3em]"
                style={{ color: themeColorHex, textShadow: `0 0 12px rgba(${themeColor}, 0.2)` }}
              >
                {title}
              </div>
              <div className="text-[11px] md:text-xs font-serif text-white/40 mt-1 tracking-wide">
                {playerCard.nickname} vs {aiCard.nickname}
              </div>
            </div>

            <div className="space-y-2 text-[11px] md:text-xs text-white/40">
              {rules.map((rule, idx) => (
                <div key={idx} className="flex items-center gap-2.5">
                  <span className="w-5 text-center text-sm md:text-base opacity-70">{rule.icon}</span>
                  <span>{rule.text}</span>
                </div>
              ))}
            </div>

            <div className="text-[10px] text-white/20 font-serif whitespace-pre-line">
              {footerText}
            </div>

            <div className="absolute bottom-0 left-4 right-4 h-px"
              style={{ background: `linear-gradient(to right, transparent, rgba(${themeColor}, 0.2), transparent)` }}
            />
            
            <div className="text-center text-[10px] md:text-[11px] font-cinzel tracking-[0.2em] pt-1 animate-pulse"
              style={{ color: `rgba(${themeColor}, 0.4)` }}
            >
              TAP TO START
            </div>
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
