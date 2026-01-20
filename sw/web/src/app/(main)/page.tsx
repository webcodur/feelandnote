"use client";

import { useRef } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { Logo } from "@/components/ui";
import { LaurelIcon } from "@/components/ui/icons/neo-pantheon";
import {
  FeedIllustration,
  ExploreIllustration,
  LoungeIllustration,
  ArchiveIllustration,
  HeroTexture,
  HeroPillar,
} from "@/components/features/landing/LandingIllustrations";

// #region 섹션 데이터
const SECTIONS = [
  {
    key: "feed",
    href: "/feed",
    illustration: FeedIllustration,
    englishTitle: "Chronicle",
    title: "피드",
    tagline: "기록의 흐름을 따라가다",
    description: "셀럽과 친구들이 남긴 콘텐츠 여정을 실시간으로 확인하세요. 영감의 파도가 끊이지 않습니다.",
    features: ["셀럽 아카이브", "친구 동향", "실시간 업데이트"],
  },
  {
    key: "explore",
    href: "/explore",
    illustration: ExploreIllustration,
    englishTitle: "Discover",
    title: "탐색",
    tagline: "영감을 나누는 사람들",
    description: "취향이 비슷한 사람들을 발견하고, 새로운 콘텐츠 세계를 탐험하세요.",
    features: ["셀럽 탐색", "취향 매칭", "팔로우 네트워크"],
  },
  {
    key: "play",
    href: "/play",
    illustration: LoungeIllustration,
    englishTitle: "Lounge",
    title: "휴게실",
    tagline: "잠시 쉬어가는 공간",
    description: "블라인드 게임, 티어 리스트, 플레이리스트. 기록 사이사이 즐거움을 더합니다.",
    features: ["블라인드 게임", "티어 리스트", "플레이리스트"],
  },
  {
    key: "archive",
    href: "/login",
    illustration: ArchiveIllustration,
    englishTitle: "Archive",
    title: "기록관",
    tagline: "당신만의 판테온",
    description: "읽고, 보고, 들은 모든 것. 인생의 콘텐츠를 한 곳에서 기록하세요.",
    features: ["콘텐츠 라이브러리", "통계 & 인사이트", "프로필 커스텀"],
  },
];
// #endregion

export default function HomePage() {
  const contentRef = useRef<HTMLDivElement>(null);

  const scrollToContent = () => {
    contentRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="bg-bg-main">
      {/* Hero Section - 풀스크린 */}
      <section className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden">
        {/* 배경 효과 */}
        <HeroTexture />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(212,175,55,0.15)_0%,transparent_50%)]" />
        <div className="hidden md:block absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,rgba(212,175,55,0.08)_0%,transparent_60%)]" />

        {/* 기둥 장식 - 좌우 (데스크톱만) */}
        <HeroPillar side="left" className="absolute left-4 md:left-12 top-1/2 -translate-y-1/2 w-16 md:w-20 h-[500px] opacity-[0.12] hidden lg:block" />
        <HeroPillar side="right" className="absolute right-4 md:right-12 top-1/2 -translate-y-1/2 w-16 md:w-20 h-[500px] opacity-[0.12] hidden lg:block" />

        {/* 상단 월계관 장식 (데스크톱만) */}
        <div className="hidden md:block absolute top-8 left-1/2 -translate-x-1/2 opacity-20">
          <LaurelIcon size={120} className="text-accent" />
        </div>

        {/* 상단 장식선 */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-accent/50 to-transparent" />

        {/* 코너 장식 (데스크톱만) */}
        <div className="hidden md:block absolute top-4 left-4 w-16 h-16 border-l-2 border-t-2 border-accent/20 rounded-tl-lg" />
        <div className="hidden md:block absolute top-4 right-4 w-16 h-16 border-r-2 border-t-2 border-accent/20 rounded-tr-lg" />
        <div className="hidden md:block absolute bottom-20 left-4 w-16 h-16 border-l-2 border-b-2 border-accent/20 rounded-bl-lg" />
        <div className="hidden md:block absolute bottom-20 right-4 w-16 h-16 border-r-2 border-b-2 border-accent/20 rounded-br-lg" />

        {/* 메인 컨텐츠 */}
        <div className="relative z-10 flex flex-col items-center text-center px-4 w-full max-w-4xl mx-auto overflow-visible">
          {/* 서브타이틀 */}
          <div className="flex items-center gap-2 md:gap-4 mb-6 md:mb-8 w-full justify-center">
            <div className="flex-1 max-w-[40px] md:max-w-[60px] h-px bg-gradient-to-r from-transparent to-accent/50" />
            <span className="font-cinzel text-[9px] md:text-xs text-accent tracking-[0.2em] md:tracking-[0.5em] uppercase opacity-80 whitespace-normal md:whitespace-nowrap max-w-[200px] md:max-w-none">
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
          <div className="flex flex-col sm:flex-row gap-3 md:gap-4 mb-12 md:mb-16 w-full max-w-[260px] sm:max-w-none justify-center items-center">
            <Link
              href="/login"
              className="group relative px-4 md:px-10 py-2.5 md:py-4 bg-accent text-bg-main font-serif font-bold text-[13px] md:text-base rounded-lg overflow-hidden no-underline flex justify-center items-center"
            >
              <span className="relative z-10">기록 시작하기</span>
              <div className="absolute inset-0 bg-accent-hover opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="absolute inset-0 shadow-[0_0_30px_rgba(212,175,55,0.3)] group-hover:shadow-[0_0_50px_rgba(212,175,55,0.5)] transition-shadow" />
            </Link>
            <Link
              href="/explore"
              className="group px-4 md:px-10 py-2.5 md:py-4 border-2 border-accent/50 text-accent font-serif font-bold text-[13px] md:text-base rounded-lg hover:bg-accent/10 hover:border-accent no-underline transition-all flex justify-center items-center"
            >
              둘러보기
            </Link>
          </div>
        </div>

        {/* 스크롤 유도 (데스크톱만) */}
        <button
          onClick={scrollToContent}
          className="hidden md:flex absolute bottom-8 left-1/2 -translate-x-1/2 flex-col items-center gap-2 text-text-tertiary hover:text-accent cursor-pointer bg-transparent border-none group"
        >
          <span className="text-[10px] font-cinzel tracking-[0.3em] uppercase group-hover:tracking-[0.4em] transition-all">
            Explore
          </span>
          <div className="relative">
            <ChevronDown size={20} className="animate-bounce" />
            <ChevronDown size={20} className="absolute top-2 opacity-50 animate-bounce" style={{ animationDelay: "0.1s" }} />
          </div>
        </button>

        {/* 하단 장식선 (데스크톱만) */}
        <div className="hidden md:block absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-accent/30 to-transparent" />
      </section>

      {/* 섹션 소개 */}
      <div ref={contentRef} className="relative">
        {/* 배경 그라데이션 */}
        <div className="absolute inset-0 bg-gradient-to-b from-bg-main via-bg-secondary to-bg-main pointer-events-none" />

        {SECTIONS.map((section, index) => {
          const Illustration = section.illustration;
          const isEven = index % 2 === 0;

          return (
            <section
              key={section.key}
              className={`relative md:min-h-screen flex items-center py-10 md:py-24 overflow-hidden ${
                isEven ? "" : "bg-bg-secondary/30"
              }`}
            >
              {/* 섹션 배경 효과 (데스크톱만) */}
              <div className={`hidden md:block absolute ${isEven ? "left-0" : "right-0"} top-1/2 -translate-y-1/2 w-1/2 h-full bg-[radial-gradient(ellipse_at_center,rgba(212,175,55,0.05)_0%,transparent_70%)] pointer-events-none`} />

              {/* 섹션 번호 - 배경 (데스크톱만) */}
              <div className={`hidden md:block absolute ${isEven ? "left-8 md:left-16" : "right-8 md:right-16"} top-1/2 -translate-y-1/2 font-cinzel text-[200px] md:text-[300px] font-bold text-accent/[0.03] select-none pointer-events-none`}>
                {String(index + 1).padStart(2, "0")}
              </div>

              <div className="container max-w-7xl mx-auto px-4 md:px-8 relative z-10">
                <div className={`flex flex-col ${isEven ? "lg:flex-row" : "lg:flex-row-reverse"} items-center gap-6 lg:gap-16`}>
                  {/* 일러스트레이션 영역 (데스크톱만) */}
                  <div className="hidden lg:block flex-1 w-full max-w-md lg:max-w-none">
                    <div className="relative aspect-[4/3] w-full">
                      {/* 글로우 배경 */}
                      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(212,175,55,0.1)_0%,transparent_70%)]" />
                      {/* 일러스트레이션 */}
                      <Illustration className="w-full h-full" />
                      {/* 프레임 */}
                      <div className="absolute inset-4 border border-accent/10 rounded-lg pointer-events-none" />
                    </div>
                  </div>

                  {/* 텍스트 영역 */}
                  <div className={`flex-1 ${isEven ? "lg:text-left" : "lg:text-right"} text-center`}>
                    {/* 섹션 번호 (데스크톱만) */}
                    <div className={`hidden md:flex items-center gap-4 mb-4 justify-center ${isEven ? "lg:justify-start" : "lg:justify-end"}`}>
                      <span className="font-cinzel text-4xl md:text-5xl font-bold text-accent/20">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <div className="w-12 h-px bg-accent/30" />
                    </div>

                    {/* 영문 타이틀 */}
                    <span className="font-cinzel text-[10px] md:text-sm text-accent tracking-[0.3em] md:tracking-[0.5em] uppercase opacity-70 block mb-1 md:mb-2">
                      {section.englishTitle}
                    </span>

                    {/* 메인 타이틀 */}
                    <h2 className="font-serif font-black text-3xl md:text-7xl text-text-primary mb-2 md:mb-4">
                      {section.title}
                    </h2>

                    {/* 태그라인 */}
                    <p className="font-serif text-base md:text-3xl text-accent mb-4 md:mb-8">
                      {section.tagline}
                    </p>

                    {/* 설명 (데스크톱만) */}
                    <p className={`hidden md:block text-text-secondary text-base md:text-lg leading-relaxed mb-10 max-w-lg mx-auto ${isEven ? "lg:mx-0" : "lg:ml-auto lg:mr-0"}`}>
                      {section.description}
                    </p>

                    {/* 기능 태그 (데스크톱만) */}
                    <div className={`hidden md:flex flex-wrap gap-3 mb-10 justify-center ${isEven ? "lg:justify-start" : "lg:justify-end"}`}>
                      {section.features.map((feature) => (
                        <span
                          key={feature}
                          className="px-4 py-2 text-sm font-medium text-accent bg-accent/5 border border-accent/20 rounded-full hover:bg-accent/10 transition-colors"
                        >
                          {feature}
                        </span>
                      ))}
                    </div>

                    {/* CTA */}
                    <Link
                      href={section.href}
                      className="inline-flex items-center gap-2 md:gap-3 px-5 md:px-8 py-2.5 md:py-4 bg-accent/10 border border-accent/30 text-accent font-serif font-bold text-sm md:text-lg rounded-lg hover:bg-accent/20 hover:border-accent/50 hover:shadow-[0_0_20px_rgba(212,175,55,0.2)] group no-underline transition-all"
                    >
                      {section.title} 바로가기
                      <span className="group-hover:translate-x-2 transition-transform text-base md:text-xl">→</span>
                    </Link>
                  </div>
                </div>
              </div>

              {/* 섹션 구분 장식 (데스크톱만) */}
              <div className="hidden md:flex absolute bottom-8 left-1/2 -translate-x-1/2 items-center gap-4">
                <div className="w-8 h-px bg-accent/20" />
                <div className="w-1.5 h-1.5 bg-accent/40 rotate-45" />
                <div className="w-8 h-px bg-accent/20" />
              </div>
            </section>
          );
        })}

        {/* 마지막 CTA 섹션 */}
        <section className="relative py-16 md:py-48 text-center overflow-hidden">
          {/* 배경 효과 (데스크톱만) */}
          <div className="hidden md:block absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(212,175,55,0.15)_0%,transparent_50%)]" />
          <div className="hidden md:block absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,rgba(212,175,55,0.1)_0%,transparent_60%)]" />

          {/* 장식 요소 (데스크톱만) */}
          <div className="hidden md:block absolute top-16 left-1/2 -translate-x-1/2 opacity-15">
            <LaurelIcon size={200} className="text-accent" />
          </div>

          <div className="relative z-10 max-w-3xl mx-auto px-4">
            {/* 서브타이틀 (데스크톱만) */}
            <div className="hidden md:flex items-center justify-center gap-4 mb-8">
              <div className="w-16 h-px bg-gradient-to-r from-transparent to-accent/50" />
              <span className="font-cinzel text-xs md:text-sm text-accent tracking-[0.5em] uppercase">
                Begin Your Journey
              </span>
              <div className="w-16 h-px bg-gradient-to-l from-transparent to-accent/50" />
            </div>

            <h2 className="font-serif font-black text-2xl md:text-6xl text-text-primary mb-4 md:mb-8">
              당신의 이야기를<br />
              <span className="text-accent">새기세요</span>
            </h2>

            <p className="text-text-secondary text-sm md:text-xl mb-8 md:mb-12 max-w-xl mx-auto">
              지금 바로 시작하고, 평생의 콘텐츠 여정을 기록하세요.
              <span className="hidden md:inline"><br />당신만의 판테온이 기다리고 있습니다.</span>
            </p>

            <Link
              href="/login"
              className="inline-block px-8 md:px-12 py-3 md:py-5 bg-accent text-bg-main font-serif font-bold text-base md:text-xl rounded-lg hover:bg-accent-hover shadow-[0_0_30px_rgba(212,175,55,0.3)] md:shadow-[0_0_50px_rgba(212,175,55,0.4)] hover:shadow-[0_0_70px_rgba(212,175,55,0.6)] no-underline transition-all"
            >
              무료로 시작하기
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
