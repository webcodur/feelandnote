"use client";

import { UserRound, Users } from "lucide-react";

import CelebDetailCardButton from "@/components/shared/CelebDetailCardButton";

interface FactionMobileInfoPanelProps {
  kind: "team" | "celeb";
  eyebrow: string;
  title: string;
  subtitle?: string | null;
  description?: string | null;
  meta?: string | null;
  accentColor: string;
  detailLabel?: string;
  detailLoading?: boolean;
  detailError?: string | null;
  onOpenDetail?: () => void;
}

export default function FactionMobileInfoPanel({
  kind,
  eyebrow,
  title,
  subtitle,
  description,
  meta,
  accentColor,
  detailLabel,
  detailLoading = false,
  detailError,
  onOpenDetail,
}: FactionMobileInfoPanelProps) {
  return (
    <section className="relative overflow-hidden rounded-[18px] border border-white/10 bg-[#111211] shadow-[0_16px_36px_rgba(0,0,0,0.24)] md:hidden">
      <span
        aria-hidden
        className="absolute inset-x-0 top-0 h-0.5"
        style={{ backgroundColor: accentColor }}
      />

      <div className="px-5 pb-5 pt-5">
        <p
          className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em]"
          style={{ color: accentColor }}
        >
          {kind === "team" ? <Users size={13} aria-hidden /> : <UserRound size={13} aria-hidden />}
          {eyebrow}
        </p>

        <h3 className="mt-2 break-keep font-serif text-[28px] font-black leading-[1.15] text-white">
          {title}
        </h3>

        {subtitle ? (
          <p className="mt-2 break-keep text-[13px] font-bold leading-5 text-amber-400/85">
            {subtitle}
          </p>
        ) : null}

        {description ? (
          <p className="mt-4 whitespace-pre-line break-keep border-t border-white/10 pt-4 text-[14px] font-medium leading-6 text-white/72">
            {description}
          </p>
        ) : null}

        {meta ? (
          <p className="mt-4 font-mono text-[11px] font-bold tracking-wide text-white/75">
            {meta}
          </p>
        ) : null}

        {onOpenDetail && detailLabel ? (
          <CelebDetailCardButton
            label={detailLabel}
            loading={detailLoading}
            onClick={onOpenDetail}
            size="panel"
            showLabel
            className="mt-5"
          />
        ) : null}

        {detailError ? (
          <p role="alert" className="mt-3 text-xs leading-5 text-red-200">
            {detailError}
          </p>
        ) : null}
      </div>
    </section>
  );
}
