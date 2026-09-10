/*
  파일명: /components/features/home/CelebBirthYearFilter.tsx
  기능: 셀럽 목록의 생년 범위 필터 (range slider)
  책임: 연도 ↔ 트랙 위치 변환은 lib/celeb/birthYearScale에 위임하고,
        이 파일은 드래그·키보드 조작과 데스크톱 드롭다운/모바일 모달 두 트리거만 담당한다
*/
"use client";

import { useCallback, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { createPortal } from "react-dom";
import { Calendar } from "lucide-react";
import { useTranslations } from "next-intl";
import Button from "@/components/ui/Button";
import Modal, { ModalFooter } from "@/components/ui/Modal";
import { Z_INDEX } from "@/constants/zIndex";
import { BIRTH_YEAR_MIN, BIRTH_YEAR_MAX, yearToPercent, percentToYear } from "@/lib/celeb/birthYearScale";

interface BirthYearRange {
  min?: number;
  max?: number;
}

interface CelebBirthYearFilterProps {
  min?: number;
  max?: number;
  isLoading?: boolean;
  onChange: (min: number | undefined, max: number | undefined) => void;
}

// 풀레인지면 필터 없음으로 취급한다 — 다른 필터들의 "all이면 지운다" 관례와 통일.
function normalize(draft: Required<BirthYearRange>): BirthYearRange {
  if (draft.min <= BIRTH_YEAR_MIN && draft.max >= BIRTH_YEAR_MAX) return {};
  return { min: draft.min, max: draft.max };
}

function formatYear(year: number, t: ReturnType<typeof useTranslations>): string {
  return year < 0 ? t("bc", { year: -year }) : String(year);
}

// ── 핵심 슬라이더 (트랙 + 듀얼 썸 + 숫자 입력) ──────────────────────────
function BirthYearSliderCore({ min, max, onChange }: CelebBirthYearFilterProps) {
  const t = useTranslations("home.ui.birthYear");
  const trackRef = useRef<HTMLDivElement>(null);
  const [draft, setDraft] = useState<Required<BirthYearRange>>({
    min: min ?? BIRTH_YEAR_MIN,
    max: max ?? BIRTH_YEAR_MAX,
  });

  const commit = useCallback((next: Required<BirthYearRange>) => {
    setDraft(next);
    const normalized = normalize(next);
    onChange(normalized.min, normalized.max);
  }, [onChange]);

  const yearFromClientX = useCallback((clientX: number) => {
    const track = trackRef.current;
    if (!track) return null;
    const rect = track.getBoundingClientRect();
    const percent = ((clientX - rect.left) / rect.width) * 100;
    return percentToYear(percent);
  }, []);

  const dragThumb = useCallback((thumb: "min" | "max", e: ReactPointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    const handleMove = (moveEvent: PointerEvent) => {
      const year = yearFromClientX(moveEvent.clientX);
      if (year === null) return;
      setDraft((prev) => {
        if (thumb === "min") return { ...prev, min: Math.min(year, prev.max) };
        return { ...prev, max: Math.max(year, prev.min) };
      });
    };
    const handleUp = () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
      setDraft((prev) => {
        commit(prev);
        return prev;
      });
    };
    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
  }, [yearFromClientX, commit]);

  const nudgeThumb = useCallback((thumb: "min" | "max", e: ReactKeyboardEvent<HTMLDivElement>) => {
    const step = e.key === "ArrowLeft" || e.key === "ArrowDown" ? -1 : e.key === "ArrowRight" || e.key === "ArrowUp" ? 1 : 0;
    if (step === 0) return;
    e.preventDefault();
    const bigStep = e.shiftKey ? 10 : 1;
    setDraft((prev) => {
      const next = thumb === "min"
        ? { ...prev, min: Math.min(Math.max(prev.min + step * bigStep, BIRTH_YEAR_MIN), prev.max) }
        : { ...prev, max: Math.max(Math.min(prev.max + step * bigStep, BIRTH_YEAR_MAX), prev.min) };
      commit(next);
      return next;
    });
  }, [commit]);

  const handleInputCommit = useCallback((thumb: "min" | "max", raw: string) => {
    const parsed = parseInt(raw, 10);
    if (isNaN(parsed)) return;
    const clamped = Math.min(BIRTH_YEAR_MAX, Math.max(BIRTH_YEAR_MIN, parsed));
    commit(thumb === "min"
      ? { ...draft, min: Math.min(clamped, draft.max) }
      : { ...draft, max: Math.max(clamped, draft.min) });
  }, [draft, commit]);

  const handleReset = useCallback(() => {
    commit({ min: BIRTH_YEAR_MIN, max: BIRTH_YEAR_MAX });
  }, [commit]);

  const minPercent = yearToPercent(draft.min);
  const maxPercent = yearToPercent(draft.max);
  const isFullRange = draft.min <= BIRTH_YEAR_MIN && draft.max >= BIRTH_YEAR_MAX;

  return (
    <div className="w-full p-4 min-w-[280px]">
      <div className="mb-4 flex items-center justify-between">
        <span className="text-sm font-bold text-text-primary">
          {isFullRange ? t("all") : t("range", { min: formatYear(draft.min, t), max: formatYear(draft.max, t) })}
        </span>
        <Button
          type="button"
          unstyled
          onClick={handleReset}
          disabled={isFullRange}
          className="text-xs text-accent/70 hover:text-accent disabled:opacity-30 disabled:cursor-not-allowed"
        >
          {t("reset")}
        </Button>
      </div>

      {/* 트랙 */}
      <div ref={trackRef} className="relative h-1.5 rounded-full bg-white/10 mx-2">
        <div
          className="absolute h-full rounded-full bg-accent"
          style={{ left: `${minPercent}%`, width: `${Math.max(0, maxPercent - minPercent)}%` }}
        />
        {(["min", "max"] as const).map((thumb) => (
          <div
            key={thumb}
            role="slider"
            tabIndex={0}
            aria-label={t(thumb === "min" ? "minLabel" : "maxLabel")}
            aria-valuemin={BIRTH_YEAR_MIN}
            aria-valuemax={BIRTH_YEAR_MAX}
            aria-valuenow={thumb === "min" ? draft.min : draft.max}
            onPointerDown={(e) => dragThumb(thumb, e)}
            onKeyDown={(e) => nudgeThumb(thumb, e)}
            className="absolute top-1/2 h-4 w-4 -translate-y-1/2 -translate-x-1/2 rounded-full border-2 border-accent bg-bg-main cursor-grab active:cursor-grabbing hover:bg-accent transition-transform hover:scale-125 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
            style={{ left: `${thumb === "min" ? minPercent : maxPercent}%` }}
          />
        ))}
      </div>

      {/* 정확한 연도 입력 */}
      <div className="mt-5 flex items-center gap-2">
        <label className="flex-1">
          <span className="mb-1 block text-[10px] uppercase tracking-wide text-text-secondary">{t("minLabel")}</span>
          <input
            type="number"
            defaultValue={draft.min}
            key={`min-${draft.min}`}
            onBlur={(e) => handleInputCommit("min", e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleInputCommit("min", e.currentTarget.value)}
            className="w-full h-8 px-2 bg-white/5 border border-white/10 rounded text-sm text-text-primary focus:outline-none focus:border-accent/50"
          />
        </label>
        <span className="pt-4 text-text-secondary">~</span>
        <label className="flex-1">
          <span className="mb-1 block text-[10px] uppercase tracking-wide text-text-secondary">{t("maxLabel")}</span>
          <input
            type="number"
            defaultValue={draft.max}
            key={`max-${draft.max}`}
            onBlur={(e) => handleInputCommit("max", e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleInputCommit("max", e.currentTarget.value)}
            className="w-full h-8 px-2 bg-white/5 border border-white/10 rounded text-sm text-text-primary focus:outline-none focus:border-accent/50"
          />
        </label>
      </div>
      <p className="mt-2 text-[10px] text-text-secondary/70">{t("bcHint")}</p>
    </div>
  );
}

// ── 데스크톱: 트리거 칩 + 포털 드롭다운 (FilterChipDropdown과 동일 톤) ──
export function CelebBirthYearFilterDesktop({ min, max, isLoading = false, onChange }: CelebBirthYearFilterProps) {
  const t = useTranslations("home.ui");
  const tYear = useTranslations("home.ui.birthYear");
  const [isOpen, setIsOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const isActive = min !== undefined || max !== undefined;
  const valueLabel = useMemo(() => {
    if (!isActive) return tYear("all");
    return tYear("range", {
      min: formatYear(min ?? BIRTH_YEAR_MIN, tYear),
      max: formatYear(max ?? BIRTH_YEAR_MAX, tYear),
    });
  }, [isActive, min, max, tYear]);

  const handleToggle = () => {
    if (!isOpen && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setPos({ top: rect.bottom + 4, left: rect.left });
    }
    setIsOpen((prev) => !prev);
  };

  return (
    <div ref={containerRef} className="relative">
      <Button
        type="button"
        unstyled
        onClick={handleToggle}
        disabled={isLoading}
        aria-label={`${t("filterBirthYear")}: ${valueLabel}`}
        aria-expanded={isOpen}
        title={`${t("filterBirthYear")}: ${valueLabel}`}
        className={`
          flex items-center justify-center rounded-md border transition-none
          bg-white/5 whitespace-nowrap overflow-hidden
          ${isActive ? 'border-accent shadow-[0_0_10px_rgba(var(--color-accent-rgb,_212,_175,_55),0.2)]' : 'border-accent/20 hover:border-accent/40'}
        `}
      >
        <div className="flex items-stretch justify-center w-full min-h-[2.5rem]">
          <div className="flex items-center justify-center border-r border-accent/10 bg-black/40 px-2.5">
            <span className={isActive ? 'text-accent' : 'opacity-70'}><Calendar size={14} /></span>
          </div>
          <div className={`flex-1 flex items-center justify-center px-3 ${isOpen ? 'bg-accent/10' : 'bg-white/[0.02]'}`}>
            <span className={`text-sm font-sans font-bold truncate ${isActive ? 'text-accent' : 'text-text-primary'} ${isOpen ? 'underline underline-offset-2 decoration-accent/50' : ''}`}>
              {valueLabel}
            </span>
          </div>
        </div>
      </Button>

      {isOpen && typeof document !== "undefined" && createPortal(
        <>
          {/* 바깥 클릭 감지용 전면 오버레이 — 다른 드롭다운과 동일한 z축에 둔다 */}
          <div className="fixed inset-0" style={{ zIndex: Z_INDEX.dropdown - 1 }} onClick={() => setIsOpen(false)} />
          <div
            ref={dropdownRef}
            role="dialog"
            aria-label={t("filterBirthYear")}
            className="fixed bg-black/95 backdrop-blur-xl border border-accent/30 rounded-md shadow-2xl"
            style={{ top: pos.top, left: pos.left, zIndex: Z_INDEX.dropdown }}
          >
            <BirthYearSliderCore min={min} max={max} onChange={onChange} />
          </div>
        </>,
        document.body
      )}
    </div>
  );
}

// ── 모바일: FilterChip 트리거 + Modal ──
export function CelebBirthYearFilterMobile({
  min, max, isLoading = false, onChange, isOpen, onOpen, onClose,
}: CelebBirthYearFilterProps & { isOpen: boolean; onOpen: () => void; onClose: () => void }) {
  const t = useTranslations("home.ui");
  const tYear = useTranslations("home.ui.birthYear");
  const isActive = min !== undefined || max !== undefined;
  const valueLabel = isActive
    ? tYear("range", { min: formatYear(min ?? BIRTH_YEAR_MIN, tYear), max: formatYear(max ?? BIRTH_YEAR_MAX, tYear) })
    : tYear("all");

  return (
    <>
      <Button
        type="button"
        unstyled
        onClick={onOpen}
        disabled={isLoading}
        aria-label={`${t("filterBirthYear")}: ${valueLabel}`}
        title={`${t("filterBirthYear")}: ${valueLabel}`}
        className={`
          flex items-center justify-center rounded-lg border text-sm whitespace-nowrap shrink-0 font-medium !p-0 w-full
          ${isActive ? 'bg-accent text-bg-main border-accent shadow-md shadow-accent/20' : 'bg-white/5 text-text-primary border-accent/40 hover:border-accent/60 hover:bg-white/10'}
        `}
      >
        <div className="flex items-stretch justify-center w-full min-h-[2.1rem]">
          <div className="flex items-center justify-center border-r border-accent/10 bg-black/20 px-2">
            <Calendar size={12} />
          </div>
          <div className="flex min-w-0 flex-1 items-center justify-center bg-white/[0.02] px-2.5">
            <span className="text-[11px] font-sans font-bold truncate">{valueLabel}</span>
          </div>
        </div>
      </Button>

      <Modal isOpen={isOpen} onClose={onClose} title={t("filterBirthYear")} size="sm" closeOnOverlayClick>
        <BirthYearSliderCore min={min} max={max} onChange={onChange} />
        <ModalFooter>
          <Button type="button" unstyled onClick={onClose} className="w-full h-10 bg-accent/10 hover:bg-accent/20 border border-accent/30 rounded-lg text-sm text-accent">
            {t("go")}
          </Button>
        </ModalFooter>
      </Modal>
    </>
  );
}
