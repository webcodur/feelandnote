/*
  파일명: /components/shared/BannerHeading.tsx
  기능: 허브 배너의 제목과 경로(빵부스러기)
  책임: 배너는 "지금 어디에 있는지"를 알리는 자리다. 상위 경로는 작은 한 줄(반투명 알약)로, 지금 화면은 큰 제목으로
        나눠 그린다 — 경로 전체를 큰 제목 글씨로 이어 쓰면 낮은 배너에서 두 줄로 넘치고 어디가 현재인지 흐려진다.
        넓은 화면은 h1, 휴대폰은 role=heading(같은 화면에 h1을 두 번 두지 않는다).
*/ // ------------------------------

"use client";

import { ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import {
  BANNER_CRUMB_CURRENT_CLASS,
  BANNER_CRUMB_LINK_CLASS,
  BANNER_CRUMB_TRAIL_CLASS,
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

export default function BannerHeading({ ancestors, current, onCurrentClick, variant, asHeading = true }: BannerHeadingProps) {
  const t = useTranslations("shared.accessibility");
  const isDesktop = variant === "desktop";
  const titleClass = isDesktop ? BANNER_TITLE_CLASS : BANNER_MOBILE_TITLE_CLASS;
  const title = onCurrentClick
    ? <button type="button" onClick={onCurrentClick} className={BANNER_CRUMB_CURRENT_CLASS}>{current}</button>
    : current;

  return (
    <div className={`flex max-w-full flex-col items-center ${isDesktop ? "gap-2 px-6" : "gap-1.5"}`}>
      {ancestors.length > 0 && (
        <nav aria-label={t("breadcrumb")} className="max-w-full">
          <ol className={BANNER_CRUMB_TRAIL_CLASS}>
            {ancestors.map((crumb, index) => (
              <li key={crumb.href} className="flex items-center gap-1.5">
                {index > 0 && <ChevronRight size={13} aria-hidden className="shrink-0 text-text-tertiary" />}
                <Link href={crumb.href} className={BANNER_CRUMB_LINK_CLASS}>{crumb.label}</Link>
              </li>
            ))}
            {/* 경로 줄 끝의 › — 아래 큰 제목이 다음 단계임을 잇는다 */}
            <li aria-hidden className="flex items-center"><ChevronRight size={13} className="shrink-0 text-text-tertiary" /></li>
          </ol>
        </nav>
      )}
      {!asHeading ? (
        <p className={titleClass}>{title}</p>
      ) : isDesktop ? (
        <h1 className={titleClass}>{title}</h1>
      ) : (
        <div role="heading" aria-level={1} className={titleClass}>{title}</div>
      )}
    </div>
  );
}
