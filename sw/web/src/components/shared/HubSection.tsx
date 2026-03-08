/*
  파일명: /components/shared/HubSection.tsx
  기능: 탐색 및 서가 허브 섹션 공통 래퍼
  책임: 제목 + 선택적 더보기 링크 + children
*/ // ------------------------------

import { ArrowRight } from "lucide-react";
import { Link } from "@/i18n/navigation";

interface HubSectionProps {
  title: string;
  subtitle?: string;
  moreHref?: string;
  moreLabel?: string;
  children: React.ReactNode;
  hideDivider?: boolean;
}

export default function HubSection({
  title,
  subtitle,
  moreHref,
  moreLabel = "더보기",
  children,
  hideDivider = false,
}: HubSectionProps) {
  return (
    <section className="w-full flex flex-col pt-6 md:pt-8">
      {/* 장식적 상단 구분선 */}
      {!hideDivider && (
        <div className="w-full h-px bg-gradient-to-r from-white/10 via-white/5 to-transparent mb-8 md:mb-12" />
      )}
      
      {/* 헤더 부분 */}
      <div className="flex flex-row items-end justify-between mb-5 md:mb-8 px-1">
        <div className="flex flex-col gap-1.5 md:gap-2">
          {/* 타이틀과 엑센트 바 */}
          <div className="flex items-center gap-3">
            <div className="w-1.5 h-6 md:h-7 bg-[#d4af37] rounded-sm shadow-[0_0_8px_rgba(212,175,55,0.4)]" />
            <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight">
              {title}
            </h2>
          </div>
          {/* 서브타이틀 인덴테이션 및 좌측 라인 */}
          {subtitle && (
            <p className="text-sm md:text-base text-white/50 max-w-[80%] break-keep pl-4 border-l-2 border-white/10 ml-[2px] mt-1 font-medium">
              {subtitle}
            </p>
          )}
        </div>

        {/* 더보기 버튼 알약 형태(Pill) 디자인 */}
        {moreHref && (
          <Link
            href={moreHref}
            className="flex items-center gap-1.5 text-xs md:text-sm text-white/60 hover:text-[#d4af37] font-medium shrink-0 transition-colors bg-white/5 hover:bg-white/10 px-3 py-1.5 md:px-4 md:py-2 rounded-full border border-white/5 hover:border-white/10"
          >
            {moreLabel}
            <ArrowRight size={16} className="text-[#d4af37]" />
          </Link>
        )}
      </div>

      {/* 콘텐츠 */}
      <div className="w-full relative">
        {children}
      </div>
    </section>
  );
}
