"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale } from "next-intl";

import CelebProfessionMark from "./CelebProfessionMark";

const DESCRIPTIONS: Record<string, { ko: string; en: string }> = {
  leader: { ko: "조직과 공동체가 나아갈 방향을 정하고 이끕니다.", en: "A person who sets direction and leads an organization or community." },
  politician: { ko: "공공의 문제를 다루고 정책을 결정합니다.", en: "A person involved in public decision-making and policy." },
  commander: { ko: "군대나 집단의 작전을 세우고 지휘합니다.", en: "A person who commands military or group operations." },
  humanities_scholar: { ko: "언어·역사·철학을 바탕으로 인간과 문화를 연구합니다.", en: "A scholar who studies language, history, philosophy, and human culture." },
  author: { ko: "글을 쓰고 책과 이야기를 만듭니다.", en: "A person who writes and creates books or stories." },
  scientist: { ko: "자연과 세계의 원리를 관찰하고 검증합니다.", en: "A person who investigates and tests how the natural world works." },
  social_scientist: { ko: "사회와 사람들의 행동, 관계를 연구합니다.", en: "A person who studies society and human behavior or relationships." },
  director: { ko: "영화와 영상 작품의 방향을 정하고 완성까지 이끕니다.", en: "A person who leads the creative direction of film or video works." },
  actor: { ko: "작품 속 인물을 연기로 살아 있게 만듭니다.", en: "A person who portrays characters through performance." },
  influencer: { ko: "자신의 생각과 취향으로 대중의 관심과 문화를 움직입니다.", en: "A person who influences public opinion and culture." },
  musician: { ko: "소리와 음악으로 자신의 작품을 만듭니다.", en: "A person who creates works through sound and music." },
  visual_artist: { ko: "이미지와 조형 언어로 생각과 감정을 표현합니다.", en: "A person who expresses ideas through visual and material language." },
  entrepreneur: { ko: "새로운 사업을 시작하고 조직을 키워 갑니다.", en: "A person who builds and grows new businesses or organizations." },
  investor: { ko: "자본을 어디에 맡길지 판단하고 기업과 자산의 가치를 살핍니다.", en: "A person who allocates capital and evaluates businesses or assets." },
  athlete: { ko: "스포츠 기술을 갈고닦으며 경기와 기록에 도전합니다.", en: "A person who pursues achievement through sporting skill and competition." },
};

interface ProfessionInfoButtonProps {
  profession: string;
  label: string;
}

export default function ProfessionInfoButton({ profession, label }: ProfessionInfoButtonProps) {
  const locale = useLocale() === "en" ? "en" : "ko";
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const description = DESCRIPTIONS[profession]?.[locale] ?? label;

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setIsOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  return (
    <div ref={rootRef} className="relative inline-flex">
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-label={label}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-white/12 bg-transparent p-0 text-accent hover:border-accent/60 hover:bg-white/[0.05] hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
      >
        <CelebProfessionMark profession={profession} size={17} />
      </button>

      {isOpen ? (
        <div
          role="dialog"
          aria-label={label}
          className="absolute start-0 top-[calc(100%+10px)] z-30 w-64 rounded-xl border border-accent/25 bg-[#11181b]/[.98] p-3 text-start shadow-[0_16px_36px_rgba(0,0,0,.45)] backdrop-blur-md"
        >
          <p className="text-sm font-semibold text-accent">{label}</p>
          <p className="mt-1 text-sm leading-relaxed text-text-secondary">{description}</p>
        </div>
      ) : null}
    </div>
  );
}
