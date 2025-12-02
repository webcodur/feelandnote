"use client";

import Link from "next/link";
import { ArrowRight, BookOpen, Users, Sparkles } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="landing-page">
      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-content">
          <div className="hero-badge">
            <Sparkles size={16} />
            <span>당신의 문화생활을 기록하고 공유하세요</span>
          </div>
          <h1 className="hero-title">
            Feel<span className="gradient-text">&</span>Note
          </h1>
          <p className="hero-subtitle">
            책, 영화, 드라마, 게임... 모든 문화 콘텐츠를 한곳에서 관리하고
            <br />
            당신만의 감상과 창작을 기록하는 특별한 공간
          </p>
          <div className="hero-actions">
            <Link href="/dashboard" className="btn-primary">
              시작하기
              <ArrowRight size={20} />
            </Link>
            <Link href="/archive" className="btn-secondary">
              둘러보기
            </Link>
          </div>
        </div>

        {/* Animated Background */}
        <div className="hero-bg">
          <div className="floating-card card-1"></div>
          <div className="floating-card card-2"></div>
          <div className="floating-card card-3"></div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features-section">
        <h2 className="section-title">무엇을 할 수 있나요?</h2>
        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon">
              <BookOpen size={32} />
            </div>
            <h3>기록관</h3>
            <p>
              읽은 책, 본 영화, 플레이한 게임을 체계적으로 관리하고 진행 상황을 추적하세요.
            </p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">
              <Sparkles size={32} />
            </div>
            <h3>창작 노트</h3>
            <p>
              리뷰, 감상문, 창작물을 자유롭게 작성하고 나만의 문화 아카이브를 만드세요.
            </p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">
              <Users size={32} />
            </div>
            <h3>소셜 피드</h3>
            <p>
              취향이 비슷한 사람들과 연결되고, 추천을 주고받으며 새로운 콘텐츠를 발견하세요.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
