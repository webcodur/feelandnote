"use client";

import Link from "next/link";
import { Button } from "@/components/ui";
import { Sparkles, ArrowRight } from "lucide-react";

export default function SignupBanner() {
  return (
    <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-bg-main via-bg-main/95 to-transparent z-40 pointer-events-none">
      <div className="pointer-events-auto flex flex-col md:flex-row items-center justify-between gap-4 bg-gradient-to-r from-accent/20 via-bg-card to-bg-card border border-accent/30 rounded-2xl p-4 md:p-5 shadow-xl shadow-accent/10 max-w-2xl mx-auto backdrop-blur-sm">
        {/* 왼쪽: 메시지 */}
        <div className="flex items-center gap-3 text-center md:text-left">
          <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center shrink-0">
            <Sparkles size={20} className="text-accent" />
          </div>
          <div>
            <p className="font-semibold text-sm md:text-base">나만의 콘텐츠 기록을 시작해보세요</p>
            <p className="text-xs text-text-secondary mt-0.5 hidden md:block">
              좋아하는 셀럽의 취향도 함께 발견할 수 있어요
            </p>
          </div>
        </div>

        {/* 오른쪽: 버튼 */}
        <div className="flex gap-2 shrink-0 w-full md:w-auto">
          <Link href="/login" className="flex-1 md:flex-none">
            <Button variant="secondary" size="sm" className="w-full md:w-auto">
              로그인
            </Button>
          </Link>
          <Link href="/signup" className="flex-1 md:flex-none">
            <Button variant="primary" size="sm" className="w-full md:w-auto group">
              무료로 시작하기
              <ArrowRight size={14} className="ml-1 group-hover:translate-x-0.5" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
