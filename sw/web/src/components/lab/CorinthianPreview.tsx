import React from "react";
import CorinthianShield from "./CorinthianShield";
import CorinthianSpear from "./CorinthianSpear";
import CorinthianTrident from "./CorinthianTrident";
import CorinthianSword from "./CorinthianSword";
import CorinthianVase from "./CorinthianVase";
import CorinthianWreath from "./CorinthianWreath";
import MeanderDivider from "./MeanderDivider";

export default function CorinthianPreview() {
  return (
    <div className="flex flex-col items-center justify-center gap-12 py-10">
      
      {/* 1. Shield (방패) */}
      <div className="flex flex-col items-center gap-6">
        <CorinthianShield />
        <div className="text-center space-y-2">
          <h3 className="text-xl font-cinzel text-[#d4af37]">Aspis / Hoplon</h3>
          <p className="text-sm text-text-secondary opacity-80">
            고대 보병의 둥근 방패. <br/>
            견고한 방어와 전열의 결속을 상징합니다.
          </p>
        </div>
      </div>

      <div className="w-full flex flex-col gap-4 px-4">
        <MeanderDivider />
        <p className="text-center text-xs text-text-tertiary opacity-50">Meander Pattern (Divider UI)</p>
        <MeanderDivider className="h-4" />
      </div>

      {/* Weapons Row (Spear, Trident, Sword) */}
      <div className="flex flex-col md:flex-row items-start justify-center gap-8 w-full">
        
        {/* 2. Spear (창) */}
        <div className="flex flex-col items-center gap-6 flex-1">
          <CorinthianSpear />
          <div className="text-center space-y-2">
            <h3 className="text-xl font-cinzel text-[#d4af37]">Dory</h3>
            <p className="text-sm text-text-secondary opacity-80">
              팔랑크스의 주력 무기. <br/>
              꿰뚫는 통찰력과 목표를 향한 집념을 상징합니다.
            </p>
          </div>
        </div>

        {/* 3. Trident (삼지창) */}
        <div className="flex flex-col items-center gap-6 flex-1">
          <CorinthianTrident />
          <div className="text-center space-y-2">
            <h3 className="text-xl font-cinzel text-[#d4af37]">Trident</h3>
            <p className="text-sm text-text-secondary opacity-80">
              바다의 신 포세이돈의 권위. <br/>
              세 갈래의 힘과 절대적인 통치력을 상징합니다.
            </p>
          </div>
        </div>

        {/* 4. Sword (칼/검) */}
        <div className="flex flex-col items-center gap-6 flex-1">
          <CorinthianSword />
          <div className="text-center space-y-2">
            <h3 className="text-xl font-cinzel text-[#d4af37]">Xiphos</h3>
            <p className="text-sm text-text-secondary opacity-80">
              근접전을 위한 양날 단검. <br/>
              최후의 보루와 결단을 상징합니다.
            </p>
          </div>
        </div>

      </div>

      <div className="w-full h-px bg-white/10" />

      <div className="flex flex-col md:flex-row items-start justify-center gap-12 w-full">
        
        {/* 5. Pottery (도자기) */}
        <div className="flex flex-col items-center gap-6 flex-1">
          <CorinthianVase />
          <div className="text-center space-y-2">
            <h3 className="text-xl font-cinzel text-[#d4af37]">Amphora</h3>
            <p className="text-sm text-text-secondary opacity-80">
              기록과 문화를 담는 그릇. <br/>
              변치 않는 가치와 예술적 유산을 상징합니다.
            </p>
          </div>
        </div>

        {/* 6. Wreath (월계관) */}
        <div className="flex flex-col items-center gap-6 flex-1">
          <CorinthianWreath />
          <div className="text-center space-y-2">
            <h3 className="text-xl font-cinzel text-[#d4af37]">Laurel Wreath</h3>
            <p className="text-sm text-text-secondary opacity-80">
              승리와 영광의 상징. <br/>
              최고의 업적과 명예를 기립니다.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
