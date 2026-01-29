import React from "react";
import SvgLyre from "./SvgLyre";

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

    </div>
  );
}
