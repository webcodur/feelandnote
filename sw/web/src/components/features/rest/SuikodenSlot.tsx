/*
  파일명: /components/features/rest/SuikodenSlot.tsx
  기능: 천도(수이코덴) 게임 데이터 레인
  책임: 인물·대사 조회가 끝날 때까지 로딩 화면만 보여주고, 끝나면 게임을 그린다.
        카드 격자는 이 조회를 기다리지 않는다 — 천도 카드를 실제로 열 때만 쓰인다.
*/ // ------------------------------

"use client";

import { Suspense, use } from "react";
import dynamic from "next/dynamic";
import { Z_INDEX } from "@/constants/zIndex";
import type { GameCharacter } from "@/lib/game/suikoden/types";
import type { DialoguesMap } from "@/components/features/game/suikoden/SuikodenGameWrapper";

function GameLoadingScreen() {
  return (
    <div className="fixed inset-0 bg-bg-main flex items-center justify-center" style={{ zIndex: Z_INDEX.top }}>
      <div className="animate-pulse text-text-secondary font-serif text-lg">Loading…</div>
    </div>
  );
}

const SuikodenGameWrapper = dynamic(
  () => import("@/components/features/game/suikoden/SuikodenGameWrapper"),
  { loading: GameLoadingScreen },
);

interface Props {
  charactersPromise: Promise<GameCharacter[]>;
  dialoguesPromise: Promise<DialoguesMap>;
  onExitFullScreenExternal: () => void;
}

function SuikodenData({ charactersPromise, dialoguesPromise, onExitFullScreenExternal }: Props) {
  const characters = use(charactersPromise);
  const dialogues = use(dialoguesPromise);
  return (
    <SuikodenGameWrapper
      characters={characters}
      dialogues={dialogues}
      initialFullScreen={true}
      onExitFullScreenExternal={onExitFullScreenExternal}
    />
  );
}

export default function SuikodenSlot(props: Props) {
  return (
    <Suspense fallback={<GameLoadingScreen />}>
      <SuikodenData {...props} />
    </Suspense>
  );
}
