/*
  파일명: /components/layout/DeploymentNotice.tsx
  기능: 배포가 바뀐 탭에 새로고침을 권한다
  책임: 브라우저에 박힌 배포 식별자와 서버가 지금 내주는 값을 견줘, 어긋나면 띠를 띄운다.

  배포가 나가면 서버가 부르는 이름표가 통째로 갈린다. 그 순간 열려 있던 탭은 옛 이름표를
  쥔 채라, 검색·기록 추가 같은 서버 호출이 오류 없이 빈 결과만 돌려준다. 화면에는 "결과
  없음"으로만 보여 데이터가 사라진 것처럼 읽힌다(2026-09-04 인물 검색 제보가 이 경우였다).
  그래서 사용자가 원인을 짚을 수 있게 알린다.

  확인 시점은 탭으로 돌아왔을 때와 긴 주기 두 가지다. 화면을 보고 있지 않은 탭은 묻지 않는다.
*/ // ------------------------------

"use client";

import { useEffect, useState } from "react";
import { RefreshCw, X } from "lucide-react";
import { useTranslations } from "next-intl";

/* 빌드 때 박히는 값 — 배포 스크립트를 거치지 않은 개발 실행에서는 비어 있고, 그때는 감시하지 않는다 */
const BUILD_ID = process.env.NEXT_PUBLIC_DEPLOYMENT_ID ?? "";

const CHECK_INTERVAL_MS = 15 * 60 * 1000;

export default function DeploymentNotice() {
  const t = useTranslations("layout.update");
  const [isStale, setIsStale] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  // 한 번 어긋난 것을 확인하면 isStale이 이 감시를 걷어간다 — 답은 이미 나왔고 번복되지 않는다.
  useEffect(() => {
    if (!BUILD_ID || isStale) return;

    const controller = new AbortController();

    const check = async () => {
      if (document.visibilityState !== "visible") return;
      try {
        const res = await fetch("/api/deployment", {
          cache: "no-store",
          signal: controller.signal,
        });
        if (!res.ok) return;
        const { id } = (await res.json()) as { id?: string };
        // 값이 비어 오면 서버가 배포 식별자 없이 떠 있다는 뜻이라 판단을 보류한다.
        if (id && id !== BUILD_ID) setIsStale(true);
      } catch {
        // 연결이 끊긴 동안의 실패는 알릴 거리가 아니다. 다음 차례에 다시 묻는다.
      }
    };

    const timer = setInterval(() => void check(), CHECK_INTERVAL_MS);
    const handleVisibility = () => {
      if (document.visibilityState === "visible") void check();
    };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      controller.abort();
      clearInterval(timer);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [isStale]);

  if (!isStale || isDismissed) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      /* 모바일은 하단 내비(h-16) 위로 올린다 */
      className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom,0px))] md:bottom-6 z-50 flex justify-center px-4 pointer-events-none animate-fade-in"
    >
      <div className="pointer-events-auto flex items-center gap-3 max-w-[min(36rem,100%)] rounded-lg border border-accent-dim/50 bg-bg-card/95 px-4 py-3 shadow-[0_10px_30px_rgba(0,0,0,0.5)] backdrop-blur-md">
        <div className="min-w-0">
          <p className="text-sm font-medium text-text-primary">{t("title")}</p>
          <p className="text-xs text-text-secondary mt-0.5">{t("body")}</p>
        </div>

        <button
          type="button"
          onClick={() => window.location.reload()}
          className="shrink-0 flex items-center gap-1.5 rounded-md border border-accent-dim/60 px-3 py-1.5 text-xs font-medium text-accent hover:bg-accent hover:text-bg-main hover:border-accent"
        >
          <RefreshCw size={14} />
          {t("refresh")}
        </button>

        <button
          type="button"
          onClick={() => setIsDismissed(true)}
          aria-label={t("dismiss")}
          className="shrink-0 text-text-secondary hover:text-accent"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
