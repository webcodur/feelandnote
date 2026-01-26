/*
  파일명: /components/lab/FramePreview.tsx
  기능: 재질 기반 통합 프리뷰
  책임: 텍스처 → 프레임 → 카드 → 뱃지 → 명판 순서로 재질별 스타일 프리뷰

  단일 원천: constants/materials.ts
*/

"use client";

import { Star } from "lucide-react";
import NeoCelebCard from "@/components/features/home/neo-celeb-card";
import FriendCardNameplate from "@/components/features/user/explore/FriendCardNameplate";
import { MATERIALS, MATERIAL_ORDER, type MaterialConfig } from "@/constants/materials";

// #region Mock 데이터
const createMockCeleb = (mat: MaterialConfig) => ({
  id: `mock-${mat.key}`,
  nickname: mat.auraTitleKo,
  avatar_url: "",
  background_url: "",
  profession: "PREVIEW",
  description: "",
  follower_count: 0,
  is_following: false,
  content_count: mat.aura * 10,
  influence: { rank: mat.key.toUpperCase() },
} as any);

const createMockFriend = (mat: MaterialConfig) => ({
  id: `mock-${mat.key}`,
  nickname: `${mat.auraTitleKo}`,
  avatar_url: null,
  content_count: mat.aura * 20,
});
// #endregion


// #region 뱃지 배경 스타일 헬퍼 (export for reuse)
export const getBadgeBackground = (mat: MaterialConfig) =>
  mat.textureUrl
    ? {
        background: mat.gradient.simple,
        backgroundImage: `${mat.gradient.simple}, url("${mat.textureUrl}")`,
        backgroundBlendMode: "overlay" as const,
      }
    : { backgroundImage: mat.gradient.simple };
// #endregion

// #region 뱃지 컴포넌트 (별 방식) - 9등급용
function StarBadge({ mat, size = "md" }: { mat: MaterialConfig; size?: "sm" | "md" | "lg" }) {
  const sizeStyles = {
    sm: { wrapper: "w-14 h-18", star: 6, pt: "pt-2 pb-4" },
    md: { wrapper: "w-16 h-20", star: 7, pt: "pt-3 pb-5" },
    lg: { wrapper: "w-20 h-26", star: 9, pt: "pt-4 pb-6" },
  };
  const s = sizeStyles[size];

  return (
    <div className={`relative ${s.wrapper}`} style={{ filter: mat.shadow.glow }}>
      <div
        className={`absolute inset-0 border [clip-path:polygon(0%_0%,100%_0%,100%_80%,50%_100%,0%_80%)] ${mat.key === "holographic" ? "animate-holo-gradient" : ""}`}
        style={{
          ...getBadgeBackground(mat),
          borderColor: mat.colors.border,
          boxShadow: `inset 0 2px 4px rgba(255,255,255,0.3), inset 0 -2px 4px rgba(0,0,0,0.4)`,
        }}
      />
      <div className={`relative z-10 flex flex-col items-center justify-center h-full ${s.pt}`}>
        <div className="flex flex-wrap justify-center gap-0.5" style={{ maxWidth: "95%" }}>
          {Array.from({ length: 9 }).map((_, i) => (
            <Star
              key={i}
              size={s.star}
              style={{
                color: i < mat.aura ? mat.colors.text : "rgba(0,0,0,0.2)",
                filter: i < mat.aura ? "drop-shadow(0 1px 0 rgba(255,255,255,0.3))" : "none",
              }}
              fill={i < mat.aura ? "currentColor" : "none"}
              strokeWidth={1.5}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
// #endregion

// #region 뱃지 컴포넌트 (로마자 방식)
function RomanBadge({ mat, size = "md" }: { mat: MaterialConfig; size?: "sm" | "md" | "lg" }) {
  const sizeStyles = {
    sm: { wrapper: "w-10 h-14", text: "text-sm", label: "text-[5px]", pt: "pt-1.5 pb-3" },
    md: { wrapper: "w-12 h-16", text: "text-lg", label: "text-[6px]", pt: "pt-2 pb-4" },
    lg: { wrapper: "w-16 h-22", text: "text-2xl", label: "text-[8px]", pt: "pt-3 pb-5" },
  };
  const s = sizeStyles[size];

  return (
    <div className={`relative ${s.wrapper}`} style={{ filter: mat.shadow.glow }}>
      <div
        className={`absolute inset-0 border [clip-path:polygon(0%_0%,100%_0%,100%_80%,50%_100%,0%_80%)] ${mat.key === "holographic" ? "animate-holo-gradient" : ""}`}
        style={{
          ...getBadgeBackground(mat),
          borderColor: mat.colors.border,
          boxShadow: `inset 0 2px 4px rgba(255,255,255,0.3), inset 0 -2px 4px rgba(0,0,0,0.4)`,
        }}
      />
      <div className={`relative z-10 flex flex-col items-center justify-center h-full ${s.pt}`}>
        <span className={`${s.label} tracking-[0.2em] opacity-70 mb-0.5`} style={{ color: mat.colors.text }}>
          LEVEL
        </span>
        <span
          className={`font-cinzel font-black ${s.text} leading-none`}
          style={{
            color: mat.colors.text,
            textShadow: "-1px -1px 0px rgba(255,255,255,0.3), 1px 1px 0px rgba(0,0,0,0.4)",
          }}
        >
          {mat.romanNumeral}
        </span>
      </div>
    </div>
  );
}
// #endregion

// #region 뱃지 컴포넌트 (로마자 + 등급) - export for InfluenceBadge
export function CombinedBadge({ mat, size = "md" }: { mat: MaterialConfig; size?: "sm" | "md" | "lg" }) {
  const sizeStyles = {
    sm: { wrapper: "w-12 h-16", text: "text-sm", title: "text-[6px]" },
    md: { wrapper: "w-14 h-18", text: "text-base", title: "text-[7px]" },
    lg: { wrapper: "w-18 h-24", text: "text-xl", title: "text-[9px]" },
  };
  const s = sizeStyles[size];

  return (
    <div className={`relative ${s.wrapper}`} style={{ filter: mat.shadow.glow }}>
      {/* 5각형 배경 */}
      <div
        className={`absolute inset-0 border [clip-path:polygon(0%_0%,100%_0%,100%_80%,50%_100%,0%_80%)] ${mat.key === "holographic" ? "animate-holo-gradient" : ""}`}
        style={{
          ...getBadgeBackground(mat),
          borderColor: mat.colors.border,
          boxShadow: `inset 0 2px 4px rgba(255,255,255,0.3), inset 0 -2px 4px rgba(0,0,0,0.4)`,
        }}
      />

      {/* 등급 표시 */}
      <div className="absolute inset-0 flex flex-col items-center justify-center z-10 pt-1">
        <span
          className={`font-cinzel font-black ${s.text} leading-none`}
          style={{
            color: mat.colors.text,
            textShadow: "-1px -1px 0px rgba(255,255,255,0.3), 1px 1px 0px rgba(0,0,0,0.4)",
          }}
        >
          {mat.romanNumeral}
        </span>
        <span
          className={`${s.title} tracking-[0.1em] mt-1 opacity-80`}
          style={{ color: mat.colors.text }}
        >
          {mat.auraTitle}
        </span>
      </div>
    </div>
  );
}
// #endregion

// #region 프레임 컴포넌트
function Frame({ mat, size = "md" }: { mat: MaterialConfig; size?: "sm" | "md" | "lg" }) {
  const sizeStyles = {
    sm: { frame: "p-2", inner: "w-16 h-22", bevel: 4 },
    md: { frame: "p-3", inner: "w-28 h-38", bevel: 6 },
    lg: { frame: "p-4", inner: "w-40 h-56", bevel: 8 },
  };
  const s = sizeStyles[size];

  // 텍스처가 있는 경우 카드와 동일하게 background-image로 합성
  const backgroundStyle = mat.textureUrl
    ? {
        background: mat.gradient.simple,
        backgroundImage: `${mat.gradient.simple}, url("${mat.textureUrl}")`,
        backgroundBlendMode: "overlay" as const,
        boxShadow: `${mat.shadow.base}, inset 0 1px 0 rgba(255,255,255,0.3)`,
      }
    : {
        backgroundImage: mat.gradient.simple,
        boxShadow: `${mat.shadow.base}, inset 0 1px 0 rgba(255,255,255,0.3)`,
      };

  return (
    <div className={`relative ${s.frame} ${mat.key === "holographic" ? "animate-holo-gradient" : ""}`} style={backgroundStyle}>
      {/* 실버 쉬머 */}
      {mat.key === "silver" && (
        <div
          className="absolute inset-0 pointer-events-none opacity-30"
          style={{
            backgroundImage: `
              repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(255,255,255,0.1) 4px, rgba(255,255,255,0.1) 5px),
              repeating-linear-gradient(-45deg, transparent, transparent 4px, rgba(200,220,255,0.08) 4px, rgba(200,220,255,0.08) 5px)
            `,
          }}
        />
      )}

      {/* 베벨 효과 */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          boxShadow: `inset ${s.bevel}px ${s.bevel}px ${s.bevel}px rgba(255,255,255,0.25), inset -2px -2px 4px rgba(0,0,0,0.3)`,
        }}
      />

      {/* 내용 영역 */}
      <div
        className={`relative ${s.inner} bg-neutral-900 flex items-center justify-center overflow-hidden z-10`}
        style={{ boxShadow: "inset 0 2px 8px rgba(0,0,0,0.8)" }}
      >
        <div className="text-center text-white/20">
          <div className="text-xl mb-1">🏛️</div>
          <div className="text-[8px] tracking-wider">ARTWORK</div>
        </div>
      </div>

      {/* 외곽 테두리 */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ border: `1px solid ${mat.colors.border}`, boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.1)" }}
      />
    </div>
  );
}
// #endregion

// #region 메인 프리뷰 컴포넌트
export default function FramePreview() {
  const materials = MATERIAL_ORDER.map(key => MATERIALS[key]);

  return (
    <div className="space-y-16">
      {/* 1. 재질 별 텍스처 (9등급) */}
      <section className="space-y-6">
        <div className="space-y-2">
          <h3 className="text-xl font-cinzel text-accent tracking-wider">1. Textures (9 Grades)</h3>
          <p className="text-xs text-text-tertiary">9등급 재질별 텍스처 · 광택 · 질감</p>
        </div>

        <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-9 gap-3 p-6 bg-gradient-to-b from-neutral-950 to-neutral-900 rounded-2xl border border-white/5">
          {materials.map((mat) => {
            // 홀로그래픽 특수 처리
            const isHolo = mat.key === "holographic";
            const texStyle = mat.textureUrl
              ? {
                  background: mat.gradient.simple,
                  backgroundImage: `${mat.gradient.simple}, url("${mat.textureUrl}")`,
                  backgroundBlendMode: "overlay" as const,
                  boxShadow: mat.shadow.base,
                }
              : {
                  backgroundImage: mat.gradient.simple,
                  boxShadow: mat.shadow.base,
                };

            return (
              <div key={mat.key} className="flex flex-col items-center gap-2">
                <div
                  className={`w-full h-16 rounded-lg relative overflow-hidden ${isHolo ? "animate-holo-gradient" : ""}`}
                  style={texStyle}
                >
                  {mat.key === "silver" && (
                    <div className="absolute inset-0 bg-gradient-to-br from-white/30 via-transparent to-white/10" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-br from-white/30 via-transparent to-black/20" />
                  <div className="absolute inset-0" style={{ boxShadow: "inset 4px 4px 8px rgba(255,255,255,0.2), inset -2px -2px 6px rgba(0,0,0,0.3)" }} />
                </div>
                <div className="text-center">
                  <div className="text-[10px] font-bold" style={{ color: mat.colors.primary }}>{mat.romanNumeral}</div>
                  <div className="text-[8px] text-text-tertiary">{mat.auraTitleKo}</div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 2. 프레임 */}
      <section className="space-y-6">
        <div className="space-y-2">
          <h3 className="text-xl font-cinzel text-accent tracking-wider">2. Frames</h3>
          <p className="text-xs text-text-tertiary">재질별 액자 프레임</p>
        </div>

        <div className="flex flex-wrap justify-center gap-6 p-8 bg-gradient-to-b from-neutral-950 to-neutral-900 rounded-2xl border border-white/5">
          {materials.map((mat) => (
            <div key={mat.key} className="flex flex-col items-center gap-3">
              <Frame mat={mat} size="md" />
              <div className="text-center">
                <div className="text-sm font-bold" style={{ color: mat.colors.primary }}>{mat.label}</div>
                <div className="text-[10px] text-text-tertiary">{mat.koreanLabel}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 3. 카드 */}
      <section className="space-y-6">
        <div className="space-y-2">
          <h3 className="text-xl font-cinzel text-accent tracking-wider">3. Cards</h3>
          <p className="text-xs text-text-tertiary">재질별 카드 스타일 (NeoCelebCard) - 원천 데이터</p>
        </div>

        <div className="flex flex-wrap justify-center gap-5 p-6 bg-gradient-to-b from-neutral-950 to-neutral-900 rounded-2xl border border-white/5">
          {materials.map((mat) => (
            <div key={mat.key} className="flex flex-col items-center gap-3">
              <NeoCelebCard celeb={createMockCeleb(mat)} variant={mat.cardVariant} size="small" />
              <div className="text-center">
                <div className="text-sm font-bold" style={{ color: mat.colors.primary }}>{mat.label}</div>
                <div className="text-[9px] text-text-tertiary">{mat.cardVariant}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 4. 뱃지 (9등급) */}
      <section className="space-y-6">
        <div className="space-y-2">
          <h3 className="text-xl font-cinzel text-accent tracking-wider">4. Badges (9 Grades)</h3>
          <p className="text-xs text-text-tertiary">9등급 뱃지 스타일</p>
        </div>

        <div className="space-y-8 p-6 bg-gradient-to-b from-neutral-950 to-neutral-900 rounded-2xl border border-white/5">
          {/* 별 방식 */}
          <div className="space-y-4">
            <span className="text-xs text-text-tertiary uppercase tracking-wider">★ Star Style (9 Stars Max)</span>
            <div className="flex flex-wrap justify-center items-end gap-4">
              {materials.map((mat) => (
                <div key={mat.key} className="flex flex-col items-center gap-2">
                  <StarBadge mat={mat} size="md" />
                  <span className="text-[10px] font-medium" style={{ color: mat.colors.primary }}>{mat.auraTitle}</span>
                  <span className="text-[8px] text-text-tertiary">{mat.aura}등급</span>
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-white/5" />

          {/* 로마자 방식 */}
          <div className="space-y-4">
            <span className="text-xs text-text-tertiary uppercase tracking-wider">Roman Numeral Style</span>
            <div className="flex flex-wrap justify-center items-end gap-4">
              {materials.map((mat) => (
                <div key={mat.key} className="flex flex-col items-center gap-2">
                  <RomanBadge mat={mat} size="md" />
                  <span className="text-[10px] font-medium" style={{ color: mat.colors.primary }}>{mat.auraTitleKo}</span>
                  <span className="text-[8px] text-text-tertiary">{mat.romanNumeral}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-white/5" />

          {/* 조합 방식 (로마자 + 등급명) */}
          <div className="space-y-4">
            <span className="text-xs text-text-tertiary uppercase tracking-wider">Combined Style (Roman + Title)</span>
            <div className="flex flex-wrap justify-center items-end gap-4">
              {materials.map((mat) => (
                <div key={mat.key} className="flex flex-col items-center gap-2">
                  <CombinedBadge mat={mat} size="md" />
                  <span className="text-[10px] font-medium" style={{ color: mat.colors.primary }}>{mat.auraTitleKo}</span>
                  <span className="text-[8px] text-text-tertiary">{mat.koreanLabel}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 5. 명판 */}
      <section className="space-y-6">
        <div className="space-y-2">
          <h3 className="text-xl font-cinzel text-accent tracking-wider">5. Nameplates</h3>
          <p className="text-xs text-text-tertiary">재질별 명판 스타일 (FriendCardNameplate)</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-6 bg-gradient-to-b from-neutral-950 to-neutral-900 rounded-2xl border border-white/5">
          {materials.map((mat) => (
            <div key={mat.key} className="flex flex-col gap-1">
              <FriendCardNameplate friend={createMockFriend(mat)} onClick={() => {}} materialKey={mat.key} />
              <div className="flex justify-between items-center px-1">
                <span className="text-[9px] font-medium" style={{ color: mat.colors.primary }}>{mat.label}</span>
                <span className="text-[9px] text-text-tertiary">{mat.koreanLabel}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 9등급 매핑 테이블 */}
      <section className="space-y-4 p-6 bg-accent/5 rounded-2xl border border-accent/20">
        <h3 className="text-lg font-cinzel text-accent tracking-wider">9-Grade System (단일 원천)</h3>
        <p className="text-xs text-text-tertiary">constants/materials.ts 기준</p>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 text-text-tertiary text-xs">
                <th className="text-left py-2">등급</th>
                <th className="text-left py-2">칭호</th>
                <th className="text-left py-2">재질</th>
                <th className="text-left py-2">로마자</th>
                <th className="text-left py-2">구분 포인트</th>
              </tr>
            </thead>
            <tbody className="text-text-secondary text-xs">
              {materials.map((mat) => (
                <tr key={mat.key} className="border-b border-white/5">
                  <td className="py-2 font-bold">{mat.aura}등급</td>
                  <td className="py-2" style={{ color: mat.colors.primary }}>
                    {mat.auraTitleKo} ({mat.auraTitle})
                  </td>
                  <td className="py-2">{mat.koreanLabel}</td>
                  <td className="py-2 font-cinzel">{mat.romanNumeral}</td>
                  <td className="py-2 text-[10px] text-text-tertiary">
                    {mat.key === "wood" && "유일한 유기물"}
                    {mat.key === "stone" && "무광 회색"}
                    {mat.key === "bronze" && "금속광택의 시작"}
                    {mat.key === "silver" && "밝은 금속광"}
                    {mat.key === "gold" && "은보다 위의 상징"}
                    {mat.key === "emerald" && "보석 단계의 시작"}
                    {mat.key === "crimson" && "강렬한 위엄"}
                    {mat.key === "diamond" && "범접할 수 없는 광채"}
                    {mat.key === "holographic" && "초월적 빛"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* 9등급 시스템 규칙 */}
      <section className="space-y-6 p-6 bg-white/[0.02] rounded-2xl border border-white/10">
        <h3 className="text-lg font-cinzel text-accent tracking-wider">9-Grade System Rules</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
          {/* 재질 체계 */}
          <div className="space-y-3">
            <h4 className="text-text-primary font-medium border-b border-white/10 pb-2">9등급 재질 체계</h4>
            <ul className="space-y-1 text-text-secondary text-[11px]">
              <li><span className="text-[#FF00FF] font-medium">9등급</span> - 홀로그래픽 (불멸자)</li>
              <li><span className="text-[#B9F2FF] font-medium">8등급</span> - 다이아 (사도)</li>
              <li><span className="text-[#8B0000] font-medium">7등급</span> - 크림슨 (선지자)</li>
              <li><span className="text-[#50C878] font-medium">6등급</span> - 에메랄드 (신관)</li>
              <li><span className="text-[#D4AF37] font-medium">5등급</span> - 금 (사제)</li>
              <li><span className="text-[#C0C0C0] font-medium">4등급</span> - 은 (전도사)</li>
              <li><span className="text-[#CD7F32] font-medium">3등급</span> - 동 (수사)</li>
              <li><span className="text-[#4a4a4a] font-medium">2등급</span> - 석판 (순례자)</li>
              <li><span className="text-[#5d4037] font-medium">1등급</span> - 목판 (필멸자)</li>
            </ul>
          </div>

          {/* 백분위 기준 */}
          <div className="space-y-3">
            <h4 className="text-text-primary font-medium border-b border-white/10 pb-2">백분위 기준 (수능식)</h4>
            <ul className="space-y-1 text-text-secondary text-[11px]">
              <li>9등급: 상위 4% 이내</li>
              <li>8등급: 상위 4~11%</li>
              <li>7등급: 상위 11~23%</li>
              <li>6등급: 상위 23~40%</li>
              <li>5등급: 상위 40~60%</li>
              <li>4등급: 상위 60~77%</li>
              <li>3등급: 상위 77~89%</li>
              <li>2등급: 상위 89~96%</li>
              <li>1등급: 하위 4%</li>
            </ul>
          </div>

          {/* 컴포넌트 매핑 */}
          <div className="space-y-3">
            <h4 className="text-text-primary font-medium border-b border-white/10 pb-2">컴포넌트 용도</h4>
            <ul className="space-y-1.5 text-text-secondary text-xs">
              <li><span className="text-accent">셀럽</span> → 액자 (Frame), 카드 (Card), 뱃지 (Badge)</li>
              <li><span className="text-accent">노멀</span> → 명판 (Nameplate)</li>
            </ul>
          </div>

          {/* 특수 효과 */}
          <div className="space-y-3">
            <h4 className="text-text-primary font-medium border-b border-white/10 pb-2">특수 효과</h4>
            <ul className="space-y-1.5 text-text-secondary text-xs">
              <li><span className="text-text-primary">LP 애니메이션</span> - 금속/보석 계열 (회전 광택)</li>
              <li><span className="text-text-primary">홀로그래픽</span> - 무지개 그라데이션 애니메이션</li>
              <li><span className="text-text-primary">텍스처 오버레이</span> - 석판/목판 적용</li>
              <li><span className="text-text-primary">베벨 효과</span> - 전 재질 공통 (입체감)</li>
            </ul>
          </div>

          {/* 뱃지 표기법 */}
          <div className="space-y-3">
            <h4 className="text-text-primary font-medium border-b border-white/10 pb-2">뱃지 표기법</h4>
            <ul className="space-y-1.5 text-text-secondary text-xs">
              <li><span className="text-text-primary">Star Style</span> - 별 개수로 등급 표현 (최대 9개)</li>
              <li><span className="text-text-primary">Roman Style</span> - 로마 숫자 (I~IX)</li>
              <li><span className="text-text-primary">Combined Style</span> - 로마자 + 등급 칭호</li>
            </ul>
          </div>

          {/* 단일 원천 */}
          <div className="space-y-3">
            <h4 className="text-text-primary font-medium border-b border-white/10 pb-2">단일 원천 (SSOT)</h4>
            <ul className="space-y-1.5 text-text-secondary text-xs">
              <li><span className="text-accent font-mono text-[10px]">constants/materials.ts</span></li>
              <li>9등급 재질, 칭호, 백분위 통합 관리</li>
              <li>색상, 그라데이션, 그림자, 텍스처 URL</li>
              <li>로마 숫자 매핑 (I~IX)</li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}
// #endregion
