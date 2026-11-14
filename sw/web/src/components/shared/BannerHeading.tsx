/*
  파일명: /components/shared/BannerHeading.tsx
  기능: 허브 배너의 제목과 경로(빵부스러기)
  책임: 배너의 큰 글자 자체를 「상위 › 현재」 경로로 이어 그린다. 별도 경로 줄과 제목을 반복하지 않는다.
        넓은 화면은 h1, 휴대폰은 role=heading(같은 화면에 h1을 두 번 두지 않는다).
*/ // ------------------------------

"use client";

import { ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import {
  BANNER_CRUMB_CURRENT_CLASS,
  BANNER_CRUMB_LINK_CLASS,
  BANNER_DEEP_TITLE_CLASS,
  BANNER_MOBILE_TITLE_CLASS,
  BANNER_TITLE_CLASS,
} from "./bannerStyles";

export interface BannerCrumb {
  label: string;
  href: string;
}

interface BannerHeadingProps {
  /** 지금 화면보다 위의 단계들(맨 앞이 허브). 비어 있으면 허브 첫 화면이다 */
  ancestors: BannerCrumb[];
  /** 지금 화면 이름 */
  current: string;
  /** 마지막 경로를 누르면 이 주소로 이동한다. 목록으로 돌아가는 배너에서 쓴다 */
  currentHref?: string;
  /** 주면 현재 제목을 눌러 새로고침한다 */
  onCurrentClick?: () => void;
  variant: "desktop" | "mobile";
  /**
   * false면 큰 제목을 제목 요소(h1·role=heading)로 두지 않는다 — 본문이 자기 이름을 h1로 세우는 화면용.
   * 모양은 같다. 기관·목록 화면은 이름이 클라이언트에서 늦게 채워져, 서버 HTML의 배너 h1이
   * 「기관 선정」으로 굳어 검색봇이 268쪽의 주제를 모두 같은 말로 읽었다(26.09.29 전수 점검).
   */
  asHeading?: boolean;
}

export default function BannerHeading({ ancestors, current, currentHref, onCurrentClick, variant, asHeading = true }: BannerHeadingProps) {
  const t = useTranslations("shared.accessibility");
  const isDesktop = variant === "desktop";
  const titleClass = isDesktop
    ? ancestors.length >= 2 ? BANNER_DEEP_TITLE_CLASS : BANNER_TITLE_CLASS
    : BANNER_MOBILE_TITLE_CLASS;
  const title = currentHref
    ? <Link href={currentHref} prefetch={false} className={BANNER_CRUMB_CURRENT_CLASS}>{current}</Link>
    : onCurrentClick
    ? <button type="button" onClick={onCurrentClick} className={BANNER_CRUMB_CURRENT_CLASS}>{current}</button>
    : current;

  const currentTitle = !asHeading ? (
    <span className={titleClass}>{title}</span>
  ) : isDesktop ? (
    <h1 className={titleClass}>{title}</h1>
  ) : (
    <div role="heading" aria-level={1} className={titleClass}>{title}</div>
  );

  if (ancestors.length === 0) return <div className="max-w-full text-center">{currentTitle}</div>;

  return (
    <nav aria-label={t("breadcrumb")} className="max-w-full">
      <ol className={`flex max-w-full flex-wrap items-center justify-center gap-x-2 gap-y-1 ${isDesktop ? "px-6 md:gap-x-3" : ""}`}>
        {ancestors.map(crumb => (
          <li key={crumb.href} className="flex min-w-0 max-w-full items-center gap-2 md:gap-3">
            <Link href={crumb.href} className={`${titleClass} ${BANNER_CRUMB_LINK_CLASS} min-w-0 break-words`}>{crumb.label}</Link>
            <ChevronRight aria-hidden className="size-4 shrink-0 text-text-tertiary md:size-6" />
          </li>
        ))}
        <li className="min-w-0 max-w-full">{currentTitle}</li>
      </ol>
    </nav>
  );
}
