"use client";

import Link from "next/link";
import { Users, BookOpen } from "lucide-react";

export function HomeNavigationLinks() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Link
        href="/explore"
        className="group flex flex-col items-center justify-center p-6 rounded-xl bg-card border border-white/5 hover:border-accent/30 hover:bg-accent/5 transition-all duration-300"
      >
        <div className="p-3 rounded-full bg-main mb-3 text-text-secondary group-hover:text-accent group-hover:scale-110 transition-all duration-300">
          <Users size={24} strokeWidth={1.5} />
        </div>
        <h3 className="text-lg font-serif font-bold text-text-primary mb-1 group-hover:text-accent transition-colors">
          더 많은 인물 보기
        </h3>
        <p className="text-sm text-text-tertiary">
          시대와 분야를 아우르는 인물들을 만나보세요
        </p>
      </Link>

      <Link
        href="/scriptures"
        className="group flex flex-col items-center justify-center p-6 rounded-xl bg-card border border-white/5 hover:border-accent/30 hover:bg-accent/5 transition-all duration-300"
      >
        <div className="p-3 rounded-full bg-main mb-3 text-text-secondary group-hover:text-accent group-hover:scale-110 transition-all duration-300">
          <BookOpen size={24} strokeWidth={1.5} />
        </div>
        <h3 className="text-lg font-serif font-bold text-text-primary mb-1 group-hover:text-accent transition-colors">
          더 많은 자료 보기
        </h3>
        <p className="text-sm text-text-tertiary">
          인물들이 남긴 지혜의 기록을 탐색하세요
        </p>
      </Link>
    </div>
  );
}
