"use client";

import Link from "next/link";
import { Button } from "@/components/ui";
import { Sparkles } from "lucide-react";

export default function SignupBanner() {
  return (
    <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-bg-main via-bg-main/95 to-transparent z-40">
      <div className="flex items-center justify-between bg-bg-card border border-border rounded-xl p-4 shadow-lg max-w-2xl mx-auto">
        <div className="flex items-center gap-3">
          <Sparkles size={20} className="text-accent shrink-0" />
          <span className="text-sm font-medium">나도 기록을 시작하고 싶다면?</span>
        </div>
        <div className="flex gap-2 shrink-0">
          <Link href="/login">
            <Button variant="secondary" size="sm">
              로그인
            </Button>
          </Link>
          <Link href="/signup">
            <Button variant="primary" size="sm">
              회원가입
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
