/*
  파일명: components/features/game/hegemony/title/SubPanel.tsx
  기능: 타이틀 보조 화면 틀
  책임: 규칙·전적·설정이 같은 틀(제목·돌아가기·스크롤 본문)을 쓰게 한다. 옆에서 밀려 들어온다.
*/
"use client";

import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import GameButton from "../ui/GameButton";
import { PANEL } from "../ui/tokens";

interface Props {
  title: string;
  backLabel: string;
  onBack: () => void;
  children: ReactNode;
  wide?: boolean;
}

export default function SubPanel({ title, backLabel, onBack, children, wide = false }: Props) {
  return (
    <motion.section
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 24 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className={`${PANEL} flex max-h-full w-full flex-col ${wide ? "max-w-3xl" : "max-w-xl"}`}
    >
      <header className="flex items-center justify-between gap-3 border-b border-hg-line/70 px-5 py-4">
        <h2 className="text-xl font-black text-hg-bright">{title}</h2>
        <GameButton size="sm" variant="ghost" onClick={onBack} icon={<ArrowLeft size={16} />}>
          {backLabel}
        </GameButton>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">{children}</div>
    </motion.section>
  );
}
