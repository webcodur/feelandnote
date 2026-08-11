/*
  파일명: /components/features/user/explore/spectrumAnalysis/SpectrumReasonModal.tsx
  기능: 성향 수치 근거 모달
  책임: 클릭한 인물의 해당 성향 값·근거 문구 표시, 인물 상세 페이지로 이동.
*/ // ------------------------------

"use client";

import { createPortal } from "react-dom";
import { useLocale, useTranslations } from "next-intl";
import { Z_INDEX } from "@/constants/zIndex";
import { ExternalLink } from "lucide-react";
import { Link } from "@/i18n/navigation";
import BlurDissolve from "@/components/ui/BlurDissolve";
import { TENDENCY_LABELS, type TendencyKey } from "@/lib/spectrum/constants";
import { AXIS_POLE_COLORS, initials } from "./constants";
import type { SpectrumPerson } from "@/actions/spectrum/getSpectrumDistribution";

interface SpectrumReasonModalProps {
  person: SpectrumPerson;
  axis: TendencyKey;
  reason: { ko: string; en: string } | null;
  loading: boolean;
  onClose: () => void;
}

export default function SpectrumReasonModal({ person, axis, reason, loading, onClose }: SpectrumReasonModalProps) {
  const locale = useLocale();
  const t = useTranslations("explore.ui.spectrumReason");

  const v = person.stats[axis] ?? 0;
  const [neg, pos] = TENDENCY_LABELS[axis];
  const colors = AXIS_POLE_COLORS[axis];
  const sideColor = v >= 0 ? colors.pos : colors.neg;
  const sideLabel = v >= 0 ? pos : neg;
  const reasonText = reason ? (locale === "en" ? reason.en : reason.ko) : "";
  const shownName = locale === "en" ? (person.nickname_en || person.nickname) : person.nickname;

  if (typeof window === "undefined") return null;
  // 페이지 본문 래퍼(z-10) 안에서는 하단 네비(z-100)를 못 덮는다 — body로 포털해서 띄운다
  return createPortal(
    <div className="fixed inset-0 flex items-center justify-center bg-black/60 p-4" style={{ zIndex: Z_INDEX.modal }} onClick={onClose}>
      <div className="w-full max-w-sm rounded-2xl border border-border/60 bg-bg-card p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        {/* 헤더 */}
        <div className="flex items-center gap-4">
          <div className="size-16 shrink-0 overflow-hidden rounded-full border-2 bg-bg-card" style={{ borderColor: sideColor }}>
            {person.avatar_url ? (
              <BlurDissolve className="size-full">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={person.avatar_url} alt={shownName} className="size-full object-cover" />
              </BlurDissolve>
            ) : (
              <div className="flex size-full items-center justify-center text-sm font-bold text-text-secondary">{initials(shownName)}</div>
            )}
          </div>
          <div className="min-w-0">
            <h3 className="truncate text-lg font-bold text-text-primary">{shownName}</h3>
            <p className="mt-0.5 text-sm font-bold" style={{ color: sideColor }}>
              {neg} ↔ {pos} · {sideLabel} {Math.abs(Math.round(v))}
            </p>
          </div>
        </div>

        {/* 수치 근거 */}
        {loading ? (
          <p className="mt-4 text-sm text-text-secondary/50">{t("loading")}</p>
        ) : (
          reasonText && <p className="mt-4 text-sm leading-relaxed text-text-secondary">{reasonText}</p>
        )}

        {/* 액션 */}
        <div className="mt-6 flex gap-2">
          <Link
            href={`/celeb/${person.slug ?? person.id}`}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-accent py-2.5 text-sm font-bold text-black transition-transform active:scale-[0.98]"
          >
            <ExternalLink size={14} strokeWidth={2.5} />
            {t("figureDetail")}
          </Link>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-border/60 px-4 py-2.5 text-sm font-semibold text-text-secondary transition-colors hover:text-text-primary"
          >
            {t("close")}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
