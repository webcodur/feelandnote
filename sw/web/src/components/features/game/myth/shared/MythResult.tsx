/*
  파일명: components/features/game/myth/shared/MythResult.tsx
  기능: 신화 게임 공용 결과 화면
  책임: 큰 점수(또는 별)·기록 문구·다시 하기/처음으로 버튼의 자리를 게임마다 같게 둔다.
        점수는 세어 올리고(value), 별은 하나씩 채우며(stars), 새 기록이면 금빛 표시가 튀어 오른다.
        표지 대신 세울 인물(hero), 숫자 칸(stats), 게임마다 다른 되짚기(children)를 받는다.
        표지가 있으면 이름표·제목은 표지 아래쪽 어둠 안에 올리고, 점수는 표지 밑에 따로 세운다.
*/ // ------------------------------
"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { Crown, RotateCcw } from "lucide-react";
import { pop, rise, stagger, useCalm } from "./motion";
import { useStageArt } from "./stage";
import { BTN_GOLD, BTN_STONE, SHINE } from "./ui";
import { Eyebrow } from "./Plate";
import CountUp from "./CountUp";
import Stars from "./Stars";
import ResultRays from "./ResultRays";
import StagePoster from "./StagePoster";

export interface ResultStat {
  key: string;
  label: string;
  value: ReactNode;
  tone?: "gold" | "good" | "bad" | "plain";
}

const STAT_TONE = { gold: "text-accent", good: "text-status-watching", bad: "text-status-paused", plain: "text-text-primary" } as const;

interface Props {
  title: string;
  score: string;
  lines: string[];
  isNewBest: boolean;
  bestLabel?: string | null;
  onReplay: () => void;
  onLobby: () => void;
  children?: ReactNode;
  // 세어 올릴 숫자. 주면 score 대신 이 값을 format으로 적는다
  value?: number;
  format?: (value: number) => string;
  // 별점. 주면 score 대신 별을 채운다(score는 읽기 도구 이름으로 쓴다)
  stars?: { count: number; max: number };
  // 이기지 못한 판은 빛 연출을 끈다
  outcome?: "win" | "lose";
  eyebrow?: string;
  // 큰 점수 자리를 비운다(결말 이름이 곧 제목인 게임)
  hideScore?: boolean;
  // 맞힌 수·최고 연속처럼 곁들이는 숫자를 돌판 칸으로 나란히 보인다
  stats?: ResultStat[];
  // 표지 그림 대신 맨 위에 세울 것(비밀 인물 얼굴·결말 인물 사진)
  hero?: ReactNode;
  // 제목 바로 아래 한 줄(인물의 호칭처럼 제목에 딸린 말)
  subtitle?: string | null;
  // 제목 다음에 읽을 이야기 한 단락(결말 이야기처럼 숫자보다 먼저 읽을 글)
  lede?: string | null;
}

export default function MythResult(props: Props) {
  const { title, score, lines, isNewBest, bestLabel, onReplay, onLobby, children, value, format, stars, outcome = "win", eyebrow, hideScore = false, stats, hero, subtitle, lede } = props;
  const t = useTranslations("shared.game.myth");
  const calm = useCalm();
  const art = useStageArt();
  const item = rise(calm);
  // 표지가 있으면 이름표·제목을 표지 아래쪽 어둠 안에 올리고, 점수는 표지 밑에 따로 세워 금테에 걸리지 않게 한다
  const onPoster = !hero && Boolean(art);
  const heading = (
    <>
      <motion.div variants={item} className="relative"><Eyebrow>{eyebrow ?? t("result")}</Eyebrow></motion.div>
      <motion.h2 variants={item} className="relative text-balance break-keep text-3xl font-black leading-tight tracking-tight text-text-primary drop-shadow-[0_2px_14px_var(--color-bg-secondary)] sm:text-4xl">
        {title}
      </motion.h2>
      {subtitle && <motion.p variants={item} className="relative -mt-1.5 max-w-md text-balance break-keep text-base font-semibold text-text-secondary">{subtitle}</motion.p>}
    </>
  );

  return (
    <motion.div variants={stagger(calm, 0.08)} initial="hidden" animate="show" className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center gap-5 py-4 text-center sm:py-8">
      <div className="relative w-full">
        {hero && <motion.div variants={pop(calm, 0.9)} className="relative z-[1] flex justify-center">{hero}</motion.div>}
        {onPoster && (
          <motion.div variants={pop(calm, 0.96)} className="relative z-[1]">
            <StagePoster src={art} className="aspect-[16/9] w-full sm:aspect-[21/9]" sizes="(min-width: 768px) 672px, 100vw">
              <div className="absolute inset-x-0 bottom-0 flex flex-col items-center gap-2 px-6 pb-7 sm:gap-3 sm:pb-8">{heading}</div>
            </StagePoster>
          </motion.div>
        )}
        {(!onPoster || !hideScore || isNewBest || Boolean(bestLabel) || Boolean(lede)) && (
          <div className={`relative flex flex-col items-center gap-3 px-2 ${hero ? "pt-2" : "pt-5"}`}>
            {outcome === "win" && <ResultRays />}
            {!onPoster && heading}
            {lede && <motion.p variants={item} className="relative max-w-xl text-balance break-keep text-base leading-relaxed text-text-primary sm:text-lg">{lede}</motion.p>}
            {!hideScore && (
              <motion.div variants={pop(calm, 0.6)} className="relative">
                {stars && <Stars count={stars.count} max={stars.max} size={44} delay={0.45} label={score} />}
                {!stars && (
                  <p className="text-6xl font-black tabular-nums tracking-tight text-accent drop-shadow-[0_0_24px_rgba(var(--color-accent-rgb),0.45)] sm:text-7xl">
                    {value !== undefined && <CountUp value={value} format={format} delay={0.35} />}
                    {value === undefined && score}
                  </p>
                )}
              </motion.div>
            )}
            {isNewBest && (
              <motion.p variants={pop(calm, 0.4)} className="relative inline-flex min-h-9 items-center gap-2 rounded-full border border-accent bg-accent/15 px-4 text-sm font-bold text-accent shadow-[0_0_28px_rgba(var(--color-accent-rgb),0.35)]">
                <Crown size={16} aria-hidden />
                {t("newBest")}
              </motion.p>
            )}
            {!isNewBest && bestLabel && <motion.p variants={item} className="relative text-sm font-semibold text-text-secondary">{bestLabel}</motion.p>}
          </div>
        )}
      </div>
      {stats && stats.length > 0 && (
        <motion.dl variants={item} className="flex w-full flex-wrap justify-center gap-2 sm:gap-3">
          {stats.map((stat) => (
            <div key={stat.key} className="flex min-w-28 flex-1 flex-col items-center gap-1 rounded-xl border border-border bg-bg-card/85 px-2 py-2.5 sm:max-w-44 sm:px-3">
              <dt className="text-sm font-semibold text-text-secondary">{stat.label}</dt>
              <dd className={`whitespace-nowrap text-xl font-black tabular-nums tracking-tight sm:text-2xl ${STAT_TONE[stat.tone ?? "plain"]}`}>{stat.value}</dd>
            </div>
          ))}
        </motion.dl>
      )}
      {lines.map((line) => (
        <motion.p key={line} variants={item} className="max-w-xl text-balance break-keep text-base leading-relaxed text-text-primary">{line}</motion.p>
      ))}
      <motion.div variants={item} className="flex w-full flex-col justify-center gap-2 sm:w-auto sm:flex-row">
        <button type="button" onClick={onReplay} className={`${BTN_GOLD} min-w-40`}>
          <span aria-hidden className={SHINE} />
          <RotateCcw size={18} aria-hidden />
          {t("replay")}
        </button>
        <button type="button" onClick={onLobby} className={`${BTN_STONE} min-w-40`}>{t("toLobby")}</button>
      </motion.div>
      {children && <motion.div variants={item} className="flex w-full flex-col items-center gap-4">{children}</motion.div>}
    </motion.div>
  );
}
