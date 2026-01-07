/*
  파일명: /app/page.tsx
  기능: 랜딩 페이지
  책임: 서비스 소개 및 주요 기능 바로가기를 제공한다.
*/ // ------------------------------

"use client";

import Link from "next/link";
import { ArrowRight, Folder, Newspaper, Compass } from "lucide-react";
import { Z_INDEX } from "@/constants/zIndex";

interface FeatureCardProps {
  href: string;
  icon: React.ReactNode;
  title: string;
  gradient: string;
}

function FeatureCard({ href, icon, title, gradient }: FeatureCardProps) {
  return (
    <Link
      href={href}
      className={`group flex flex-col items-center justify-center p-5 rounded-2xl text-center hover:scale-105 no-underline ${gradient}`}
    >
      <div className="w-12 h-12 mb-3 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center group-hover:scale-110">
        {icon}
      </div>
      <h3 className="text-lg font-bold text-white mb-1">{title}</h3>
      <div className="inline-flex items-center gap-1 text-white/70 group-hover:text-white">
        <span className="text-xs">바로가기</span>
        <ArrowRight size={12} className="group-hover:translate-x-1" />
      </div>
    </Link>
  );
}

export default function Page() {
  return (
    <div className="h-screen bg-bg-main flex flex-col items-center justify-center overflow-hidden relative">
      {/* Logo */}
      <h1 className="text-6xl md:text-7xl font-black mb-4 text-text-primary">
        Feel<span className="bg-gradient-to-r from-accent to-purple-400 bg-clip-text text-transparent">&</span>Note
      </h1>

      {/* Tagline */}
      <p className="text-text-secondary text-lg mb-12">
        당신의 문화생활을 기록하고 공유하세요
      </p>

      {/* Feature Cards */}
      <div className="grid grid-cols-3 gap-4 max-w-xl">
        <FeatureCard
          href="/archive"
          icon={<Folder size={24} className="text-white" />}
          title="기록관"
          gradient="bg-gradient-to-br from-accent to-accent/70"
        />
        <FeatureCard
          href="/archive/feed"
          icon={<Newspaper size={24} className="text-white" />}
          title="피드"
          gradient="bg-gradient-to-br from-blue-500 to-blue-500/70"
        />
        <FeatureCard
          href="/archive/playground"
          icon={<Compass size={24} className="text-white" />}
          title="놀이터"
          gradient="bg-gradient-to-br from-purple-500 to-purple-500/70"
        />
      </div>

      {/* Background Decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" style={{ zIndex: Z_INDEX.background }}>
        <div className="absolute top-1/3 left-1/4 w-80 h-80 bg-accent/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/3 right-1/4 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl animate-pulse delay-1000" />
        <div className="absolute top-1/2 right-1/3 w-48 h-48 bg-pink-500/5 rounded-full blur-3xl animate-pulse delay-500" />
      </div>
    </div>
  );
}
