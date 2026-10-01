/*
  파일명: components/features/game/myth/shared/MythLobby.tsx
  기능: 신화 게임 공용 시작 화면
  책임: 표지 그림·게임 이름·소개·규칙·최고 기록·시작 버튼의 자리를 게임마다 같게 둔다.
        게임마다 다른 선택(난이도·신화 고르기)은 children으로 받고, 선택 한 줄은 LobbyOption으로 짓는다.
        PC는 표지와 글을 좌우로, 휴대폰은 위아래로 놓고 시작 버튼을 화면 아래에 붙이며 선택을 규칙 앞으로 올린다.
*/ // ------------------------------
"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { Play, Trophy } from "lucide-react";
import { pop, rise, stagger, useCalm } from "./motion";
import { useStageArt } from "./stage";
import { BTN_GOLD, SHINE, STICK_BOTTOM } from "./ui";
import Plate, { Eyebrow } from "./Plate";
import StagePoster from "./StagePoster";

export { CHIP, CHIP_OFF, CHIP_ON } from "./ui";

interface Props {
  title: string;
  intro: string;
  rules: string[];
  bestLabel?: string | null;
  canStart: boolean;
  onStart: () => void;
  startLabel?: string;
  children?: ReactNode;
  // 제목 위 작은 이름표. 비우면 「신화 게임」
  eyebrow?: string;
  // 표지 그림. 주지 않으면 틀의 배경 그림을 쓰고, null이면 표지 없이 글만 둔다
  art?: string | null;
}

const NUMERALS = ["Ⅰ", "Ⅱ", "Ⅲ", "Ⅳ", "Ⅴ", "Ⅵ"];

// 시작 화면의 선택 한 줄 — 이름표와 칩 묶음
export function LobbyOption({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-semibold text-text-secondary">{label}</span>
      <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

export default function MythLobby({ title, intro, rules, bestLabel, canStart, onStart, startLabel, children, eyebrow, art }: Props) {
  const t = useTranslations("gameMyth.shared");
  const calm = useCalm();
  const stageArt = useStageArt();
  const poster = art === undefined ? stageArt : art;
  const item = rise(calm);
  const layout = poster ? "max-w-6xl lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:gap-14" : "max-w-2xl";

  return (
    <motion.div
      variants={stagger(calm)}
      initial="hidden"
      animate="show"
      className={`mx-auto grid w-full flex-1 content-center items-center gap-6 py-2 lg:py-8 ${layout}`}
    >
      {poster && (
        <motion.div variants={pop(calm, 0.95)}>
          <StagePoster src={poster} className="aspect-[16/9] w-full lg:aspect-[4/3]" />
        </motion.div>
      )}
      <div className="flex min-w-0 flex-col gap-5">
        <motion.div variants={item}><Eyebrow>{eyebrow ?? t("hubName")}</Eyebrow></motion.div>
        <motion.h1 variants={item} className="text-balance break-keep text-4xl font-black leading-[1.12] tracking-tight text-text-primary sm:text-5xl lg:text-6xl">
          {title}
        </motion.h1>
        <motion.p variants={item} className="max-w-xl break-keep text-base leading-relaxed text-text-secondary sm:text-lg">{intro}</motion.p>
        {/* 휴대폰에서는 선택을 규칙보다 앞에 두어, 화면 아래에 붙은 시작 버튼이 선택을 가리지 않게 한다 */}
        <motion.div variants={item} className="max-lg:order-1">
          <Plate className="px-4 py-4 sm:px-5">
            <ol className="relative flex flex-col gap-3">
              {rules.map((rule, index) => (
                <li key={rule} className="flex gap-3 text-sm leading-relaxed text-text-primary sm:text-base">
                  <span aria-hidden className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-accent-dim bg-accent/10 text-sm font-bold text-accent">
                    {NUMERALS[index] ?? index + 1}
                  </span>
                  <span className="break-keep">{rule}</span>
                </li>
              ))}
            </ol>
          </Plate>
        </motion.div>
        {children && <motion.div variants={item} className="flex flex-col gap-4">{children}</motion.div>}
        <motion.div
          variants={item}
          className={`${STICK_BOTTOM} z-[3] -mx-3 flex flex-col gap-2 max-lg:order-2 bg-linear-to-t from-bg-main via-bg-main/95 to-transparent px-3 pt-5 sm:-mx-5 sm:px-5 lg:static lg:mx-0 lg:bg-none lg:px-0 lg:pb-0 lg:pt-1`}
        >
          {!canStart && <p className="text-sm font-semibold text-status-paused">{t("notEnough")}</p>}
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <button type="button" onClick={onStart} disabled={!canStart} className={`${BTN_GOLD} min-h-14 w-full px-10 text-lg sm:w-auto`}>
              <span aria-hidden className={SHINE} />
              <Play size={20} aria-hidden className="fill-bg-main" />
              {startLabel ?? t("start")}
            </button>
            {bestLabel && (
              <p className="inline-flex items-center gap-2 text-sm font-semibold text-accent">
                <Trophy size={16} aria-hidden />
                {bestLabel}
              </p>
            )}
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
