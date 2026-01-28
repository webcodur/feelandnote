import { Suspense } from "react";
import Link from "next/link";
import { ChevronDown, Compass, Users } from "lucide-react";
import { Logo } from "@/components/ui";
import { LaurelIcon } from "@/components/ui/icons/neo-pantheon";
import { HeroTexture, HeroPillar } from "@/components/features/landing/LandingIllustrations";
import FeaturedCollections from "@/components/features/landing/FeaturedCollections";
import { getFeaturedTags } from "@/actions/home";

// #region 서버 컴포넌트
async function FeaturedSection() {
  const tags = await getFeaturedTags();
  return <FeaturedCollections tags={tags} />;
}

function FeaturedSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      {/* 태그 탭 스켈레톤 */}
      <div className="flex justify-center">
        <div className="flex gap-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-10 w-20 bg-bg-card rounded-full" />
          ))}
        </div>
      </div>
      {/* 캐러셀 스켈레톤 */}
      <div className="flex justify-center gap-6">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="flex flex-col items-center gap-2">
            <div className="w-16 h-16 md:w-20 md:h-20 bg-bg-card rounded-full" />
            <div className="w-12 h-3 bg-bg-card rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
// #endregion

export default function HomePage() {
  return (
    <div className="bg-bg-main">
      {/* Hero Section */}
      <section className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden">
        {/* 배경 효과 */}
        <HeroTexture />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(212,175,55,0.15)_0%,transparent_50%)]" />
        <div className="hidden md:block absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,rgba(212,175,55,0.08)_0%,transparent_60%)]" />

        {/* 기둥 장식 (데스크톱) */}
        <HeroPillar side="left" className="absolute left-4 md:left-12 top-1/2 -translate-y-1/2 w-16 md:w-20 h-[500px] opacity-[0.12] hidden lg:block" />
        <HeroPillar side="right" className="absolute right-4 md:right-12 top-1/2 -translate-y-1/2 w-16 md:w-20 h-[500px] opacity-[0.12] hidden lg:block" />

        {/* 상단 월계관 (데스크톱) */}
        <div className="hidden md:block absolute top-8 left-1/2 -translate-x-1/2 opacity-20">
          <LaurelIcon size={120} className="text-accent" />
        </div>

        {/* 상단 장식선 */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-accent/50 to-transparent" />

        {/* 코너 장식 (데스크톱) */}
        <div className="hidden md:block absolute top-4 left-4 w-16 h-16 border-l-2 border-t-2 border-accent/20 rounded-tl-lg" />
        <div className="hidden md:block absolute top-4 right-4 w-16 h-16 border-r-2 border-t-2 border-accent/20 rounded-tr-lg" />
        <div className="hidden md:block absolute bottom-20 left-4 w-16 h-16 border-l-2 border-b-2 border-accent/20 rounded-bl-lg" />
        <div className="hidden md:block absolute bottom-20 right-4 w-16 h-16 border-r-2 border-b-2 border-accent/20 rounded-br-lg" />

        {/* 메인 컨텐츠 */}
        <div className="relative z-10 flex flex-col items-center text-center px-4 w-full max-w-4xl mx-auto">
          {/* 서브타이틀 */}
          <div className="flex items-center gap-2 md:gap-4 mb-6 md:mb-8 w-full justify-center">
            <div className="flex-1 max-w-[40px] md:max-w-[60px] h-px bg-gradient-to-r from-transparent to-accent/50" />
            <span className="font-cinzel text-[9px] md:text-xs text-accent tracking-[0.2em] md:tracking-[0.5em] uppercase opacity-80">
              Inscribed in Eternity
            </span>
            <div className="flex-1 max-w-[40px] md:max-w-[60px] h-px bg-gradient-to-l from-transparent to-accent/50" />
          </div>

          {/* 로고 */}
          <div className="mb-6 md:mb-12 w-full">
            <Logo variant="hero" size="xl" asLink={false} subtitle="THE ARCHIVE OF SOULS" />
          </div>

          {/* 디바이더 */}
          <div className="relative w-48 md:w-64 mb-8 md:mb-12">
            <div className="h-px bg-gradient-to-r from-transparent via-accent to-transparent shadow-[0_0_20px_rgba(212,175,55,0.5)]" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-accent rotate-45" />
          </div>

          {/* 메인 카피 */}
          <p className="font-serif text-text-secondary text-[13px] md:text-xl leading-relaxed tracking-wide max-w-2xl px-2 mb-10 md:mb-16 break-keep">
            평범한 누군가부터 역사 속 인물까지,<br />
            <span className="text-accent font-semibold">모든 이의 콘텐츠 여정</span>을 기록합니다.
          </p>

          {/* CTA 버튼 */}
          <div className="flex flex-col sm:flex-row gap-3 md:gap-4 mb-12 md:mb-16 w-full max-w-[280px] sm:max-w-none justify-center items-center">
            <Link
              href="/login"
              className="group relative w-full sm:w-auto px-6 md:px-10 py-3 md:py-4 bg-accent text-bg-main font-serif font-bold text-sm md:text-base rounded-lg overflow-hidden no-underline flex justify-center items-center"
            >
              <span className="relative z-10">기록 시작하기</span>
              <div className="absolute inset-0 bg-accent-hover opacity-0 group-hover:opacity-100 transition-opacity" />
            </Link>
            <Link
              href="/explore"
              className="group w-full sm:w-auto px-6 md:px-10 py-3 md:py-4 border-2 border-accent/50 text-accent font-serif font-bold text-sm md:text-base rounded-lg hover:bg-accent/10 hover:border-accent no-underline flex justify-center items-center gap-2"
            >
              <Compass size={18} />
              인물 탐색
            </Link>
          </div>
        </div>

        {/* 스크롤 유도 (데스크톱) */}
        <div className="hidden md:flex absolute bottom-8 left-1/2 -translate-x-1/2 flex-col items-center gap-2 text-text-tertiary">
          <span className="text-[10px] font-cinzel tracking-[0.3em] uppercase">
            Scroll
          </span>
          <ChevronDown size={20} className="animate-bounce" />
        </div>

        {/* 하단 장식선 (데스크톱) */}
        <div className="hidden md:block absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-accent/30 to-transparent" />
      </section>

      {/* 탐색 프리뷰 섹션 - 기획전 및 빠른 탐색 */}
      <section className="py-12 md:py-20 bg-bg-secondary/30 border-t border-border/30">
        <div className="container max-w-7xl mx-auto px-4">
          <Suspense fallback={<FeaturedSkeleton />}>
            <FeaturedSection />
          </Suspense>
        </div>
      </section>

      {/* 마지막 CTA */}
      <section className="relative py-16 md:py-32 text-center overflow-hidden bg-bg-main relative">
        {/* 배경 효과 */}
        <div className="hidden md:block absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(212,175,55,0.05)_0%,transparent_60%)]" />

        {/* 장식 (데스크톱) */}
        <div className="hidden md:block absolute top-12 left-1/2 -translate-x-1/2 opacity-10">
          <LaurelIcon size={160} className="text-accent" />
        </div>

        <div className="relative z-10 max-w-2xl mx-auto px-4">
          <h2 className="font-serif font-black text-2xl md:text-4xl text-text-primary mb-4 md:mb-6">
            당신의 이야기를 <span className="text-accent underline decoration-accent/30 underline-offset-8">새기세요</span>
          </h2>
          
          <p className="text-text-secondary text-sm md:text-lg mb-8 md:mb-10 keep-all">
            수많은 인물들의 여정 속에서 영감을 얻고,<br/>
            나만의 고유한 발자취를 남길 시간입니다.
          </p>

          <Link
            href="/login"
            className="inline-flex items-center justify-center gap-2 px-10 md:px-12 py-4 md:py-5 bg-accent text-bg-main font-serif font-bold text-base md:text-lg rounded-full hover:bg-accent-hover shadow-[0_0_30px_rgba(212,175,55,0.3)] hover:shadow-[0_0_50px_rgba(212,175,55,0.5)] transition-all transform hover:-translate-y-1 no-underline"
          >
            기록 시작하기
            <ChevronDown className="-rotate-90" size={20} />
          </Link>
        </div>
      </section>
    </div>
  );
}
