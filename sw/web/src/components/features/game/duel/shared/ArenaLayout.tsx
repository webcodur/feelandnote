import { motion } from "framer-motion";
import { Z_INDEX } from "@/constants/zIndex";
import type { ReactNode } from "react";

interface Props {
  children: ReactNode;
  themeColor?: string; // e.g. "rgba(212,175,55" (without closing parenthesis/alpha so we can add it)
  onClick?: () => void;
}

export default function ArenaLayout({
  children,
  themeColor = "rgba(212,175,55", // default gold
  onClick,
}: Props) {
  return (
    <div className="fixed inset-0" style={{ zIndex: Z_INDEX.gameDuel }} onClick={onClick}>
      <motion.div
        className="absolute inset-0 flex flex-col"
        style={{
          backgroundColor: "#0a0a0a",
          backgroundImage: `
            var(--pattern-noise),
            radial-gradient(ellipse 60% 40% at 50% 45%, ${themeColor},0.06) 0%, transparent 70%),
            radial-gradient(ellipse 100% 100% at 50% 50%, rgba(20,18,12,0.8) 0%, rgba(10,10,10,1) 70%),
            linear-gradient(to bottom, #0a0a0a, #0e0e0e 30%, #080808)
          `,
        }}
        initial={{ y: "-100%", opacity: 0.7 }}
        animate={{ y: "0%", opacity: 1 }}
        transition={{ y: { duration: 0.35, ease: [0.22, 1, 0.36, 1] }, opacity: { duration: 0.2 } }}
      >
        <div className="flex flex-col h-full w-full max-w-lg mx-auto">
          {children}
        </div>
      </motion.div>
    </div>
  );
}
