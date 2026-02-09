"use client";

import Link from "next/link";
import { Gamepad2 } from "lucide-react";

export default function Footer() {
  return (
    <footer className="w-full py-8 mt-20 border-t border-white/5 bg-bg-secondary text-text-tertiary text-sm">
      <div className="container mx-auto px-6">
        {/* 상단: 쉼터 링크 */}
        <div className="flex justify-center mb-6">
          <Link
            href="/rest"
            className="group flex items-center gap-2 px-5 py-2.5 rounded-full border border-white/10 hover:border-accent/40 bg-white/5 hover:bg-accent/10 transition-all"
          >
            <Gamepad2 size={16} className="text-text-secondary group-hover:text-accent transition-colors" />
            <span className="text-sm font-medium text-text-secondary group-hover:text-accent transition-colors">
              쉼터
            </span>
            <span className="text-xs text-text-tertiary group-hover:text-accent/70 transition-colors">
              — 쉬어가기
            </span>
          </Link>
        </div>

        {/* 하단: 저작권 + 약관 */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-4 border-t border-white/5">
          <div className="font-serif text-text-tertiary/60">
            &copy; {new Date().getFullYear()} Feel&Note
          </div>
          <div className="flex items-center gap-4 text-xs text-text-tertiary/50">
            <Link href="/terms" className="hover:text-text-secondary transition-colors">
              이용약관
            </Link>
            <Link href="/privacy" className="hover:text-text-secondary transition-colors">
              개인정보처리방침
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
