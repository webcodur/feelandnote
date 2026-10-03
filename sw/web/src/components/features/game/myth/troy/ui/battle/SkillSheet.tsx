/*
  파일명: components/features/game/myth/troy/ui/battle/SkillSheet.tsx
  기능: 트로이 전쟁 기술 확인 칸
  책임: 기술 단추를 누르면 곧바로 쓰지 않고 이름·설명을 먼저 보여 준다. 스스로 거는 기술은 「쓰기」로 쓰고,
        대상을 고르는 기술은 판에서 대상을 누르라고 알린다. 휴대폰에서도 기술 설명을 읽을 수 있게 하려는 칸이다.
*/ // ------------------------------
"use client";

import { Sparkles, Undo2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { MODAL_MAX_HEIGHT } from "@/components/ui/modalLayout";
import type { SkillKey, Unit } from "../../engine";
import type { Names } from "../useNames";

interface Props {
  unit: Unit;
  skill: SkillKey;
  names: Names;
  // 대상을 고르는 중이면 true(쓰기 단추 대신 안내를 보인다)
  picking: boolean;
  onUse: () => void;
  onCancel: () => void;
}

export default function SkillSheet({ unit, skill, names, picking, onUse, onCancel }: Props) {
  const t = useTranslations("gameMythTroy");
  return (
    <div className="pointer-events-auto w-full overflow-y-auto rounded-2xl border border-border-gold bg-bg-main/95 p-3 shadow-[0_18px_40px_-16px_var(--color-bg-main)] backdrop-blur-sm sm:w-[26rem] sm:p-4" style={{ maxHeight: MODAL_MAX_HEIGHT }} role="dialog" aria-label={t(`skills.${skill}.name`)}>
      <p className="flex items-center gap-2 text-sm text-text-secondary">
        <Sparkles className="h-4 w-4 text-accent" aria-hidden />
        <span className="font-semibold text-text-primary">{names.unitName(unit)}</span>
        <span aria-hidden>·</span>
        <span className="font-bold text-accent">{t(`skills.${skill}.name`)}</span>
      </p>
      <p className="mt-1.5 break-keep text-base leading-relaxed text-text-primary">{t(`skills.${skill}.desc`)}</p>
      {picking && <p className="mt-2 text-sm font-semibold text-accent">{t("hud.pickTarget")}</p>}
      <div className="mt-3 flex gap-2">
        <button type="button" onClick={onCancel} className="inline-flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-lg border border-border bg-bg-card text-sm font-semibold text-text-secondary hover:border-accent hover:text-accent">
          <Undo2 className="h-4 w-4" aria-hidden />{t("action.cancel")}
        </button>
        {!picking && (
          <button type="button" onClick={onUse} className="inline-flex min-h-11 flex-[2] items-center justify-center gap-1.5 rounded-lg border border-accent-hover/40 bg-accent text-base font-bold text-bg-main hover:bg-accent-hover">
            <Sparkles className="h-4 w-4" aria-hidden />{t("action.use")}
          </button>
        )}
      </div>
    </div>
  );
}
