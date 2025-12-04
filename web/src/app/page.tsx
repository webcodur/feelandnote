"use client";

import Link from "next/link";
import { ArrowRight, BookOpen, Users, Sparkles } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-bg-main overflow-auto">
      {/* Hero Section */}
      <section className="min-h-screen flex flex-col items-center justify-center text-center px-6 relative overflow-hidden">
        <div className="relative z-10 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-accent/10 border border-accent/30 rounded-full px-4 py-2 mb-8">
            <Sparkles size={16} className="text-accent" />
            <span className="text-sm text-text-secondary">당신의 문화생활을 기록하고 공유하세요</span>
          </div>
          <h1 className="text-6xl md:text-7xl font-black mb-6 text-text-primary">
            Feel<span className="bg-gradient-to-r from-accent to-purple-400 bg-clip-text text-transparent">&</span>Note
          </h1>
          <p className="text-lg md:text-xl text-text-secondary mb-10 leading-relaxed">
            책, 영화, 드라마, 게임... 모든 문화 콘텐츠를 한곳에서 관리하고
            <br />
            당신만의 감상과 창작을 기록하는 특별한 공간
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 bg-accent hover:bg-accent-hover text-white font-semibold px-6 py-3 rounded-xl transition-colors"
            >
              시작하기
              <ArrowRight size={20} />
            </Link>
            <Link
              href="/archive"
              className="inline-flex items-center gap-2 border border-border hover:border-accent text-text-primary font-semibold px-6 py-3 rounded-xl transition-colors"
            >
              둘러보기
            </Link>
          </div>
        </div>

        {/* Animated Background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-accent/10 rounded-3xl blur-3xl animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-48 h-48 bg-purple-500/10 rounded-3xl blur-3xl animate-pulse delay-1000" />
          <div className="absolute top-1/2 right-1/3 w-32 h-32 bg-pink-500/10 rounded-3xl blur-3xl animate-pulse delay-500" />
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 px-6">
        <h2 className="text-3xl md:text-4xl font-bold text-center text-text-primary mb-16">무엇을 할 수 있나요?</h2>
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-bg-card border border-border rounded-2xl p-8 text-center hover:border-accent transition-colors">
            <div className="w-16 h-16 mx-auto mb-6 bg-accent/10 rounded-2xl flex items-center justify-center">
              <BookOpen size={32} className="text-accent" />
            </div>
            <h3 className="text-xl font-bold text-text-primary mb-3">기록관</h3>
            <p className="text-text-secondary leading-relaxed">
              읽은 책, 본 영화, 플레이한 게임을 체계적으로 관리하고 진행 상황을 추적하세요.
            </p>
          </div>
          <div className="bg-bg-card border border-border rounded-2xl p-8 text-center hover:border-accent transition-colors">
            <div className="w-16 h-16 mx-auto mb-6 bg-accent/10 rounded-2xl flex items-center justify-center">
              <Sparkles size={32} className="text-accent" />
            </div>
            <h3 className="text-xl font-bold text-text-primary mb-3">창작 노트</h3>
            <p className="text-text-secondary leading-relaxed">
              리뷰, 감상문, 창작물을 자유롭게 작성하고 나만의 문화 아카이브를 만드세요.
            </p>
          </div>
          <div className="bg-bg-card border border-border rounded-2xl p-8 text-center hover:border-accent transition-colors">
            <div className="w-16 h-16 mx-auto mb-6 bg-accent/10 rounded-2xl flex items-center justify-center">
              <Users size={32} className="text-accent" />
            </div>
            <h3 className="text-xl font-bold text-text-primary mb-3">소셜 피드</h3>
            <p className="text-text-secondary leading-relaxed">
              취향이 비슷한 사람들과 연결되고, 추천을 주고받으며 새로운 콘텐츠를 발견하세요.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
