"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Eye } from "lucide-react";

import { incrementCelebView } from "@/actions/celebs/incrementCelebView";
import { shouldCountCelebView } from "@/lib/celeb/viewDedup";

/* ── 누적 조회수 ──
   화면 데이터는 최대 7일 캐시를 타므로 서버가 넘겨준 값은 낡아 있을 수 있다.
   조회 반영 함수가 갱신된 값을 되돌려주므로, 그 값으로 숫자를 바꿔 끼운다.
   덕분에 조회수를 따로 물어보는 요청이 없다. */

interface CelebViewCounterProps {
  celebId: string;
  /** 서버가 넘긴 값. 낡았을 수 있으나 첫 화면을 비워두지 않기 위해 쓴다. */
  initialCount: number;
}

export default function CelebViewCounter({ celebId, initialCount }: CelebViewCounterProps) {
  const t = useTranslations("celebPage");
  const [count, setCount] = useState(initialCount);

  useEffect(() => {
    let alive = true;

    // 같은 브라우저의 24시간 내 재방문은 세지 않되, 현재 값은 받아 온다.
    const shouldCount = shouldCountCelebView(celebId);

    void incrementCelebView(celebId, shouldCount).then((next) => {
      if (alive && typeof next === "number") setCount(next);
    });

    return () => {
      alive = false;
    };
  }, [celebId]);

  return (
    <span
      className="inline-flex items-center gap-1 font-mono text-text-tertiary"
      title={t("viewCount")}
    >
      <Eye size={12} aria-hidden />
      <span className="sr-only">{t("viewCount")}</span>
      {count.toLocaleString()}
    </span>
  );
}
