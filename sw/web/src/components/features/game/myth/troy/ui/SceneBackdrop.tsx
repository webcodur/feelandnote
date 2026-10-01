/*
  파일명: components/features/game/myth/troy/ui/SceneBackdrop.tsx
  기능: 트로이 전쟁 3D 배경판
  책임: 제목·이야기·출진 준비 화면 뒤에 장의 싸움판을 천천히 돌려 깐다. 출진 칸 같은 강조를 켜 줄 수 있다.
        세로로 긴 화면에서는 조금 다가가 판을 크게 보인다. WebGL을 못 쓰면 『일리아스』 표지 그림으로 대신한다.
*/ // ------------------------------
"use client";

import { useEffect, useState } from "react";
import { artAt } from "../../shared/art";

const TROY_COVER = "/images/myth-atlas/title-art/homer-iliad.png";
import type { BattleMap, Point } from "../engine";
import BoardCanvas from "../scene/BoardCanvas";
import type { BoardView, SceneUnit } from "../scene/BoardView";

interface Props {
  map: BattleMap;
  units?: SceneUnit[];
  deploy?: Point[];
  orbit?: boolean;
  dim?: "light" | "heavy" | "none";
  // 세로 화면에서 다가갈 비율(1이면 그대로)
  portraitZoom?: number;
  // 판 표지(성문 열림·닫힌 목마 등)
  flags?: string[];
  className?: string;
}

const NO_FLAGS: string[] = [];

const DIM = {
  light: "bg-linear-to-t from-bg-main via-bg-main/40 to-bg-main/10",
  heavy: "bg-linear-to-t from-bg-main via-bg-main/75 to-bg-main/35",
  none: "",
} as const;

export default function SceneBackdrop({ map, units = [], deploy = [], orbit = true, dim = "light", portraitZoom = 0.8, flags = NO_FLAGS, className = "absolute inset-0" }: Props) {
  const [view, setView] = useState<BoardView | null>(null);
  // 판을 다 지은 뷰(말은 판이 선 뒤에 올린다)
  const [ready, setReady] = useState<BoardView | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (!view) return;
    let live = true;
    void view.setMap(map, flags).then(() => {
      if (!live) return;
      view.setAutoOrbit(orbit);
      setReady(view);
    });
    return () => {
      live = false;
    };
  }, [view, map, orbit, flags]);
  useEffect(() => {
    if (!ready) return;
    ready.setUnits(units);
    ready.highlight("deploy", deploy);
  }, [ready, units, deploy]);
  useEffect(() => {
    if (view && window.innerHeight > window.innerWidth * 1.2 && portraitZoom !== 1) view.zoomBy(portraitZoom);
  }, [view, portraitZoom]);
  const cover = artAt(TROY_COVER, 1536);
  return (
    <div className={className} aria-hidden>
      {!failed && <BoardCanvas className="absolute inset-0" onReady={setView} onError={() => setFailed(true)} />}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {failed && cover && <img src={cover} alt="" className="absolute inset-0 h-full w-full object-cover" />}
      {dim !== "none" && <div className={`pointer-events-none absolute inset-0 ${DIM[dim]}`} />}
    </div>
  );
}
