/*
  파일명: /components/features/user/explore/personaAnalysis/FadeAvatar.tsx
  기능: 페이드인 아바타
  책임: 기본은 원래처럼 즉시 그린다(브라우저 점진 렌더 그대로).
        임계(150ms)를 넘겨도 안 온 이미지만 스켈레톤으로 채웠다가 도착 시 페이드인.
        이니셜은 아바타가 없는 인물 전용.
*/ // ------------------------------

"use client";

import { useCallback, useEffect, useState } from "react";
import { initials } from "./constants";

// 이 시간까지는 원래 동작 그대로. 넘기면 지연 로딩으로 간주해 페이드 커버 발동
const SLOW_MS = 150;

// eager: 원래 동작(즉시 표시) · waiting: 지연 확정, 스켈레톤 표시 · fade: 지연분 도착, 페이드인 · done: 완료
type LoadState = "eager" | "waiting" | "fade" | "done";

interface FadeAvatarProps {
  src: string | null;
  name: string;
}

export default function FadeAvatar({ src, name }: FadeAvatarProps) {
  const [state, setState] = useState<LoadState>("eager");

  // 캐시에서 이미 완료된 이미지는 onLoad가 안 불릴 수 있어 마운트 시점에 확인
  const ref = useCallback((img: HTMLImageElement | null) => {
    if (img?.complete && img.naturalWidth > 0) setState("done");
  }, []);

  const markLoaded = useCallback(() => {
    setState((s) => (s === "waiting" ? "fade" : "done"));
  }, []);

  // 임계 안에 못 온 이미지만 지연 로딩으로 확정
  useEffect(() => {
    if (!src) return;
    const t = setTimeout(() => {
      setState((s) => (s === "eager" ? "waiting" : s));
    }, SLOW_MS);
    return () => clearTimeout(t);
  }, [src]);

  const loadingCover = src && (state === "waiting" || state === "fade");

  return (
    <div className="relative size-full">
      {!src && (
        <div className="flex size-full items-center justify-center text-[10px] font-bold text-text-secondary">
          {initials(name)}
        </div>
      )}
      {loadingCover && (
        <div className="size-full animate-pulse bg-gradient-to-br from-border/50 to-border/15" />
      )}
      {src && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          ref={ref}
          src={src}
          alt={name}
          decoding="async"
          onLoad={markLoaded}
          className={
            "absolute inset-0 size-full object-cover " +
            (state === "waiting"
              ? "opacity-0"
              : state === "fade"
                ? "opacity-100 transition-opacity duration-300 ease-out"
                : "opacity-100")
          }
        />
      )}
    </div>
  );
}
