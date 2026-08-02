/*
  파일명: /components/ui/BlurDissolve.tsx
  기능: 블러 디졸브 로딩 효과
  책임: 감싼 이미지의 로드가 늦으면(임계 초과) 도착하는 순간 뿌옇게 뭉갠 상태에서
        서서히 또렷해지며 나타나게 한다(팩션 영상의 컷 진입 전환과 같은 연출).
        캐시 등으로 빨리 오는 이미지는 효과 없이 즉시 보인다 — 로딩 애니메이션이지 등장 연출이 아니다.
        내부 <img>의 로드 상태를 스스로 감지하므로 호출부는 감싸기만 하면 된다.
*/ // ------------------------------

"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";

// SSR에서 useLayoutEffect 경고 회피 — 서버에서는 일반 이펙트로 대체된다
const useIsoLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

/* 캐시된 이미지도 로드 신호는 비동기로 오므로 마운트 시점 판정만으로는 캐시를 못 가른다.
   이 시간 안에 도착하면 사실상 즉시로 보고 효과 없이 그대로 표시한다(FadeAvatar 스켈레톤과 같은 임계). */
const SLOW_MS = 150;

// idle: 임계 안 대기(그대로 둠) · armed: 지연 확정(숨김) · play: 도착, 디졸브 재생 · done: 완료
type Phase = "idle" | "armed" | "play" | "done";

interface BlurDissolveProps {
  children: React.ReactNode;
  className?: string;
}

export default function BlurDissolve({ children, className = "" }: BlurDissolveProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [phase, setPhase] = useState<Phase>("idle");

  // 첫 페인트 전에 판정한다 — 이미 로드된 이미지에 불필요한 상태 변화가 없게(레이아웃 이펙트)
  useIsoLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const img = el.querySelector("img");

    // 이미지가 없거나 이미 로드됨 → 효과 없음. 움직임 최소화 설정도 동일.
    if (
      !img ||
      (img.complete && img.naturalWidth > 0) ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      setPhase("done");
      return;
    }

    // 임계를 넘겨도 안 온 이미지만 지연 로드로 확정해 숨긴다(로드 전엔 어차피 픽셀이 없다)
    const timer = setTimeout(() => setPhase((p) => (p === "idle" ? "armed" : p)), SLOW_MS);
    // 도착(또는 실패) 순간: 임계 안이면 효과 없이 그대로, 지연분이면 디졸브 재생
    const onArrive = () => setPhase((p) => (p === "armed" ? "play" : "done"));
    img.addEventListener("load", onArrive);
    img.addEventListener("error", onArrive);
    return () => {
      clearTimeout(timer);
      img.removeEventListener("load", onArrive);
      img.removeEventListener("error", onArrive);
    };
  }, []);

  // 대기(뿌옇게 숨김) → 재생(또렷한 목표 상태 + transition)으로 클래스가 바뀌며 브라우저가 사이를 채운다
  const fx =
    phase === "armed"
      ? "opacity-0 [filter:blur(16px)_contrast(1.5)]"
      : phase === "play"
        ? "opacity-100 [filter:blur(0px)_contrast(1)] [transition:opacity_180ms_linear,filter_500ms_linear]"
        : "";

  return (
    <div
      ref={ref}
      onTransitionEnd={(e) => {
        if (e.target === e.currentTarget && e.propertyName === "filter") setPhase("done");
      }}
      className={`${fx} ${className}`}
    >
      {children}
    </div>
  );
}
