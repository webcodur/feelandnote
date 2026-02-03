/*
  파일명: /contexts/SoundContext.tsx
  기능: 전역 사운드 상태 관리
  책임: 사운드 온/오프 상태와 재생 함수를 전역으로 제공한다.
*/ // ------------------------------

"use client";

import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from "react";

// #region Types
type SoundType =
  | "click"        // 버튼, 탭, 칩 클릭
  | "success"      // 저장 완료, 삭제 완료
  | "error"        // 오류 발생, 실패
  | "toggle"       // 체크박스, 토글 스위치
  | "modalOpen"    // 모달/드롭다운 열기
  | "modalClose"   // 모달/드롭다운 닫기
  | "unlock"       // 칭호 해금 (일반~희귀)
  | "unlockEpic"   // 칭호 해금 (에픽~전설)
  | "star"         // 별점 클릭
  | "drag"         // 드래그 시작
  | "drop"         // 드롭 완료
  | "gameStart"    // 게임 시작
  | "gameCorrect"  // 게임 정답
  | "gameWrong"    // 게임 오답
  | "gameEnd"      // 게임 종료
  | "volumeCheck" // 볼륨 확인 (사운드 토글 시)
  | "pin"        // 핀 꽂기
  | "unpin";     // 핀 뽑기

export type { SoundType };

interface SoundContextValue {
  isSoundEnabled: boolean;
  toggleSound: () => boolean; // 새 상태 반환
  playSound: (type: SoundType, force?: boolean) => void;
}

interface SoundProviderProps {
  children: ReactNode;
}
// #endregion

// #region Sound URLs
// public/sounds 폴더에 mp3 파일 추가 필요
const soundUrls: Record<SoundType, string> = {
  click: "/sounds/click.mp3",
  success: "/sounds/success.mp3",
  error: "/sounds/error.mp3",
  toggle: "/sounds/toggle.mp3",
  modalOpen: "/sounds/modal-open.mp3",
  modalClose: "/sounds/modal-close.mp3",
  unlock: "/sounds/unlock.mp3",
  unlockEpic: "/sounds/unlock-epic.mp3",
  star: "/sounds/star.mp3",
  drag: "/sounds/drag.mp3",
  drop: "/sounds/drop.mp3",
  gameStart: "/sounds/game-start.mp3",
  gameCorrect: "/sounds/game-correct.mp3",
  gameWrong: "/sounds/game-wrong.mp3",
  gameEnd: "/sounds/game-end.mp3",
  volumeCheck: "/sounds/volume-check.mp3",
  pin: "/sounds/dart-throw.mp3",
  unpin: "/sounds/unpin.mp3",
};
// #endregion

// #region Context
const SoundContext = createContext<SoundContextValue | null>(null);

const STORAGE_KEY = "feelandnote_sound_enabled";

export function SoundProvider({ children }: SoundProviderProps) {
  const [isSoundEnabled, setIsSoundEnabled] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const audioCache = useRef<Map<SoundType, HTMLAudioElement>>(new Map());

  // 클라이언트 사이드에서만 localStorage 접근
  useEffect(() => {
    setIsClient(true);
    const stored = localStorage.getItem(STORAGE_KEY);
    // 기본값: 끔 (저장된 값이 없으면 false)
    setIsSoundEnabled(stored === "true");
  }, []);

  // 오디오 캐시 초기화
  useEffect(() => {
    if (!isClient) return;

    Object.entries(soundUrls).forEach(([type, url]) => {
      const audio = new Audio(url);
      audio.preload = "auto";
      audio.volume = 0.3;
      audioCache.current.set(type as SoundType, audio);
    });

    return () => {
      audioCache.current.forEach((audio) => {
        audio.pause();
        audio.src = "";
      });
      audioCache.current.clear();
    };
  }, [isClient]);

  const toggleSound = useCallback(() => {
    const newState = !isSoundEnabled;
    setIsSoundEnabled(newState);
    localStorage.setItem(STORAGE_KEY, String(newState));
    return newState;
  }, [isSoundEnabled]);

  const playSound = useCallback(
    (type: SoundType, force = false) => {
      if (!force && !isSoundEnabled) return;

      const audio = audioCache.current.get(type);
      if (!audio) return;

      // 재생 중이면 처음부터 다시 재생
      audio.currentTime = 0;
      audio.play().catch(() => {
        // 자동재생 정책으로 인한 에러 무시
      });
    },
    [isSoundEnabled]
  );

  return (
    <SoundContext.Provider value={{ isSoundEnabled, toggleSound, playSound }}>
      {children}
    </SoundContext.Provider>
  );
}
// #endregion

// #region Hook
export function useSound() {
  const context = useContext(SoundContext);
  if (!context) {
    throw new Error("useSound must be used within SoundProvider");
  }
  return context;
}

// 선택적 훅: Provider 밖에서도 안전하게 사용 가능 (사운드 비활성화 상태)
export function useSoundOptional(): SoundContextValue {
  const context = useContext(SoundContext);
  return context ?? {
    isSoundEnabled: false,
    toggleSound: () => false,
    playSound: () => {},
  };
}
// #endregion
