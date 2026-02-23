"use client";

import React from "react";
import { useParams, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

// Background components
import SeaWavesBackground from "@/components/lab/SeaWavesBackground";
import BurningEmbersBackground from "@/components/lab/BurningEmbersBackground";
import GoldenAscensionBackground from "@/components/lab/GoldenAscensionBackground";
import OlympusOrbitBackground from "@/components/lab/OlympusOrbitBackground";
import OracleVisionBackground from "@/components/lab/OracleVisionBackground";

// Banner components
import AstrolabeBanner from "@/components/lab/AstrolabeBanner";
import ArchiveTunnelBanner from "@/components/lab/ArchiveTunnelBanner";
import LyreBanner from "@/components/lab/LyreBanner";
import PrismBanner from "@/components/lab/PrismBanner";
import ConstellationBanner from "@/components/lab/ConstellationBanner";
import HexagonBanner from "@/components/lab/HexagonBanner";
import EternalFlameBanner from "@/components/lab/EternalFlameBanner";
import TreeBanner from "@/components/lab/TreeBanner";
import PendulumBanner from "@/components/lab/PendulumBanner";
import OrreryBanner from "@/components/lab/OrreryBanner";
import SealedEdictBanner from "@/components/lab/SealedEdictBanner";
import SacredGeometryBanner from "@/components/lab/SacredGeometryBanner";
import GoldenSpiralBanner from "@/components/lab/GoldenSpiralBanner";
import ParchmentScrollBanner from "@/components/lab/ParchmentScrollBanner";
import HegemonyMapBanner from "@/components/lab/HegemonyMapBanner";

interface BgItem {
  id: string;
  label: string;
  desc: string;
  component: React.ReactNode;
}

const BACKGROUNDS: BgItem[] = [
  // --- Cinematic Backgrounds ---
  { id: "deep-sea", label: "Deep Sea", desc: "심해의 고요함과 파동을 표현한 인터랙티브 웨이브", component: <SeaWavesBackground /> },
  { id: "warfare", label: "Warfare", desc: "전장의 불씨와 긴장감을 표현한 파티클 이펙트", component: <BurningEmbersBackground /> },
  { id: "golden-ascension", label: "Golden Ascension", desc: "황금빛 입자의 상승과 확산을 표현한 럭셔리 이펙트", component: <GoldenAscensionBackground /> },
  { id: "olympus-orbit", label: "Olympus Orbit", desc: "신들의 성소, 올림푸스 산과 신전의 360도 공전", component: <OlympusOrbitBackground /> },
  { id: "oracle-vision", label: "Oracle Vision", desc: "형체를 알 수 없는 연기와 흐릿한 잔상이 만드는 무의식의 공간", component: <OracleVisionBackground /> },
  // --- Banner Effects ---
  { id: "astrolabe", label: "Celestial Mechanism", desc: "천체 운행 메커니즘을 형상화한 기계식 아스트롤라베", component: <AstrolabeBanner /> },
  { id: "tunnel", label: "Archive Tunnel", desc: "무한한 기록의 터널을 통과하는 몰입형 공간", component: <ArchiveTunnelBanner /> },
  { id: "lyre", label: "Golden Lyre", desc: "황금빛 리라의 현이 울리는 음악적 연출", component: <LyreBanner /> },
  { id: "prism", label: "Prism Cube", desc: "빛의 굴절과 반사를 형상화한 프리즘 큐브", component: <PrismBanner /> },
  { id: "constellation", label: "Star Network", desc: "별자리 네트워크의 연결과 확장", component: <ConstellationBanner /> },
  { id: "hexagon", label: "Sacred Geometry", desc: "신성한 기하학 패턴의 육각형 그리드", component: <HexagonBanner /> },
  { id: "flame", label: "Eternal Flame", desc: "영원히 타오르는 불꽃의 파티클 이펙트", component: <EternalFlameBanner /> },
  { id: "tree", label: "Sacred Tree", desc: "뿌리부터 잎까지 생명의 나무를 형상화", component: <TreeBanner /> },
  { id: "pendulum", label: "Newton's Cradle", desc: "뉴턴의 요람 — 에너지 전달의 역학적 시각화", component: <PendulumBanner /> },
  { id: "orrery", label: "Grand Orrery", desc: "태양계 천체 운동을 재현한 그랜드 오러리", component: <OrreryBanner /> },
  { id: "sealed-edict", label: "Sealed Edict", desc: "봉인된 칙령의 엄숙한 분위기", component: <SealedEdictBanner /> },
  { id: "sacred-geometry", label: "Sacred Geometry II", desc: "신성한 기하학 패턴의 변주", component: <SacredGeometryBanner /> },
  { id: "golden-spiral", label: "Golden Spiral", desc: "황금비율 나선의 수학적 아름다움", component: <GoldenSpiralBanner /> },
  { id: "parchment-scroll", label: "Parchment Scroll", desc: "고대 양피지 두루마리 — 가로형 (텍스처 적용)", component: <ParchmentScrollBanner /> },
  { id: "parchment-scroll-v", label: "Parchment Scroll V", desc: "고대 양피지 두루마리 — 세로형 칙서", component: <ParchmentScrollBanner variant="vertical" /> },
  { id: "hegemony-map", label: "Hegemony Map", desc: "패권 전쟁의 전략 지도", component: <HegemonyMapBanner /> },
];

export default function BackgroundsLabPage() {
  const params = useParams();
  const router = useRouter();
  const currentSlug = (params.slug as string) || "deep-sea";
  const activeBg = BACKGROUNDS.find((bg) => bg.id === currentSlug) || BACKGROUNDS[0];

  const cinematicBgs = BACKGROUNDS.filter((_, i) => i < BACKGROUNDS.findIndex(b => b.id === "astrolabe"));
  const bannerBgs = BACKGROUNDS.filter((_, i) => i >= BACKGROUNDS.findIndex(b => b.id === "astrolabe"));

  return (
    <section className="flex gap-6 p-6 md:p-10 border border-white/5 bg-white/[0.02] rounded-[2rem]">
      {/* Col 1: Inventory Navigation */}
      <div className="w-56 shrink-0 border border-white/10 rounded-xl p-5 bg-white/[0.02] self-start">
        <div className="space-y-3">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-text-tertiary mb-2">Cinematic Backgrounds</p>
            <ul className="space-y-1">
              {cinematicBgs.map((bg) => (
                <li
                  key={bg.id}
                  onClick={() => router.push(`/lab/backgrounds/${bg.id}`)}
                  className="flex items-center gap-2 text-xs text-text-secondary cursor-pointer hover:text-text-primary transition-colors"
                >
                  <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", currentSlug === bg.id ? "bg-accent" : "bg-white/20")} />
                  <span className={cn(currentSlug === bg.id && "text-accent font-medium")}>{bg.label}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-widest text-text-tertiary mb-2">Banner Effects</p>
            <ul className="space-y-1">
              {bannerBgs.map((bg) => (
                <li
                  key={bg.id}
                  onClick={() => router.push(`/lab/backgrounds/${bg.id}`)}
                  className="flex items-center gap-2 text-xs text-text-secondary cursor-pointer hover:text-text-primary transition-colors"
                >
                  <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", currentSlug === bg.id ? "bg-accent" : "bg-white/20")} />
                  <span className={cn(currentSlug === bg.id && "text-accent font-medium")}>{bg.label}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Col 2: Preview */}
      <div className="flex-1 flex flex-col gap-4">
        <div className="w-full border border-stone-800 rounded-lg overflow-hidden bg-bg-main relative min-h-[700px]">
          {activeBg.component}
        </div>
        <div className="text-center">
          <h3 className="text-lg font-cinzel text-accent">{activeBg.label}</h3>
          <p className="text-xs text-text-tertiary mt-1">{activeBg.desc}</p>
        </div>
      </div>
    </section>
  );
}
