/*
  파일명: /components/features/library/curated/CuratedListModal.tsx
  기능: 기관 선정 목록의 퀵 프리뷰 모달 다이얼로그
  책임: 탐색 흐름을 끊지 않고 그 자리에서 목록의 선정 배경과 대표 수록작(15~20편)을
        가볍게 훑어보고, 원할 경우 전체 보기 풀 페이지로 안내한다.
*/ // ------------------------------

"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import Image from "next/image";
import { X, ExternalLink, ListOrdered, CalendarClock, BookOpen, Loader2 } from "lucide-react";
import BlurDissolve from "@/components/ui/BlurDissolve";
import type { CuratedListSummary, CuratedListDetail } from "@/actions/library/types";
import { getCuratedList } from "@/actions/library";
import { getCuratorBrand } from "./curatorBrandPalettes";

const PREVIEW_LIMIT = 20;

export default function CuratedListModal({
  list,
  onClose,
}: {
  list: CuratedListSummary | null;
  onClose: () => void;
}) {
  const t = useTranslations("library.curated");
  const [detail, setDetail] = useState<CuratedListDetail | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!list) {
      setDetail(null);
      return;
    }

    let active = true;
    setLoading(true);

    getCuratedList(list.slug)
      .then((res) => {
        if (active) {
          setDetail(res);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error("Failed to load list detail for modal preview:", err);
        if (active) setLoading(false);
      });

    // ESC 키로 모달 닫기
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);

    // 배경 스크롤 잠금
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      active = false;
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [list, onClose]);

  if (!list) return null;

  const brand = getCuratorBrand(list.curatorSlug, list.curatorKind);
  const isVideo = list.contentType === "VIDEO";
  const items = detail?.items?.slice(0, PREVIEW_LIMIT) ?? [];

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6"
    >
      {/* 백드롭 블러 */}
      <div
        aria-hidden="true"
        onClick={onClose}
        className="absolute inset-0 bg-black/80 backdrop-blur-md transition-opacity"
      />

      {/* 모달 윈도우 */}
      <div
        className="relative flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-white/[0.12] bg-[#141414] shadow-2xl"
        style={{
          boxShadow: `0 25px 50px -12px rgba(0, 0, 0, 0.7), 0 0 40px -10px ${brand.primary}44`,
        }}
      >
        {/* 상단 브랜드 림 라이트 */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-[2px]"
          style={{
            background: `linear-gradient(90deg, transparent, ${brand.accent}, transparent)`,
          }}
        />

        {/* ── 모달 헤더 ── */}
        <div
          className="relative flex items-start justify-between gap-4 border-b border-white/[0.08] p-5 sm:p-6"
          style={{
            background: `radial-gradient(130% 90% at 0% 0%, ${brand.primary}40 0%, ${brand.primary}15 50%, rgba(20, 20, 20, 0.95) 90%)`,
          }}
        >
          <div className="flex min-w-0 items-center gap-3">
            {list.curatorLogoUrl ? (
              <div className="relative size-10 shrink-0 overflow-hidden rounded-xl border border-white/20 bg-white/95 p-1 shadow-sm sm:size-12">
                <BlurDissolve className="absolute inset-0">
                  <Image
                    src={list.curatorLogoUrl}
                    alt={list.curatorName ?? ""}
                    fill
                    className="object-contain p-0.5"
                    sizes="48px"
                  />
                </BlurDissolve>
              </div>
            ) : (
              <div
                className="flex size-10 shrink-0 items-center justify-center rounded-xl border font-serif text-[14px] font-bold sm:size-12"
                style={{
                  backgroundColor: `${brand.primary}66`,
                  borderColor: `${brand.accent}55`,
                  color: brand.accent,
                }}
              >
                {brand.monogram.slice(0, 3)}
              </div>
            )}

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="truncate text-[13px] font-medium text-text-secondary">
                  {list.curatorName ?? brand.monogram}
                </span>
                {list.curatorKind && t.has(`kind.${list.curatorKind}`) && (
                  <span
                    className="rounded px-1.5 py-0.5 text-[10px] font-semibold"
                    style={{ backgroundColor: `${brand.primary}55`, color: brand.accent }}
                  >
                    {t(`kind.${list.curatorKind}`)}
                  </span>
                )}
              </div>
              <h2 className="font-serif text-[18px] font-bold leading-tight text-text-primary sm:text-[20px]">
                {list.title}
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="shrink-0 rounded-full p-1.5 text-text-tertiary transition-colors hover:bg-white/10 hover:text-text-primary"
          >
            <X size={20} />
          </button>
        </div>

        {/* ── 모달 본문 (스크롤 영역) ── */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5 sm:p-6">
          {/* 목록 설명 */}
          {list.description && (
            <p className="text-[13.5px] leading-relaxed text-text-secondary">
              {list.description}
            </p>
          )}

          {/* 메타 칩들 */}
          <div className="flex flex-wrap items-center gap-2 text-[11px] text-text-tertiary">
            <span className="rounded border border-accent/30 bg-accent/[0.08] px-2 py-0.5 font-medium text-accent">
              {t("itemCount", { count: list.itemCount })}
            </span>
            {list.publishedYear && (
              <span className="rounded bg-white/[0.05] px-2 py-0.5">
                {t("published", { year: list.publishedYear })}
              </span>
            )}
            {list.edition && (
              <span className="rounded bg-white/[0.05] px-2 py-0.5">{list.edition}</span>
            )}
            {list.isRanked && (
              <span className="inline-flex items-center gap-1 rounded bg-white/[0.05] px-2 py-0.5">
                <ListOrdered size={11} />
                {t("ranked")}
              </span>
            )}
            {list.isAnnual && (
              <span className="inline-flex items-center gap-1 rounded bg-white/[0.05] px-2 py-0.5">
                <CalendarClock size={11} />
                {t("annual")}
              </span>
            )}
          </div>

          {/* 선정 방식 해설 (있는 경우) */}
          {detail?.method && (
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3.5 text-[12.5px] leading-relaxed text-text-secondary">
              <span className="mb-1 block font-semibold text-text-primary">{t("method")}</span>
              <p className="line-clamp-3">{detail.method}</p>
            </div>
          )}

          {/* ── 수록 작품 대표 프리뷰 ── */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="flex items-center gap-1.5 font-serif text-[14px] font-bold text-text-primary">
                <BookOpen size={15} className="text-accent" />
                대표 수록작 미리보기
              </h3>
              <span className="text-[11px] text-text-tertiary">
                상위 {Math.min(PREVIEW_LIMIT, list.itemCount)}편 노출
              </span>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-10 text-text-tertiary">
                <Loader2 size={24} className="animate-spin text-accent" />
              </div>
            ) : items.length > 0 ? (
              <div className="divide-y divide-white/[0.05] rounded-xl border border-white/[0.08] bg-black/40">
                {items.map((item, idx) => (
                  <div
                    key={item.id || idx}
                    className="flex items-center gap-3 p-2.5 transition-colors hover:bg-white/[0.02]"
                  >
                    {/* 순위 또는 번호 */}
                    <span className="flex size-6 shrink-0 items-center justify-center font-mono text-[11px] font-bold text-text-tertiary">
                      {item.rank ? item.rank : idx + 1}
                    </span>

                    {/* 표지 썸네일 */}
                    <div className="relative aspect-[3/4] h-11 shrink-0 overflow-hidden rounded bg-neutral-900 shadow-sm">
                      {item.thumbnailUrl ? (
                        <BlurDissolve className="absolute inset-0">
                          <Image
                            src={item.thumbnailUrl}
                            alt=""
                            fill
                            className="object-cover"
                            sizes="44px"
                          />
                        </BlurDissolve>
                      ) : (
                        <div className="flex size-full items-center justify-center text-[9px] text-text-tertiary">
                          NO
                        </div>
                      )}
                    </div>

                    {/* 작품명 & 창작자 */}
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[13px] font-medium text-text-primary">
                        {item.title || item.rawTitle}
                      </div>
                      <div className="truncate text-[11px] text-text-tertiary">
                        {item.creator || item.rawCreator || "—"}
                        {item.year && ` · ${item.year}`}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              /* 아직 상세를 못 불러왔을 때는 요약의 5개 표지를 대신 프리뷰 */
              <div className="flex gap-2 rounded-xl border border-white/[0.06] bg-black/40 p-2.5">
                {list.covers.map((src, i) => (
                  <div
                    key={i}
                    className="relative aspect-[3/4] flex-1 overflow-hidden rounded bg-neutral-900"
                  >
                    <BlurDissolve className="absolute inset-0">
                      <Image src={src} alt="" fill className="object-cover" sizes="80px" />
                    </BlurDissolve>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── 모달 푸터 ── */}
        <div className="flex items-center justify-between border-t border-white/[0.08] bg-[#111] px-5 py-4 sm:px-6">
          <span className="text-[12px] text-text-tertiary">
            전체 <strong className="text-text-primary">{list.itemCount}편</strong> 수록
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-white/[0.1] bg-white/[0.04] px-3.5 py-1.5 text-[12px] font-medium text-text-secondary transition-colors hover:bg-white/[0.08] hover:text-text-primary"
            >
              닫기
            </button>

            <Link
              href={`/library/curated/${list.curatorSlug}/${list.slug}`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-accent/40 bg-accent/15 px-4 py-1.5 text-[12px] font-bold text-accent transition-colors hover:bg-accent/25 hover:border-accent"
            >
              전체 {list.itemCount}편 크게 보기
              <ExternalLink size={13} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
