"use client";

import { useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowRight, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import {
  getCelebLibraryPreview,
  type CelebLibraryPreviewItem,
} from "@/actions/home/getCelebReviews";
import {
  getSpectrumReasons,
  type SpectrumReasonMap,
} from "@/actions/spectrum/getSpectrumReason";
import { Avatar, Carousel, ContentImage } from "@/components/ui";
import { Z_INDEX } from "@/constants/zIndex";
import { withParticle } from "@/lib/korean-particle";
import {
  ABILITY_KEYS,
  TENDENCY_KEYS,
  VIRTUE_KEYS,
  type StatKey,
  type TendencyKey,
} from "@/lib/spectrum/constants";
import { localizeSpectrumText } from "@/lib/spectrum/localizeText";
import type { SpectrumJsonb, SpectrumField } from "@/lib/spectrum/types";
import type {
  SpectrumMatch,
  SpectrumMatchCategory,
} from "@/lib/spectrum/utils";
import { cn } from "@/lib/utils";
import SpectrumComparisonGraphic, {
  MatchInsightNote,
  useMatchInsight,
} from "./spectrum-comparison";
import {
  CANDIDATE_COLOR,
  SUBJECT_COLOR,
} from "./spectrum-comparison/shared";

/** 분류마다 다른 강조색 — 제목과 일치율 고리가 함께 쓴다 */
const CATEGORY_STYLES: Record<SpectrumMatchCategory, { label: string }> = {
  overall: { label: "text-accent" },
  disposition: { label: "text-blue-200" },
  virtue: { label: "text-amber-200" },
  ability: { label: "text-emerald-200" },
  opposite: { label: "text-rose-200" },
};

/** 성향 축은 이름이 양극 두 낱말이다 */
const TENDENCY_LABEL_KEYS: Record<TendencyKey, readonly [string, string]> = {
  pessimism_optimism: ["pessimism", "optimism"],
  conservative_progressive: ["conservative", "progressive"],
  individual_social: ["individual", "social"],
  cautious_bold: ["cautious", "bold"],
};

const CATEGORY_TITLE_KEYS = {
  overall: "spectrumMatch_overall",
  disposition: "spectrumMatch_disposition",
  virtue: "spectrumMatch_virtue",
  ability: "spectrumMatch_ability",
  opposite: "spectrumMatch_opposite",
} as const;

/** 분류마다 근거를 견줄 축 — 전체 비교는 카드에 뽑힌 대표 축만 본다 */
const CATEGORY_AXES: Record<
  SpectrumMatchCategory,
  readonly (StatKey | TendencyKey)[] | null
> = {
  overall: null,
  disposition: TENDENCY_KEYS,
  opposite: TENDENCY_KEYS,
  virtue: VIRTUE_KEYS,
  ability: ABILITY_KEYS,
};

/** 대상 인물 근거는 화면이 이미 들고 있다 — 겹창에서 다시 조회하지 않는다 */
function readSubjectReason(
  jsonb: SpectrumJsonb | null,
  axis: string,
  locale: string,
): string | undefined {
  if (!jsonb) return undefined;
  for (const group of [
    jsonb.abilities,
    jsonb.inner_virtues,
    jsonb.outer_virtues,
    jsonb.dispositions,
  ] as Record<string, SpectrumField>[]) {
    const field = group?.[axis];
    if (field) {
      return locale === "en" && field.reason_en
        ? field.reason_en
        : field.reason_ko;
    }
  }
  return undefined;
}

interface SpectrumMatchModalProps {
  category: SpectrumMatchCategory;
  match: SpectrumMatch;
  subjectName: string;
  subjectAvatarUrl: string | null;
  subjectSpectrumJsonb: SpectrumJsonb | null;
  loading: boolean;
  onClose: () => void;
  onViewPerson: () => void;
}

export default function SpectrumMatchModal({
  category,
  match,
  subjectName,
  subjectAvatarUrl,
  subjectSpectrumJsonb,
  loading,
  onClose,
  onViewPerson,
}: SpectrumMatchModalProps) {
  const t = useTranslations("celebPage");
  const ts = useTranslations("shared.spectrum.stat");
  const tl = useTranslations("shared.spectrum.tendency_label");
  const locale = useLocale();
  const titleId = useId();
  const style = CATEGORY_STYLES[category];
  // 닮음의 근거(수치)를 먼저, 그 인물의 감상 기록을 뒤에 — 둘 다 펼친 채로 둔다
  const [library, setLibrary] = useState<CelebLibraryPreviewItem[] | null>(null);
  const [candidateReasons, setCandidateReasons] =
    useState<SpectrumReasonMap | null>(null);

  // 인물이 바뀌면 부모가 key로 재마운트한다 — 여기서는 첫 로드만 맡는다
  useEffect(() => {
    let cancelled = false;
    getCelebLibraryPreview(match.celeb_id)
      .then((items) => {
        if (!cancelled) setLibrary(items);
      })
      .catch(() => {
        if (!cancelled) setLibrary([]);
      });
    getSpectrumReasons(match.celeb_id)
      .then((reasons) => {
        if (!cancelled) setCandidateReasons(reasons);
      })
      .catch(() => {
        if (!cancelled) setCandidateReasons({});
      });
    return () => {
      cancelled = true;
    };
  }, [match.celeb_id]);

  const insight = useMatchInsight({ category, match, subjectName });
  const axes =
    CATEGORY_AXES[category] ??
    match.evidence.map((evidence) => evidence.axis as StatKey | TendencyKey);
  const axisLabel = (axis: StatKey | TendencyKey): string => {
    const tendencyEndpoints = TENDENCY_LABEL_KEYS[axis as TendencyKey];
    if (!tendencyEndpoints) return ts(axis as StatKey);
    const [negative, positive] = tendencyEndpoints;
    return `${tl(negative)} · ${tl(positive)}`;
  };
  const reasonRows = axes
    .map((axis) => ({
      axis,
      label: axisLabel(axis),
      subject: localizeSpectrumText(
        readSubjectReason(subjectSpectrumJsonb, axis, locale),
        locale,
      ),
      candidate: localizeSpectrumText(
        candidateReasons
          ? locale === "en" && candidateReasons[axis]?.en
            ? candidateReasons[axis].en
            : candidateReasons[axis]?.ko
          : undefined,
        locale,
      ),
    }))
    .filter((row) => row.subject || row.candidate);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !loading) onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [loading, onClose]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 flex items-center justify-center bg-black/75 p-3 backdrop-blur-sm animate-fade-in md:p-6"
      style={{ zIndex: Z_INDEX.modal }}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !loading) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={cn(
          "relative flex max-h-[92vh] w-full flex-col overflow-hidden border border-white/10 bg-bg-main shadow-[0_24px_80px_rgba(0,0,0,0.55)] animate-modal-content",
          category === "overall" ? "max-w-[1280px]" : "max-w-[1140px]",
        )}
      >
        <button
          type="button"
          onClick={onClose}
          disabled={loading}
          aria-label={t("spectrumMatchModalClose")}
          className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-black/25 text-text-secondary hover:border-white/25 hover:bg-white/[0.06] hover:text-text-primary disabled:cursor-wait disabled:opacity-40"
        >
          <X size={16} />
        </button>

        {/* 머리글 하나가 제목·두 인물·일치율을 다 쥔다 */}
        <header className="border-b border-white/[0.07] px-12 py-3 md:px-14 md:py-3.5">
          {/* 셋을 가운데로 모은다 — 넓은 화면에서 양 끝으로 벌어지면 선만 길어진다 */}
          <div className="mx-auto grid max-w-[460px] grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 md:gap-4">
            <div className="min-w-0 text-center">
              <div
                className="mx-auto inline-flex rounded-full border-2 bg-bg-main p-[3px] shadow-[0_0_20px_rgba(216,186,104,0.16)]"
                style={{ borderColor: SUBJECT_COLOR }}
              >
                <Avatar
                  url={subjectAvatarUrl}
                  name={subjectName}
                  size="lg"
                  className="ring-0 md:h-14 md:w-14"
                />
              </div>
              <p className="mt-1.5 text-balance break-keep text-sm font-bold text-text-primary md:text-base">
                {subjectName}
              </p>
            </div>

            {/* 비교 항목 — 잇는 선 — 일치율. 셋이 가운데 축에서 한 덩어리로 쌓인다 */}
            <div className="flex min-w-0 flex-col items-center gap-2.5">
              <h2
                id={titleId}
                className={cn(
                  "text-center font-serif text-xl font-bold tracking-[0.04em] md:text-[22px]",
                  style.label,
                )}
              >
                {t(CATEGORY_TITLE_KEYS[category])}
              </h2>
              <div
                aria-hidden
                className="h-px w-full bg-gradient-to-r from-transparent via-white/30 to-transparent"
              />
              <p className="flex items-baseline justify-center gap-1.5">
                <strong
                  className={cn(
                    "font-mono text-[26px] font-bold leading-none md:text-[30px]",
                    style.label,
                  )}
                >
                  {match.matchPercent}
                  <span className="text-base md:text-lg">%</span>
                </strong>
                <span className="text-[15px] font-semibold text-text-primary/75 md:text-base">
                  {category === "opposite"
                    ? t("spectrumMatchModalClash")
                    : t("spectrumMatchModalMatch")}
                </span>
              </p>
            </div>

            {/* 비교 인물 쪽에는 그 인물로 건너가는 단추를 붙인다 — 아래 단추 줄을 없앤 대신이다 */}
            <div className="min-w-0 text-center">
              <div className="relative mx-auto inline-flex">
                <div
                  className="inline-flex rounded-full border-2 bg-bg-main p-[3px] shadow-[0_0_20px_rgba(131,201,220,0.14)]"
                  style={{ borderColor: CANDIDATE_COLOR }}
                >
                  <Avatar
                    url={match.avatar_url}
                    name={match.nickname}
                    size="lg"
                    className="ring-0 md:h-14 md:w-14"
                  />
                </div>
                <button
                  type="button"
                  onClick={onViewPerson}
                  disabled={loading}
                  aria-label={t("spectrumMatchModalViewPerson")}
                  title={t("spectrumMatchModalViewPerson")}
                  className="absolute -bottom-1.5 -end-2 flex h-8 w-8 items-center justify-center rounded-full border border-accent bg-accent text-bg-main shadow-[0_2px_10px_rgba(0,0,0,0.55)] hover:bg-accent-hover disabled:cursor-wait disabled:opacity-50"
                >
                  <ArrowRight size={17} strokeWidth={2.6} aria-hidden />
                </button>
              </div>
              <p className="mt-1.5 text-balance break-keep text-sm font-bold text-text-primary md:text-base">
                {match.nickname}
              </p>
            </div>
          </div>
        </header>

        <div className="space-y-4 overflow-y-auto px-4 py-4 custom-scrollbar md:px-6">
          {/* 수치 비교 — 닮음의 근거를 먼저 보여준다 */}
          <section className="overflow-hidden rounded-lg border border-white/[0.09] bg-white/[0.02]">
            <header className="border-b border-white/[0.07] bg-white/[0.02] px-4 py-2.5 text-center">
              <p className="text-sm font-bold text-text-primary md:text-base">
                {t("spectrumMatchModalNumbers")}
              </p>
            </header>
            {/* 왼쪽은 눈으로 보는 비교, 오른쪽은 왜 그 점수인지 읽는 비교.
                인포그래픽은 폭이 좁아지면 축을 누르는 자리가 뭉개지므로 넓은 쪽을 준다 */}
            <div className="grid gap-3 px-3 pb-3 md:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] md:gap-5 md:px-4 md:pb-4">
              <div className="min-w-0">
                <SpectrumComparisonGraphic
                  category={category}
                  match={match}
                  subjectName={subjectName}
                  showInsight={false}
                />
              </div>

              {/* 한 줄 해석과 축별 근거를 함께 — 그림 아래를 비우고 남는 옆 공간을 쓴다.
                  이름은 쓰지 않는다. 왼쪽 그림이 이미 색으로 두 사람을 가려 놓았다 */}
              {/* 옆 그림만큼 자리를 받아 아래를 비우지 않는다 */}
              <div className="flex min-w-0 flex-col md:border-s md:border-white/[0.07] md:ps-4">
                <MatchInsightNote
                  insight={insight}
                  subjectName={subjectName}
                  candidateName={match.nickname}
                />

                {/* 항목 이름은 왼쪽 칸에서 두 문장 높이의 한가운데를 잡는다 */}
                {reasonRows.length > 0 ? (
                  <ul className="mt-3 flex flex-1 flex-col justify-between divide-y divide-white/[0.06]">
                    {reasonRows.map((row) => (
                      <li
                        key={row.axis}
                        className="grid grid-cols-[3.5rem_minmax(0,1fr)] items-center gap-x-3 py-2.5 first:pt-0 last:pb-0"
                      >
                        <p className="text-balance break-keep text-center text-[11px] font-bold leading-tight tracking-[0.06em] text-text-primary/50 md:text-xs">
                          {row.label}
                        </p>
                        <div className="min-w-0 space-y-1.5">
                          {row.subject ? (
                            <p
                              className="text-[13px] leading-relaxed md:text-sm"
                              style={{ color: SUBJECT_COLOR }}
                            >
                              {row.subject}
                            </p>
                          ) : null}
                          {row.candidate ? (
                            <p
                              className="text-[13px] leading-relaxed md:text-sm"
                              style={{ color: CANDIDATE_COLOR }}
                            >
                              {row.candidate}
                            </p>
                          ) : null}
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            </div>
          </section>

          {/* 감상 기록 — 그래서 이 사람은 무엇을 읽었는가 */}
          {library === null ? (
            <div className="space-y-2" aria-hidden>
              {Array.from({ length: 2 }, (_, index) => (
                <div
                  key={index}
                  className="h-16 animate-pulse rounded-md border border-white/[0.05] bg-white/[0.03]"
                />
              ))}
            </div>
          ) : (
            <section className="overflow-hidden rounded-lg border border-white/[0.09] bg-white/[0.02]">
              {library.length === 0 ? (
                <>
                  <header className="border-b border-white/[0.07] bg-white/[0.02] px-4 py-2.5 text-center">
                    <p className="text-sm font-bold text-text-primary md:text-base">
                      {t("spectrumMatchModalLibrary", {
                        candidate: withParticle(match.nickname, "subject"),
                      })}
                    </p>
                  </header>
                  <p className="px-4 py-6 text-center text-sm text-text-secondary">
                    {t("spectrumMatchModalLibraryEmpty", {
                      name: match.nickname,
                    })}
                  </p>
                </>
              ) : (
                <Carousel
                  header={
                    <p className="text-sm font-bold text-text-primary md:text-base">
                      {t("spectrumMatchModalLibrary", {
                        candidate: withParticle(match.nickname, "subject"),
                      })}
                    </p>
                  }
                  headerClassName="border-b border-white/[0.07] bg-white/[0.02] px-4 py-2"
                  className="pb-3 md:pb-4"
                  trackClassName="px-3 pt-3 md:px-4"
                  labels={{
                    previous: t("spectrumMatchModalWorkPrevious"),
                    next: t("spectrumMatchModalWorkNext"),
                    dot: (index, count) => t("carouselDot", { index, count }),
                  }}
                >
                  {library.map((item) => (
                    <article
                      key={item.id}
                      className="flex h-full gap-5 rounded-md border border-white/[0.07] bg-bg-main/60 p-4"
                    >
                      <span className="relative h-[150px] w-[104px] shrink-0 overflow-hidden rounded-[3px] border border-white/10 bg-black/25">
                        <ContentImage
                          src={item.content.thumbnail_url}
                          alt={item.content.title}
                          sizes="104px"
                          className="object-cover"
                        />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-base font-bold text-text-primary">
                          {item.content.title}
                        </p>
                        {item.content.creator ? (
                          <p className="mt-0.5 truncate text-xs text-text-secondary">
                            {item.content.creator}
                          </p>
                        ) : null}
                        <p className="mt-2 line-clamp-5 border-t border-white/[0.06] pt-2 text-sm leading-relaxed text-text-secondary">
                          {item.review}
                        </p>
                      </div>
                    </article>
                  ))}
                </Carousel>
              )}
            </section>
          )}
        </div>

      </section>
    </div>,
    document.body,
  );
}
