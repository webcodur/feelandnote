/*
  파일명: /components/shared/HubSection.tsx
  기능: 탐색 및 서가 허브 섹션 공통 래퍼
  책임: 제목 + 넘버링 + 섹션 간 네비게이션 + 선택적 더보기 링크 + children
*/ // ------------------------------

"use client";

import { useCallback } from "react";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { LinkPending } from "@/components/ui/pending";

import { hubSectionId } from "./hubSectionUtils";
import { useTranslations } from "next-intl";

interface HubSectionProps {
  title: string;
  subtitle?: string;
  moreHref?: string;
  moreLabel?: string;
  children: React.ReactNode;
  hideDivider?: boolean;
  /** 0-based 인덱스 (넘버링 · 네비게이션용) */
  index?: number;
  /** 전체 섹션 수 */
  total?: number;
  /** 그룹 ID — 한 페이지에 독립 넘버링 그룹이 여러 개일 때 사용 */
  groupId?: string;
}

export default function HubSection({
  title,
  subtitle,
  moreHref,
  moreLabel,
  children,
  hideDivider = false,
  index,
  total,
  groupId,
}: HubSectionProps) {
  const t = useTranslations("shared.hubSection");
  const resolvedMoreLabel = moreLabel ?? t("more");
  const hasNav = index !== undefined && total !== undefined && total > 1;
  const sectionId = index !== undefined ? hubSectionId(index, groupId) : undefined;

  const scrollTo = useCallback(
    (targetIndex: number) => {
      const el = document.getElementById(hubSectionId(targetIndex, groupId));
      el?.scrollIntoView({ behavior: "smooth", block: "start" });
    },
    [groupId],
  );

  return (
    <section id={sectionId} className={`w-full flex flex-col scroll-mt-20 ${hideDivider ? "pt-6 md:pt-8" : ""}`}>
      {/* 구획 사이 선 — 위 구획 끝에서 짧게 끊고(간격은 부모의 space-y), 아래 새 구획은 넉넉히 띄운다
          (code-rules.md 「구분선」) */}
      {!hideDivider && <div className="mb-12 h-px w-full bg-line md:mb-16" />}

      {/* 헤더 — 가운데 정렬. 허브·홈 구획 머리의 공통 문법이다(code-rules.md 「정렬」) */}
      <div className="flex flex-col items-center text-center mb-6 md:mb-10 px-1 gap-2 md:gap-3">
        {/* 엑센트 바 — 빛 번짐 없이 금선 하나 */}
        <div aria-hidden className="h-0.5 w-8 rounded-full bg-accent" />

        {/* 좌우 화살표 + 번호·제목 한 줄. 예전에는 「1/3」을 제목 윗줄에 따로 두어 머리가 한 줄 더 길었다(26.09.28) */}
        <div className="flex items-center gap-2">
          {/* 첫 구획에는 이전이 없다 — 끝으로 감는 단추를 두지 않고 자리만 비워 둔다.
              자리를 지워 버리면 제목이 구획마다 좌우로 흔들린다 */}
          {hasNav && (
            index === 0 ? (
              <span aria-hidden className="invisible size-9" />
            ) : (
              <button
                type="button"
                onClick={() => scrollTo(index! - 1)}
                className="flex size-9 items-center justify-center rounded-full text-text-tertiary hover:bg-white/5 hover:text-text-primary"
                aria-label={t("previous")}
              >
                <ChevronLeft size={18} />
              </button>
            )
          )}
          {/* 최소 폭 = 가장 긴 제목(오늘의 인물) 5.5em + 좌우 여백. 짧은 제목도 같은 폭을 차지해
              좌우 화살표가 모든 구획에서 동일한 자리에 선다 (em이라 글자 크기에 비례).
              번호는 제목 글자 왼쪽 바깥에 띄운다(absolute) — 자리를 차지하지 않아 제목의 가운데 정렬이 번호에 밀리지 않는다.
              좌우 여백(px-6)은 번호가 들어갈 자리이며 양쪽이 같아 가운데를 흔들지 않는다 */}
          <h2 className="min-w-[calc(5.5em+3rem)] break-keep px-6 text-center text-xl font-semibold tracking-tight text-text-primary md:text-2xl">
            <span className="relative inline-block">
              {/* 번호는 글자가 아니라 그림(::before)으로 그린다 — 제목 텍스트가 「1오늘의 인물」로 읽히지 않게 */}
              {hasNav && (
                <span aria-hidden data-number={index! + 1}
                  className="absolute right-full top-0 select-none pe-2 tabular-nums text-accent-dim before:content-[attr(data-number)]" />
              )}
              {title}
            </span>
          </h2>
          {hasNav && (
            index === total! - 1 ? (
              <span aria-hidden className="invisible size-9" />
            ) : (
              <button
                type="button"
                onClick={() => scrollTo(index! + 1)}
                className="flex size-9 items-center justify-center rounded-full text-text-tertiary hover:bg-white/5 hover:text-text-primary"
                aria-label={t("next")}
              >
                <ChevronRight size={18} />
              </button>
            )
          )}
        </div>

        {/* 서브타이틀 */}
        {subtitle && (
          <p className="max-w-md break-keep text-sm leading-relaxed text-text-secondary md:text-base">
            {subtitle}
          </p>
        )}
      </div>

      {/* 콘텐츠 */}
      <div className="w-full relative">
        {children}
      </div>

      {/* 더보기 — 콘텐츠 하단, 섹션 끝 직전 */}
      {moreHref && <HubMoreLink href={moreHref} label={resolvedMoreLabel} />}
    </section>
  );
}

/** 구획 끝 더보기 링크 — 래퍼 없이 자기 모드에 맞는 주소를 직접 잇는 구획도 이걸 쓴다 */
export function HubMoreLink({ href, label }: { href: string; label: string }) {
  return (
    <div className="mt-5 flex justify-center md:mt-7">
      <Link
        href={href}
        className="flex min-h-11 items-center gap-1.5 rounded-full border border-line bg-bg-raised px-5 text-sm font-medium text-text-secondary hover:border-line-strong hover:text-text-primary"
      >
        {label}
        <LinkPending>
          <ArrowRight size={15} className="text-accent" />
        </LinkPending>
      </Link>
    </div>
  );
}
