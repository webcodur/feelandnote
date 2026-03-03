"use client";

import React, { useMemo, useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { Menu } from "lucide-react";

// Background components
import SeaWavesBackground from "@/components/lab/SeaWavesBackground";
import BurningEmbersBackground from "@/components/lab/BurningEmbersBackground";
import GoldenAscensionBackground from "@/components/lab/GoldenAscensionBackground";
import OlympusOrbitBackground from "@/components/lab/OlympusOrbitBackground";
import OracleVisionBackground from "@/components/lab/OracleVisionBackground";
import ParticleWarpBackground from "@/components/lab/ParticleWarpBackground";
import InfiniteCorridorBackground from "@/components/lab/InfiniteCorridorBackground";
import GoldenDawnBackground from "@/components/lab/GoldenDawnBackground";
import ImageBackground from "@/components/lab/ImageBackground";
import WindsOfLiangshanBackground from "@/components/lab/WindsOfLiangshanBackground";
import WindsOfLiangshanGeminiBackground from "@/components/lab/WindsOfLiangshanGeminiBackground";

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

const CINEMATIC_BACKGROUNDS: BgItem[] = [
  { id: "deep-sea", label: "Deep Sea", desc: "심해의 고요함과 파동을 표현한 인터랙티브 웨이브", component: <SeaWavesBackground /> },
  { id: "warfare", label: "Warfare", desc: "전장의 불씨와 긴장감을 표현한 파티클 이펙트", component: <BurningEmbersBackground /> },
  { id: "golden-ascension", label: "Golden Ascension", desc: "황금빛 입자의 상승과 확산을 표현한 럭셔리 이펙트", component: <GoldenAscensionBackground /> },
  { id: "olympus-orbit", label: "Olympus Orbit", desc: "신들의 성소, 올림푸스 산과 신전의 360도 공전", component: <OlympusOrbitBackground /> },
  { id: "oracle-vision", label: "Oracle Vision", desc: "형체를 알 수 없는 연기와 흐릿한 잔상이 만드는 무의식의 공간", component: <OracleVisionBackground /> },
  { id: "particle-warp", label: "Particle Warp", desc: "여명의 끝을 향해 황금빛 입자 속을 날아가는 무한의 비행", component: <ParticleWarpBackground /> },
  { id: "infinite-corridor", label: "Geometric Infinite Corridor", desc: "기하학적 무한 회랑 — 끊임없이 다가오는 정밀한 3D 와이어프레임 미궁", component: <InfiniteCorridorBackground /> },
  { id: "golden-dawn", label: "Golden Dawn", desc: "황금빛 여명의 바다를 거니는 시네마틱 패닝", component: <GoldenDawnBackground /> },
  { id: "winds-of-liangshan", label: "Winds of Liangshan", desc: "두루마리 산수화처럼 흘러가는 양산박의 거친 갈대밭과 초원", component: <WindsOfLiangshanBackground /> },
  { id: "winds-of-liangshan-gemini", label: "Winds of Liangshan 2 (Gemini)", desc: "붉은 달빛 아래 일렁이는 갈대밭 — 송나라 강호 황혼 모드", component: <WindsOfLiangshanGeminiBackground /> },
];

const BANNER_BACKGROUNDS: BgItem[] = [
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

/** 파일명 → 사람이 읽을 수 있는 라벨 변환 */
function fileToLabel(filename: string): string {
  const name = filename.replace(/\.\w+$/, ""); // 확장자 제거
  return name
    .replace(/[-_]/g, " ")
    .replace(/(\d+)/g, " $1") // 숫자 앞 공백
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase()); // 단어 첫 글자 대문자
}

function fileToId(filename: string): string {
  return "img-" + filename.replace(/\.\w+$/, "").replace(/[_\s]/g, "-").toLowerCase();
}

interface Props {
  slug: string;
  imageFiles: string[];
}

export default function BackgroundsLabClient({ slug, imageFiles }: Props) {
  const router = useRouter();
  const currentSlug = slug || "deep-sea";
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const imageBgs = useMemo<BgItem[]>(
    () =>
      imageFiles.map((f) => ({
        id: fileToId(f),
        label: fileToLabel(f),
        desc: `이미지 배경 — ${f}`,
        component: <ImageBackground src={`/images/backgrounds/${f}`} />,
      })),
    [imageFiles],
  );

  const allBgs = useMemo(
    () => [...CINEMATIC_BACKGROUNDS, ...imageBgs, ...BANNER_BACKGROUNDS],
    [imageBgs],
  );

  const activeBg = allBgs.find((bg) => bg.id === currentSlug) || allBgs[0];

  const NavSection = ({ title, items }: { title: string; items: BgItem[] }) => (
    <div>
      <p className="text-[10px] uppercase tracking-widest text-text-tertiary mb-2">{title}</p>
      <ul className="space-y-1">
        {items.map((bg) => (
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
  );

  return (
    <section className="flex gap-6 p-6 md:p-10 border border-white/5 bg-white/[0.02] rounded-[2rem]">
      {/* Col 1: Inventory Navigation */}
      <div 
        className={cn(
          "shrink-0 border border-white/10 rounded-xl bg-white/[0.02] self-start flex flex-col",
          isSidebarOpen ? "w-56 p-5" : "w-[52px] p-3 items-center"
        )}
      >
        <div className={cn("flex w-full mb-4", isSidebarOpen ? "justify-end" : "justify-center")}>
          <button 
            type="button" 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)} 
            className="text-text-secondary hover:text-text-primary p-1 bg-white/5 hover:bg-white/10 rounded-md"
            aria-label="Toggle Navigation"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>

        {isSidebarOpen && (
          <div className="space-y-3">
            <NavSection title="Cinematic Backgrounds" items={CINEMATIC_BACKGROUNDS} />
            {imageBgs.length > 0 && <NavSection title="Image Backgrounds" items={imageBgs} />}
            <NavSection title="Banner Effects" items={BANNER_BACKGROUNDS} />
          </div>
        )}
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
