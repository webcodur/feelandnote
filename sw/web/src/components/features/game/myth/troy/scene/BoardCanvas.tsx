/*
  파일명: components/features/game/myth/troy/scene/BoardCanvas.tsx
  기능: 3D 전장 React 감싸개
  책임: 부모 크기를 채우는 캔버스를 만들고 BoardView를 세워 onReady로 넘긴다. 크기가 바뀌면 resize를, 치울 때 dispose를 부른다.
        마운트마다 캔버스를 새로 만들어 StrictMode의 두 번 마운트에도 안전하다. WebGL을 못 쓰면 onError로 알린다.
        reducedMotion·quality가 바뀌면 뷰를 새로 세우므로(onReady가 다시 불린다) 판·말을 다시 넘겨야 한다.
        quality를 넘기지 않으면 기기를 보고 정한다(메모리·코어가 적은 기기는 그림자 없는 낮은 품질).
*/ // ------------------------------
"use client";
import { useEffect, useRef } from "react";
import type { Point } from "../engine/types";
import { BoardView } from "./BoardView";
import type { SceneQuality } from "./types";

interface Props {
  // 넘기지 않으면 사용자 설정(prefers-reduced-motion)을 따른다
  reducedMotion?: boolean;
  // 넘기지 않으면 기기에 맞춰 고른다
  quality?: SceneQuality;
  onTileTap?: (p: Point) => void;
  onTileHover?: (p: Point | null) => void;
  onReady?: (view: BoardView | null) => void;
  onError?: (error: Error) => void;
  // 화면 읽기 프로그램이 읽을 이름
  label?: string;
  className?: string;
}

interface Handlers {
  onTileTap?: (p: Point) => void;
  onTileHover?: (p: Point | null) => void;
  onReady?: (view: BoardView | null) => void;
  onError?: (error: Error) => void;
}

// 메모리 3GB 이하이거나 코어가 셋 이하인 기기는 낮은 품질로 연다(deviceMemory는 크롬 계열만 알려 준다)
function autoQuality(): SceneQuality {
  const device = navigator as Navigator & { deviceMemory?: number };
  const weak = (device.deviceMemory ?? 8) <= 3 || (navigator.hardwareConcurrency || 8) <= 3;
  return weak ? "low" : "high";
}

export default function BoardCanvas({ reducedMotion, quality, onTileTap, onTileHover, onReady, onError, label, className }: Props) {
  const box = useRef<HTMLDivElement>(null);
  const handlers = useRef<Handlers>({});

  // 부르는 쪽이 새 함수를 넘겨도 뷰를 다시 세우지 않게 늘 마지막 함수를 부른다
  useEffect(() => {
    handlers.current = { onTileTap, onTileHover, onReady, onError };
  });

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const canvas = document.createElement("canvas");
    canvas.className = "block h-full w-full";
    canvas.setAttribute("role", "img");
    if (label) canvas.setAttribute("aria-label", label);
    el.appendChild(canvas);
    const reduced = reducedMotion ?? window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let view: BoardView;
    try {
      view = new BoardView({
        canvas, reducedMotion: reduced, quality: quality ?? autoQuality(),
        onTileTap: (p) => handlers.current.onTileTap?.(p),
        onTileHover: (p) => handlers.current.onTileHover?.(p),
      });
    } catch (e) {
      canvas.remove();
      handlers.current.onError?.(e instanceof Error ? e : new Error(String(e)));
      return;
    }
    const observer = new ResizeObserver(() => view.resize());
    observer.observe(el);
    handlers.current.onReady?.(view);
    return () => {
      observer.disconnect();
      handlers.current.onReady?.(null);
      view.dispose();
      // 떼어 낸 캔버스의 GPU 자원을 바로 돌려준다(브라우저의 WebGL 문맥 수 제한)
      canvas.getContext("webgl2")?.getExtension("WEBGL_lose_context")?.loseContext();
      canvas.remove();
    };
  }, [reducedMotion, quality, label]);

  return <div ref={box} className={className ?? "relative h-full w-full overflow-hidden"} />;
}
