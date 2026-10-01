/*
  파일명: components/features/game/myth/troy/ui/battle/BattleOverlays.tsx
  기능: 트로이 전쟁 싸움 중 알림 그리기
  책임: 차례 알림(가운데 큰 띠), 맞수 장면(두 얼굴·두 사람의 외침·DB 관계 설명), 인물 외침(왼쪽 위 말풍선),
        짧은 알림(수준 오름·배 불탐)을 그린다. 움직임 줄이기를 켠 사람에게는 미끄러짐 없이 페이드만 쓴다.
*/ // ------------------------------
"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { celebAvatarSmallUrl } from "@feelandnote/shared/constants/celeb-avatar-small";
import { useCalm } from "../../../shared/motion";
import type { Side, Unit } from "../../engine";
import type { Names } from "../useNames";
import type { Bark, Overlays } from "./useOverlays";

const SIDE_BORDER: Record<Side, string> = { player: "border-hg-morale", ally: "border-status-watching", enemy: "border-status-paused" };

function Face({ unit, line, names, side }: { unit: Unit | null; line: string | null; names: Names; side: "start" | "end" }) {
  const figure = unit?.figureSlug ? names.figure(unit.figureSlug) : null;
  const src = figure?.portraitUrl ?? figure?.avatarUrl ?? null;
  return (
    <div className={`flex min-w-0 flex-1 flex-col gap-2 ${side === "end" ? "items-end text-end" : "items-start"}`}>
      <div className={`h-40 w-32 overflow-hidden rounded-2xl border-2 bg-bg-card sm:h-56 sm:w-44 ${SIDE_BORDER[unit?.side ?? "player"]}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {src && <img src={src} alt="" className="h-full w-full object-cover object-top" />}
      </div>
      <p className="max-w-full truncate text-base font-black text-text-primary sm:text-lg">{unit ? names.unitName(unit) : ""}</p>
      {line && <p className="max-w-full break-keep text-sm font-semibold leading-snug text-accent sm:text-base">“{line}”</p>}
    </div>
  );
}

function BarkBubble({ bark, names }: { bark: Bark; names: Names }) {
  const figure = names.figure(bark.slug);
  const avatar = celebAvatarSmallUrl(figure?.avatarUrl) ?? figure?.avatarUrl ?? null;
  return (
    <div className={`flex w-fit max-w-full items-center gap-2.5 rounded-2xl border bg-bg-main/92 p-2 pe-4 shadow-lg ${SIDE_BORDER[bark.side]}`}>
      <span className={`h-10 w-10 shrink-0 overflow-hidden rounded-full border bg-bg-stone-light ${SIDE_BORDER[bark.side]}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {avatar && <img src={avatar} alt="" className="h-full w-full object-cover" decoding="async" />}
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-bold text-accent">{names.figureName(bark.slug)}</span>
        <span className="block break-keep text-sm leading-snug text-text-primary">{bark.text}</span>
      </span>
    </div>
  );
}

export default function BattleOverlays({ overlays, names }: { overlays: Overlays; names: Names }) {
  const t = useTranslations("gameMythTroy.banner");
  const calm = useCalm();
  const slide = (from: number) => (calm ? { opacity: 0 } : { opacity: 0, x: from });
  const rival = overlays.rival;
  return (
    <>
      <AnimatePresence>
        {overlays.notice && (
          <motion.div key={overlays.notice} initial={slide(-60)} animate={{ opacity: 1, x: 0 }} exit={slide(60)} transition={{ duration: calm ? 0.12 : 0.35 }}
            className="pointer-events-none absolute inset-x-0 top-1/3 z-30 flex justify-center" role="status">
            <div className="w-full border-y border-accent-dim bg-bg-main/85 py-4 text-center shadow-[0_0_60px_var(--color-bg-main)]">
              <p className="text-2xl font-black tracking-[0.2em] text-accent sm:text-3xl">{overlays.notice}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {rival && (
          <motion.div key="rival" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}
            onClick={overlays.close} className="absolute inset-0 z-30 flex items-center justify-center bg-bg-main/80 px-4" role="dialog" aria-label={t("rival")}>
            <div className="w-full max-w-2xl">
              <div className="flex items-start gap-3">
                <motion.div initial={slide(-80)} animate={{ opacity: 1, x: 0 }} className="flex flex-1"><Face unit={rival.a} line={rival.lines.a} names={names} side="start" /></motion.div>
                <p className="self-center text-3xl font-black tracking-[0.3em] text-status-paused sm:text-5xl">{t("rival")}</p>
                <motion.div initial={slide(80)} animate={{ opacity: 1, x: 0 }} className="flex flex-1"><Face unit={rival.b} line={rival.lines.b} names={names} side="end" /></motion.div>
              </div>
              {rival.note && <p className="mt-5 break-keep rounded-xl border border-border bg-bg-card/95 p-4 text-center text-sm leading-relaxed text-text-primary sm:text-base">{rival.note}</p>}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <div className="pointer-events-none absolute start-2 top-20 z-30 flex max-w-[calc(100%-4.5rem)] flex-col gap-2 sm:start-4 sm:top-24 sm:max-w-sm" aria-live="polite">
        <AnimatePresence>
          {overlays.barks.map((bark) => (
            <motion.div key={bark.id} initial={calm ? { opacity: 0 } : { opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} transition={{ duration: calm ? 0.12 : 0.25 }}>
              <BarkBubble bark={bark} names={names} />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
      <div className="pointer-events-none absolute inset-x-0 top-36 z-30 flex flex-col items-center gap-2 px-4 sm:top-20" aria-live="polite">
        <AnimatePresence>
          {overlays.toasts.map((toast) => (
            <motion.p key={toast.id} initial={{ opacity: 0, y: calm ? 0 : -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="rounded-full border border-accent-dim bg-bg-main/92 px-4 py-2 text-sm font-bold text-accent shadow-lg">
              {toast.text}
            </motion.p>
          ))}
        </AnimatePresence>
      </div>
    </>
  );
}
