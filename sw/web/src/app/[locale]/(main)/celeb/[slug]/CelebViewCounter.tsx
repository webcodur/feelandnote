"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Eye } from "lucide-react";

import { incrementCelebView } from "@/actions/celebs/incrementCelebView";
import { getCelebViewStats, type CelebViewStats } from "@/actions/celebs/getCelebViewStats";
import { shouldCountCelebView } from "@/lib/celeb/viewDedup";
import CelebViewsModal from "@/components/features/celeb/modals/CelebViewsModal";

/* ── 누적 조회수 ──
   화면 데이터는 최대 7일 캐시를 타므로 서버가 넘겨준 값은 낡아 있을 수 있다.
   조회 반영 함수가 갱신된 값을 되돌려주므로, 그 값으로 숫자를 바꿔 끼운다.
   덕분에 조회수를 따로 물어보는 요청이 없다.
   누르면 인기 프로필 카드와 같은 안내 모달이 열린다. 최근 30일 값은 그때 한 번만 받아온다. */

interface CelebViewCounterProps {
  celebId: string;
  nickname: string;
  /** 서버가 넘긴 값. 낡았을 수 있으나 첫 화면을 비워두지 않기 위해 쓴다. */
  initialCount: number;
}

export default function CelebViewCounter({ celebId, nickname, initialCount }: CelebViewCounterProps) {
  const t = useTranslations("celebPage");
  const [count, setCount] = useState(initialCount);
  const [isOpen, setIsOpen] = useState(false);
  const [stats, setStats] = useState<CelebViewStats | null>(null);

  useEffect(() => {
    let alive = true;

    // 같은 브라우저의 30분 내 재방문은 세지 않되, 현재 값은 받아 온다.
    const shouldCount = shouldCountCelebView(celebId);

    void incrementCelebView(celebId, shouldCount).then((next) => {
      if (alive && typeof next === "number") setCount(next);
    });

    return () => {
      alive = false;
    };
  }, [celebId]);

  const handleOpen = () => {
    setIsOpen(true);
    // 이미 받아온 적이 있으면 다시 부르지 않는다
    if (!stats) void getCelebViewStats(celebId).then(setStats);
  };

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-white/12 bg-transparent p-0 text-text-secondary hover:border-accent/50 hover:bg-white/[0.04] hover:text-accent active:bg-white/[0.07] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
        title={t("viewCount")}
        aria-label={`${t("viewCount")}: ${count.toLocaleString()}`}
      >
        <Eye size={18} aria-hidden />
        <span className="sr-only">{t("viewCount")}: {count.toLocaleString()}</span>
      </button>

      {isOpen && (
        <CelebViewsModal
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          nickname={nickname}
          recentViews={stats?.recentViews ?? null}
          totalViews={stats?.totalViews ?? count}
          windowStart={stats?.windowStart ?? null}
          windowEnd={stats?.windowEnd ?? null}
        />
      )}
    </>
  );
}
