/*
  파일명: components/features/game/myth/shared/MythGameFrame.tsx
  기능: 신화 게임 공용 틀
  책임: 화면 전체를 덮는 층·머리줄·신화 그림 배경·체험 표본 띠를 한 번에 씌운다.
        층은 서버가 그린 첫 화면부터 실험실 머리글을 덮는다(나중에 덮으며 깜빡이지 않는다).
        나가기(ESC 포함)는 신화 게임 목록으로 돌아간다. 배경 그림은 시작·결과 화면이 표지로 함께 쓴다.
*/ // ------------------------------
"use client";

import { useCallback, useEffect, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Z_INDEX } from "@/constants/zIndex";
import { setGameFullScreenLayer } from "@/components/layout/musicPlayerSlots";
import MythBackdrop from "./MythBackdrop";
import MythTopBar from "./MythTopBar";
import { MythStageContext } from "./stage";

interface Props {
  title: string;
  // 판 안의 단계 이름(예: 결과). 비우면 게임 이름까지만 보인다
  phaseLabel?: string | null;
  onTitleClick: () => void;
  isFixture: boolean;
  fixtureCount: number;
  backdrop?: string | null;
  children: ReactNode;
}

export default function MythGameFrame({ title, phaseLabel, onTitleClick, isFixture, fixtureCount, backdrop = null, children }: Props) {
  const router = useRouter();
  const tGame = useTranslations("shared.game");
  const t = useTranslations("gameMyth.shared");
  const goHub = useCallback(() => router.push("/rest"), [router]);

  // 틀이 떠 있는 동안 뒤 화면이 따라 굴러가지 않게 막고, ESC로 목록에 돌아간다
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") goHub();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [goHub]);

  return (
    <div ref={setGameFullScreenLayer} className="fixed inset-0 isolate flex flex-col bg-bg-main text-text-primary" style={{ zIndex: Z_INDEX.top }}>
      <MythBackdrop src={backdrop} />
      <MythTopBar
        hubLabel={t("hubName")}
        title={title}
        phaseLabel={phaseLabel}
        exitHint={tGame("exitEsc")}
        onHub={goHub}
        onTitle={onTitleClick}
      />
      <div data-myth-scroll className="relative z-[1] flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 sm:px-5 lg:px-8">
        {isFixture && (
          <p role="status" className="mx-auto mb-3 w-full max-w-2xl rounded-lg border border-accent-dim bg-bg-card/90 px-3 py-2 text-center text-sm text-accent">
            {t("fixtureMode", { count: fixtureCount })}
          </p>
        )}
        <MythStageContext.Provider value={backdrop}>{children}</MythStageContext.Provider>
      </div>
    </div>
  );
}
