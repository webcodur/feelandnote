import React from "react";
import SvgLyre from "./SvgLyre";
import CorinthianShield from "./CorinthianShield";
import CorinthianSpear from "./CorinthianSpear";
import CorinthianTrident from "./CorinthianTrident";
import CorinthianSword from "./CorinthianSword";
import CorinthianVase from "./CorinthianVase";
import CorinthianStar from "./CorinthianStar";
import CorinthianColumn from "./CorinthianColumn";
import CorinthianOlive from "./CorinthianOlive";
import CorinthianPalmette from "./CorinthianPalmette";
import CorinthianTemple from "./CorinthianTemple";
import MeanderDivider from "./MeanderDivider";

export default function GreekSymbolsPreview() {
  return (
    <div className="flex flex-col items-center justify-center gap-12 py-10">

      {/* Lyre (리라/수금) */}
      <div className="flex flex-col items-center gap-6">
        <SvgLyre />
        <div className="text-center space-y-2">
          <h3 className="text-xl font-cinzel text-[#d4af37]">Lyre of Apollo</h3>
          <p className="text-sm text-text-secondary opacity-80">
            예술과 조화의 상징. <br/>
            영감의 원천이자 선율의 아름다움을 의미합니다.
          </p>
        </div>
      </div>

      <MeanderDivider variant="gold" className="max-w-md" />

      {/* Shield (방패) */}
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

      <div className="flex flex-col items-center gap-6">
        <CorinthianVase />
        <div className="text-center space-y-2">
          <h3 className="text-xl font-cinzel text-[#d4af37]">Amphora</h3>
          <p className="text-sm text-text-secondary opacity-80">
            기록과 문화를 담는 그릇. <br/>
            변치 않는 가치와 예술적 유산을 상징합니다.
          </p>
        </div>
      </div>

      <div className="w-full h-px bg-white/10" />

      {/* Star (베르기나 태양) */}
      <div className="flex flex-col items-center gap-6">
        <CorinthianStar rays={16} />
        <div className="text-center space-y-2">
          <h3 className="text-xl font-cinzel text-[#d4af37]">Vergina Sun</h3>
          <p className="text-sm text-text-secondary opacity-80">
            마케도니아 왕가의 상징. <br/>
            신성한 빛과 왕권의 영광을 나타냅니다.
          </p>
        </div>
      </div>

      <div className="w-full h-px bg-white/10" />

      {/* NEW: Columns */}
      <div className="flex flex-col items-center gap-6 w-full">
        <div className="flex flex-row items-end justify-center gap-8">
          <CorinthianColumn order="doric" />
          <CorinthianColumn order="ionic" />
          <CorinthianColumn order="corinthian" />
        </div>
        <div className="text-center space-y-2">
          <h3 className="text-xl font-cinzel text-[#d4af37]">Greek Columns</h3>
          <p className="text-sm text-text-secondary opacity-80">
            도리아식, 이오니아식, 코린트식 기둥. <br/>
            그리스 건축의 세 가지 오더(양식)를 대표합니다.
          </p>
        </div>
      </div>

      <div className="w-full h-px bg-white/10" />

      {/* NEW: Temple */}
      <div className="flex flex-col items-center gap-6">
        <CorinthianTemple columns={6} />
        <div className="text-center space-y-2">
          <h3 className="text-xl font-cinzel text-[#d4af37]">Temple Facade</h3>
          <p className="text-sm text-text-secondary opacity-80">
            그리스 신전의 정면. <br/>
            신성함과 건축적 완벽함의 상징입니다.
          </p>
        </div>
      </div>

      <div className="w-full h-px bg-white/10" />

      {/* Olive & Palmette */}
      <div className="flex flex-col md:flex-row items-start justify-center gap-12 w-full">

        {/* Olive Branch */}
        <div className="flex flex-col items-center gap-6 flex-1">
          <CorinthianOlive variant="branch" />
          <div className="text-center space-y-2">
            <h3 className="text-xl font-cinzel text-[#d4af37]">Olive Branch</h3>
            <p className="text-sm text-text-secondary opacity-80">
              올리브 가지. <br/>
              평화와 승리의 상징입니다.
            </p>
          </div>
        </div>

        {/* Olive Wreath */}
        <div className="flex flex-col items-center gap-6 flex-1">
          <CorinthianOlive variant="wreath" />
          <div className="text-center space-y-2">
            <h3 className="text-xl font-cinzel text-[#d4af37]">Olive Wreath</h3>
            <p className="text-sm text-text-secondary opacity-80">
              올리브 화관. <br/>
              올림픽 승자에게 수여되었습니다.
            </p>
          </div>
        </div>

      </div>

      <div className="w-full h-px bg-white/10" />

      {/* Palmette */}
      <div className="flex flex-col items-center gap-6">
        <CorinthianPalmette variant="single" />
        <div className="text-center space-y-2">
          <h3 className="text-xl font-cinzel text-[#d4af37]">Palmette</h3>
          <p className="text-sm text-text-secondary opacity-80">
            팔메트 문양. <br/>
            생명력과 부활을 상징하는 부채꼴 장식입니다.
          </p>
        </div>
      </div>
    </div>
  );
}
