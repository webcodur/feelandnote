/*
  파일명: /components/shared/VersusPanels.tsx
  기능: 공용 양극 매치업 — 마주 보는 두 극의 대표자를 나란히 세운다
  책임: 좌·우 패널 + 가운데 VS 배지. href가 있으면 프로필 링크, 없으면 onSelect 버튼이 된다.
        accent로 극 강조색을 바꿔친다. 인물 표시명은 컴포넌트가 로케일로 고른다.
*/ // ------------------------------

"use client";

import { useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { celebDisplayName } from "@/lib/celeb/displayName";
import { CelebImage } from "@/components/ui";

export interface VersusSide {
  /** 극 이름 칩 (낙관·비관 등) */
  chip: string;
  nickname: string;
  nickname_en: string | null;
  avatarUrl: string | null;
  value: string | number;
  /** 보조 수치 (상위 % 등) */
  sub?: string;
  /** 한 줄 기록 */
  note?: string;
  /** 있으면 프로필 링크, 없으면 onSelect 버튼 */
  href?: string;
  onSelect?: () => void;
}

function SidePanel({
  side, align, accent,
}: {
  side: VersusSide; align: "left" | "right"; accent: string;
}) {
  const locale = useLocale();
  const right = align === "right";
  const name = celebDisplayName(side, locale);
  const cls = cn(
    "group flex w-full flex-col rounded-xl border border-white/[0.08] bg-white/[0.02] p-3.5 outline-none",
    "hover:border-white/25 hover:bg-white/[0.05] focus-visible:border-white/40 sm:p-4",
    right ? "items-end text-right" : "items-start text-left",
  );
  const inner = (
    <>
      <span
        className="rounded border px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wider"
        style={{ borderColor: `${accent}40`, color: accent }}
      >
        {side.chip}
      </span>
      <span className={cn("mt-3 flex items-center gap-3", right && "flex-row-reverse")}>
        <span className="block h-10 w-10 shrink-0 overflow-hidden rounded-full ring-1 ring-white/15">
          <CelebImage src={side.avatarUrl} alt={name} shape="circle" fallbackSize={16} />
        </span>
        <span className="min-w-0">
          <span className="block truncate font-serif text-base font-bold text-text-primary sm:text-lg">
            {name}
          </span>
          <span className={cn("flex items-baseline gap-1.5", right && "justify-end")}>
            <span className="font-cinzel text-xl font-black tabular-nums leading-tight sm:text-2xl" style={{ color: accent }}>
              {side.value}
            </span>
            {side.sub && <span className="text-[10px] font-bold text-white/35">{side.sub}</span>}
          </span>
        </span>
      </span>
      {side.note && (
        <span className="mt-2 line-clamp-2 text-xs leading-relaxed text-text-secondary">{side.note}</span>
      )}
    </>
  );

  return side.href ? (
    <Link href={side.href} prefetch={false} className={cls}>{inner}</Link>
  ) : (
    <button type="button" onClick={side.onSelect} className={cls}>{inner}</button>
  );
}

export default function VersusPanels({
  left, right, accent, vsLabel = "VS", className,
}: {
  left: VersusSide; right: VersusSide; accent: string; vsLabel?: string; className?: string;
}) {
  return (
    <div className={cn("relative mx-auto grid max-w-3xl grid-cols-2 gap-3 sm:gap-4", className)}>
      {/* 대결 배지 — 두 극이 마주 보는 매치업임을 가운데서 못박는다 */}
      <span
        aria-hidden
        className="absolute left-1/2 top-1/2 z-10 flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white/[0.12] bg-[#0a0a0c] font-cinzel text-[10px] font-black tracking-widest"
        style={{ color: accent }}
      >
        {vsLabel}
      </span>
      <SidePanel side={left} align="left" accent={accent} />
      <SidePanel side={right} align="right" accent={accent} />
    </div>
  );
}
