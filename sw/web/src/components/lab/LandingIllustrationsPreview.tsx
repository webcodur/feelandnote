import React from "react";
import SvgLyre from "./SvgLyre";
import CorinthianStar from "./CorinthianStar";
import CorinthianWreath from "./CorinthianWreath";
import CorinthianOlive from "./CorinthianOlive";
import MeanderDivider from "./MeanderDivider";

export default function LandingIllustrationsPreview() {
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

      {/* Stars Row */}
      <div className="flex flex-col items-center gap-6">
        <div className="flex flex-row items-center gap-8">
          <CorinthianStar rays={8} className="w-24 h-24" />
          <CorinthianStar rays={12} className="w-32 h-32" />
          <CorinthianStar rays={16} className="w-24 h-24" />
        </div>
        <div className="text-center space-y-2">
          <h3 className="text-xl font-cinzel text-[#d4af37]">Helios Stars</h3>
          <p className="text-sm text-text-secondary opacity-80">
            태양신 헬리오스의 광휘. <br/>
            8광, 12광, 16광으로 다양한 영광을 표현합니다.
          </p>
        </div>
      </div>

      <MeanderDivider variant="silver" className="max-w-md" />

      {/* Wreaths Row */}
      <div className="flex flex-col md:flex-row items-center justify-center gap-12 w-full">
        <div className="flex flex-col items-center gap-4">
          <CorinthianWreath className="w-36 h-36" />
          <p className="text-sm text-text-tertiary">Laurel (월계수)</p>
        </div>
        <div className="flex flex-col items-center gap-4">
          <CorinthianOlive variant="wreath" className="w-36 h-36" />
          <p className="text-sm text-text-tertiary">Olive (올리브)</p>
        </div>
      </div>
      <div className="text-center space-y-2">
        <h3 className="text-xl font-cinzel text-[#d4af37]">Victory Wreaths</h3>
        <p className="text-sm text-text-secondary opacity-80">
          승리자의 화관. <br/>
          월계관은 델피, 올리브관은 올림피아 제전에서 수여되었습니다.
        </p>
      </div>

      <MeanderDivider variant="bronze" className="max-w-md" />

      {/* Decorative Dividers Demo */}
      <div className="flex flex-col items-center gap-6 w-full max-w-lg">
        <div className="text-center space-y-2 mb-4">
          <h3 className="text-xl font-cinzel text-[#d4af37]">Meander Dividers</h3>
          <p className="text-sm text-text-secondary opacity-80">
            구분선으로 활용할 수 있는 미앤더 패턴. <br/>
            Gold, Silver, Bronze 세 가지 변형을 제공합니다.
          </p>
        </div>
        <div className="w-full space-y-4">
          <MeanderDivider variant="gold" className="h-8" />
          <MeanderDivider variant="silver" className="h-8" />
          <MeanderDivider variant="bronze" className="h-8" />
        </div>
      </div>

    </div>
  );
}
