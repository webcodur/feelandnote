/*
  파일명: components/features/game/myth/shared/MythBackdrop.tsx
  기능: 신화 게임 배경 무대
  책임: 신화 타이틀 그림을 화면 크기에 맞는 판으로 깔고, 천천히 다가오는 움직임·가장자리 어둠·
        위쪽 금빛 조명·돌 결·양옆 기둥 선을 겹쳐 깊이를 만든다. 그림이 없으면 조명과 결만 남는다.
*/ // ------------------------------
"use client";

import { motion } from "framer-motion";
import { artAt, artSrcSet } from "./art";
import { useCalm } from "./motion";

const VIGNETTE =
  "bg-[radial-gradient(ellipse_at_50%_38%,transparent_0%,color-mix(in_srgb,var(--color-bg-main)_62%,transparent)_58%,var(--color-bg-main)_100%)]";
const TOP_LIGHT = "bg-[radial-gradient(ellipse_at_50%_-10%,rgba(var(--color-accent-rgb),0.16),transparent_55%)]";
const PILLAR = "absolute inset-y-0 hidden w-px bg-linear-to-b from-transparent via-accent/25 to-transparent lg:block";

export default function MythBackdrop({ src }: { src: string | null }) {
  const calm = useCalm();
  const image = artAt(src, 1024);
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden bg-bg-main">
      {image && (
        <motion.img
          src={image}
          srcSet={artSrcSet(src)}
          sizes="100vw"
          alt=""
          decoding="async"
          className="absolute inset-0 h-full w-full object-cover opacity-50 saturate-[0.8]"
          initial={{ scale: 1.03 }}
          animate={calm ? { scale: 1.03 } : { scale: [1.03, 1.12] }}
          transition={{ duration: 36, ease: "linear", repeat: Infinity, repeatType: "mirror" }}
        />
      )}
      <div className={`absolute inset-0 ${VIGNETTE}`} />
      <div className="absolute inset-0 bg-linear-to-b from-bg-main/70 via-transparent to-bg-main" />
      <div className={`absolute inset-0 ${TOP_LIGHT}`} />
      <div className="absolute inset-0 bg-[image:var(--pattern-noise)] opacity-70" />
      <span className={`${PILLAR} start-[4%]`} />
      <span className={`${PILLAR} end-[4%]`} />
    </div>
  );
}
