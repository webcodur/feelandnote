import React from "react";
import CorinthianShield from "./CorinthianShield";
import CorinthianSpear from "./CorinthianSpear";
import CorinthianTrident from "./CorinthianTrident";
import CorinthianSword from "./CorinthianSword";
import CorinthianVase from "./CorinthianVase";
import CorinthianWreath from "./CorinthianWreath";
import CorinthianHelmet from "./CorinthianHelmet";
import CorinthianStar from "./CorinthianStar";
import CorinthianColumn from "./CorinthianColumn";
import CorinthianMedallion from "./CorinthianMedallion";
import CorinthianScroll from "./CorinthianScroll";
import CorinthianOlive from "./CorinthianOlive";
import CorinthianPalmette from "./CorinthianPalmette";
import CorinthianKey from "./CorinthianKey";
import CorinthianTemple from "./CorinthianTemple";
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

      <div className="w-full h-px bg-white/10" />

      {/* NEW: Helmet & Star */}
      <div className="flex flex-col md:flex-row items-start justify-center gap-12 w-full">

        {/* 7. Helmet (투구) */}
        <div className="flex flex-col items-center gap-6 flex-1">
          <CorinthianHelmet />
          <div className="text-center space-y-2">
            <h3 className="text-xl font-cinzel text-[#d4af37]">Corinthian Helmet</h3>
            <p className="text-sm text-text-secondary opacity-80">
              코린트식 투구. <br/>
              스파르타 전사의 용맹과 전투 정신을 상징합니다.
            </p>
          </div>
        </div>

        {/* 8. Star (베르기나 태양) */}
        <div className="flex flex-col items-center gap-6 flex-1">
          <CorinthianStar rays={16} />
          <div className="text-center space-y-2">
            <h3 className="text-xl font-cinzel text-[#d4af37]">Vergina Sun</h3>
            <p className="text-sm text-text-secondary opacity-80">
              마케도니아 왕가의 상징. <br/>
              신성한 빛과 왕권의 영광을 나타냅니다.
            </p>
          </div>
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

      {/* NEW: Medallion & Scroll */}
      <div className="flex flex-col md:flex-row items-start justify-center gap-12 w-full">

        {/* Medallion */}
        <div className="flex flex-col items-center gap-6 flex-1">
          <CorinthianMedallion size="lg" />
          <div className="text-center space-y-2">
            <h3 className="text-xl font-cinzel text-[#d4af37]">Medallion</h3>
            <p className="text-sm text-text-secondary opacity-80">
              원형 메달리온 장식. <br/>
              프로필 테두리, 뱃지 등에 활용됩니다.
            </p>
          </div>
        </div>

        {/* Scroll */}
        <div className="flex flex-col items-center gap-6 flex-1">
          <CorinthianScroll open />
          <div className="text-center space-y-2">
            <h3 className="text-xl font-cinzel text-[#d4af37]">Scroll</h3>
            <p className="text-sm text-text-secondary opacity-80">
              양피지 두루마리. <br/>
              지식, 기록, 철학을 상징합니다.
            </p>
          </div>
        </div>

      </div>

      <div className="w-full h-px bg-white/10" />

      {/* NEW: Olive & Palmette */}
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

      {/* NEW: Palmette */}
      <div className="flex flex-col md:flex-row items-start justify-center gap-12 w-full">

        {/* Single Palmette */}
        <div className="flex flex-col items-center gap-6 flex-1">
          <CorinthianPalmette variant="single" />
          <div className="text-center space-y-2">
            <h3 className="text-xl font-cinzel text-[#d4af37]">Palmette</h3>
            <p className="text-sm text-text-secondary opacity-80">
              팔메트 문양. <br/>
              생명력과 부활을 상징하는 부채꼴 장식입니다.
            </p>
          </div>
        </div>

        {/* Anthemion */}
        <div className="flex flex-col items-center gap-6 flex-1">
          <CorinthianPalmette variant="anthemion" />
          <div className="text-center space-y-2">
            <h3 className="text-xl font-cinzel text-[#d4af37]">Anthemion</h3>
            <p className="text-sm text-text-secondary opacity-80">
              안테미온 패턴. <br/>
              팔메트와 볼류트의 반복 문양입니다.
            </p>
          </div>
        </div>

      </div>

      <div className="w-full h-px bg-white/10" />

      {/* NEW: Greek Key */}
      <div className="flex flex-col items-center gap-8 w-full">
        <div className="flex flex-row items-center justify-center gap-8 flex-wrap">
          <div className="flex flex-col items-center gap-2">
            <CorinthianKey variant="corner" />
            <p className="text-xs text-text-tertiary">Corner</p>
          </div>
          <div className="flex flex-col items-center gap-2">
            <CorinthianKey variant="frame" />
            <p className="text-xs text-text-tertiary">Frame</p>
          </div>
        </div>
        <div className="flex flex-col items-center gap-2 w-full max-w-md">
          <CorinthianKey variant="border" />
          <p className="text-xs text-text-tertiary">Border</p>
        </div>
        <div className="text-center space-y-2">
          <h3 className="text-xl font-cinzel text-[#d4af37]">Greek Key / Meander</h3>
          <p className="text-sm text-text-secondary opacity-80">
            그리스 열쇠 문양. <br/>
            영원함과 무한함을 상징하는 기하학적 패턴입니다.
          </p>
        </div>
      </div>

    </div>
  );
}
