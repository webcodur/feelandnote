"use client";

import React from "react";
import { useParams, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import SeaWavesBackground from "@/components/lab/SeaWavesBackground";
import BurningEmbersBackground from "@/components/lab/BurningEmbersBackground";
import GoldenAscensionBackground from "@/components/lab/GoldenAscensionBackground";
import StrategicHexagonBackground from "@/components/lab/StrategicHexagonBackground";
import OlympusOrbitBackground from "@/components/lab/OlympusOrbitBackground";
import ElysianFieldsBackground from "@/components/lab/ElysianFieldsBackground";
import RiverStyxBackground from "@/components/lab/RiverStyxBackground";
import OracleVisionBackground from "@/components/lab/OracleVisionBackground";

// 배경 타입 정의
type BackgroundType = "deep-sea" | "warfare" | "golden-ascension" | "strategic-hexagon" | "olympus-orbit" | "elysian-fields" | "river-styx" | "oracle-vision";

const BACKGROUNDS: { 
  id: BackgroundType; 
  label: string; 
  desc: string; 
  component: React.ReactNode 
}[] = [
  {
    id: "deep-sea",
    label: "Deep Sea",
    desc: "심해의 고요함과 파동을 표현한 인터랙티브 웨이브",
    component: <SeaWavesBackground />,
  },
  {
    id: "warfare",
    label: "Warfare",
    desc: "전장의 불씨와 긴장감을 표현한 파티클 이펙트",
    component: <BurningEmbersBackground />,
  },
  {
    id: "golden-ascension",
    label: "Golden Ascension",
    desc: "황금빛 입자의 상승과 확산을 표현한 럭셔리 이펙트",
    component: <GoldenAscensionBackground />,
  },
  {
    id: "strategic-hexagon",
    label: "Strategic Hexagon",
    desc: "전략적 영토 확장과 네트워크를 표현한 육각형 그리드",
    component: <StrategicHexagonBackground />,
  },
  {
    id: "olympus-orbit",
    label: "Olympus Orbit",
    desc: "신들의 성소, 올림푸스 산과 신전의 360도 공전",
    component: <OlympusOrbitBackground />,
  },
  {
    id: "elysian-fields",
    label: "Elysian Fields",
    desc: "바람에 흔들리는 풀밭과 반딧불이가 자아내는 평화로운 치유의 공간",
    component: <ElysianFieldsBackground />,
  },
  {
    id: "river-styx",
    label: "River Styx",
    desc: "검푸른 강물과 안개, 부유하는 영혼들이 만드는 신비롭고 엄숙한 분위기",
    component: <RiverStyxBackground />,
  },
  {
    id: "oracle-vision",
    label: "Oracle Vision",
    desc: "형체를 알 수 없는 연기와 흐릿한 잔상이 만드는 무의식의 공간",
    component: <OracleVisionBackground />,
  },
];

export default function BackgroundsLabPage() {
  const params = useParams();
  const router = useRouter();
  const currentSlug = (params.slug as string) || "deep-sea";

  // 현재 선택된 배경 찾기 (없으면 첫 번째로 fallback)
  const activeBg = BACKGROUNDS.find((bg) => bg.id === currentSlug) || BACKGROUNDS[0];

  return (
    <div className="flex flex-col gap-8 w-full max-w-5xl mx-auto px-4 py-8">
      {/* Header Section */}
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Background Effects
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2">
            서비스의 다양한 분위기를 연출하기 위한 배경 이펙트 실험실입니다.
          </p>
        </div>

        {/* Controller */}
        <div className="flex flex-wrap gap-2 p-1 bg-slate-100 dark:bg-slate-800/50 rounded-lg w-fit">
            {BACKGROUNDS.map((bg) => (
                <button
                    key={bg.id}
                    onClick={() => router.push(`/lab/backgrounds/${bg.id}`)}
                    className={cn(
                        "px-4 py-2 text-sm font-medium rounded-md transition-all duration-200",
                        currentSlug === bg.id
                            ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm"
                            : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-700/50"
                    )}
                >
                    {bg.label}
                </button>
            ))}
        </div>
      </div>

      {/* Preview Area */}
      <div className="grid gap-6">
        <div className="relative w-full aspect-video rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm bg-slate-950">
             {/* Background Component Rendering */}
             {activeBg.component}
        </div>

        {/* Description */}
        <div className="bg-slate-50 dark:bg-slate-900/50 p-6 rounded-xl border border-slate-200 dark:border-slate-800">
          <h3 className="font-semibold text-slate-900 dark:text-slate-200 mb-2">
            {activeBg.label}
          </h3>
          <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            {activeBg.desc}
          </p>
        </div>
      </div>
    </div>
  );
}
