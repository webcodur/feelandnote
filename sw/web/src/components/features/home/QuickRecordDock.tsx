/*
  파일명: /components/features/home/QuickRecordDock.tsx
  기능: 홈 빠른기록 여닫이 — 로그인 유저의 기록 도구를 콘텐츠 흐름과 분리해 배너 한 줄로 접는다
  책임: 접힌 줄이 도구의 존재를 알리고, 펼치면 서버가 이미 그려 보낸 도구 본문을 연다.
        본문은 children으로 받아 여닫이 상태만 여기서 쥔다.
*/

"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown, ChevronUp, PenLine } from "lucide-react";

interface QuickRecordDockProps {
  title: string;
  children: ReactNode;
}

export default function QuickRecordDock({
  title,
  children,
}: QuickRecordDockProps) {
  const [open, setOpen] = useState(false);

  return (
    <section className="w-full px-3 md:px-0">
      {/* 머리와 본문을 한 상자에 둔다. 접혔을 때는 알림 배너 폭(max-w-md)이고, 펼치면 도구가
          쓸 만큼만 넓어진다(max-w-2xl). 본문 구획(max-w-3xl)까지 벌리면 상단 도구가
          콘텐츠만큼 무거워 보인다. 상자를 나누면 열린 기록 영역이 별개 덩어리로 보인다 */}
      {/* 폭이 실제로 벌어지고 좁아지는 전환이라 애니메이션을 건다(공간 개폐 — AGENTS.md UI 규칙).
          속성을 max-width로 한정해 안쪽 색 강조까지 느려지지 않게 한다 */}
      <div
        className={`mx-auto w-full overflow-hidden rounded-xl border border-white/10 bg-card transition-[max-width] duration-300 ease-out ${
          open ? "max-w-2xl" : "max-w-md"
        }`}
      >
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="relative flex w-full items-center px-4 py-3 pe-11 hover:bg-accent/5"
        >
          {/* 아이콘과 제목은 가운데 선다. 화살표 자리(pe-11)만 비워
              제목이 한쪽으로 밀리지 않게 한다 */}
          <span className="mx-auto flex min-w-0 items-center justify-center gap-2.5">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-main text-text-secondary">
              <PenLine size={16} />
            </span>
            <span className="whitespace-nowrap font-semibold text-text-primary">{title}</span>
          </span>
          <span className="absolute right-4 shrink-0 text-text-secondary">
            {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </span>
        </button>

        {/* 본문은 서버가 이미 그려 보냈다 — 여닫이는 표시만 바꾼다 */}
        <div className={open ? "border-t border-white/10 p-4" : "hidden"}>
          {children}
        </div>
      </div>
    </section>
  );
}
