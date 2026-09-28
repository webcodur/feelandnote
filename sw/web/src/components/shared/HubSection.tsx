/*
  파일명: /components/shared/HubSection.tsx
  기능: 탐색 및 서가 허브 섹션 공통 래퍼
  책임: 금선 번호 + 제목 + 선택적 부제·더보기 링크 + children. 구획 사이 이동은 위 목차(HubNav)가 맡는다
*/ // ------------------------------

"use client";

import { ArrowRight } from "lucide-react";
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
  const hasNumber = index !== undefined && total !== undefined && total > 1;
  const sectionId = index !== undefined ? hubSectionId(index, groupId) : undefined;

  return (
    <section id={sectionId} className={`w-full flex flex-col scroll-mt-20 ${hideDivider ? "pt-6 md:pt-8" : ""}`}>
      {/* 구획 사이 선 — 위 구획 끝에서 짧게 끊고(간격은 부모의 space-y), 아래 새 구획은 넉넉히 띄운다
          (code-rules.md 「구분선」) */}
      {!hideDivider && <div className="mb-12 h-px w-full bg-line md:mb-16" />}

      {/* 헤더 — 가운데 정렬. 허브·홈 구획 머리의 공통 문법이다(code-rules.md 「정렬」)
          윗줄은 금선 사이 번호(「— 01 —」, 책의 장 번호 모양), 아랫줄은 제목 하나다(26.09.28 유저 선택).
          예전의 「1/3」 줄·제목 옆 번호·좌우 화살표는 걷었다 — 화살표는 바로 위 목차와 같은 이동을 되풀이했고,
          제목 옆 번호·화살표는 좌우 거리가 달라 머리 규격이 어긋나 보였다 */}
      <div className="flex flex-col items-center text-center mb-6 md:mb-10 px-1 gap-2 md:gap-3">
        {hasNumber ? (
          <div aria-hidden className="flex select-none items-center gap-2.5">
            <span className="h-0.5 w-6 rounded-full bg-accent" />
            {/* 번호는 글자가 아니라 그림(::before)으로 그린다 — 본문 텍스트에 「01」이 섞이지 않게 */}
            <span data-number={String(index! + 1).padStart(2, "0")}
              className="text-xs font-medium tabular-nums text-accent-dim before:content-[attr(data-number)] md:text-sm" />
            <span className="h-0.5 w-6 rounded-full bg-accent" />
          </div>
        ) : (
          <div aria-hidden className="h-0.5 w-8 rounded-full bg-accent" />
        )}

        <h2 className="break-keep text-center text-xl font-semibold tracking-tight text-text-primary md:text-2xl">
          {title}
        </h2>

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
