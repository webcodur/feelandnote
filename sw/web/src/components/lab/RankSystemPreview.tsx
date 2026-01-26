/*
  파일명: /components/lab/RankSystemPreview.tsx
  기능: S/A/B/C/D 등급 시스템 프리뷰
  책임: 기존 컴포넌트를 활용한 등급별 스타일 프리뷰

  최종안: S/A/B/C/D 등급 체계 + 풍부한 색상 스타일 조합
  - 뱃지: 직관적인 S/A/B/C/D 표시
  - 카드: 등급별 차별화된 색상 테마
  - Flavor: COSMIC, TITAN 등 명칭은 보조적 사용
*/

"use client";

import NeoCelebCard from "@/components/features/home/neo-celeb-card";
import InfluenceBadge from "@/components/ui/InfluenceBadge";
import FriendCardNameplate from "@/components/features/user/explore/FriendCardNameplate";
import type { CardVariant } from "@/components/features/home/neo-celeb-card/types";
import type { Aura } from "@/constants/materials";

// #region 등급 정의
// 셀럽 등급 (S/A/B/C/D)
export type CelebGrade = "S" | "A" | "B" | "C" | "D";

// S/A/B/C/D → Aura (1-9) 매핑
const CELEB_GRADE_TO_AURA: Record<CelebGrade, Aura> = {
  S: 9,
  A: 7,
  B: 5,
  C: 3,
  D: 1,
};
// 일반 유저용 rank (명판 스타일링)
export type NormalRank = "PROPHET" | "PRIEST" | "PILGRIM" | "NOVICE" | "MORTAL";

interface CelebRankConfig {
  grade: CelebGrade;
  flavorName: string;         // 보조 명칭 (COSMIC, TITAN 등)
  flavorKorean: string;
  description: string;
  cardVariant: CardVariant;
  scoreRange: string;
}

interface NormalRankConfig {
  key: NormalRank;
  label: string;
  koreanLabel: string;
  description: string;
  levelRange: string;
}

// 셀럽 등급 설정 (S/A/B/C/D)
const CELEB_RANKS: CelebRankConfig[] = [
  {
    grade: "S",
    flavorName: "COSMIC",
    flavorKorean: "코스믹",
    description: "홀로그래픽 보라 + 네온 블루/핑크 우주 네뷸라",
    cardVariant: "holographic",
    scoreRange: "80+",
  },
  {
    grade: "A",
    flavorName: "TITAN",
    flavorKorean: "티탄",
    description: "크림슨 레드 + 골드 오렌지 불바다 글로우",
    cardVariant: "crimson",
    scoreRange: "60+",
  },
  {
    grade: "B",
    flavorName: "GIGAS",
    flavorKorean: "거신",
    description: "브라이트 골드 + 화이트 오라 금박",
    cardVariant: "gold",
    scoreRange: "50+",
  },
  {
    grade: "C",
    flavorName: "SAGE",
    flavorKorean: "현자",
    description: "실버 메탈 + 화이트 신성 글로우",
    cardVariant: "silver",
    scoreRange: "40+",
  },
  {
    grade: "D",
    flavorName: "LEGEND",
    flavorKorean: "영웅",
    description: "브론즈 + 앰버 예언서",
    cardVariant: "bronze",
    scoreRange: "0+",
  },
];

// 일반 유저 등급 설정 (명판용)
const NORMAL_RANKS: NormalRankConfig[] = [
  {
    key: "PROPHET",
    label: "PROPHET",
    koreanLabel: "예언자급",
    description: "브론즈 + 앰버 예언서",
    levelRange: "Lv.5",
  },
  {
    key: "PRIEST",
    label: "PRIEST",
    koreanLabel: "성직자급",
    description: "실버 메탈 + 화이트 신성 글로우",
    levelRange: "Lv.4",
  },
  {
    key: "PILGRIM",
    label: "PILGRIM",
    koreanLabel: "순례자급",
    description: "스톤 그레이 + 베이지 석판",
    levelRange: "Lv.3",
  },
  {
    key: "NOVICE",
    label: "NOVICE",
    koreanLabel: "초심자급",
    description: "우드 브라운 + 오크 나무",
    levelRange: "Lv.2",
  },
  {
    key: "MORTAL",
    label: "MORTAL",
    koreanLabel: "필멸자급",
    description: "어스 브라운 + 올리브 흙 뿌리",
    levelRange: "Lv.1",
  },
];

// Mock 셀럽 데이터
const createMockCeleb = (grade: CelebGrade, flavorName: string) => ({
  id: `mock-${grade}`,
  nickname: `${grade} - ${flavorName}`,
  avatar_url: "",
  background_url: "",
  profession: "PREVIEW",
  description: "",
  follower_count: 0,
  is_following: false,
  content_count: 42,
  influence: { rank: grade },
} as any);

// Mock 친구 데이터
const createMockFriend = (label: string, koreanLabel: string) => ({
  id: `mock-${label}`,
  nickname: koreanLabel,
  avatar_url: null,
  content_count: Math.floor(Math.random() * 100),
});
// #endregion

// #region 메인 프리뷰 컴포넌트
export default function RankSystemPreview() {
  return (
    <div className="space-y-16">
      {/* 셀럽 등급 (S/A/B/C/D) */}
      <section className="space-y-8">
        <div className="space-y-2">
          <h3 className="text-xl font-cinzel text-accent tracking-wider">Celeb Grades (S/A/B/C/D)</h3>
          <p className="text-xs text-text-tertiary">영향력 점수 기반 5단계 등급</p>
        </div>

        {/* 뱃지 */}
        <div className="space-y-4 p-6 bg-white/[0.02] rounded-2xl border border-white/5">
          <span className="text-xs text-text-tertiary uppercase tracking-wider">Badges (InfluenceBadge)</span>
          <div className="flex flex-wrap items-end justify-center gap-6">
            {CELEB_RANKS.map((config) => (
              <div key={config.grade} className="flex flex-col items-center gap-2">
                <InfluenceBadge
                  aura={CELEB_GRADE_TO_AURA[config.grade]}
                  size="lg"
                />
                <span className="text-lg font-bold text-accent">{config.grade}</span>
                <span className="text-[10px] text-text-secondary">{config.flavorName}</span>
                <span className="text-[9px] text-text-tertiary">{config.flavorKorean}</span>
                <span className="text-[8px] text-accent/60">{config.scoreRange}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 카드 */}
        <div className="space-y-4 p-6 bg-white/[0.02] rounded-2xl border border-white/5">
          <span className="text-xs text-text-tertiary uppercase tracking-wider">Cards (NeoCelebCard)</span>
          <div className="flex flex-wrap justify-center gap-6">
            {CELEB_RANKS.map((config) => (
              <div key={config.grade} className="flex flex-col items-center gap-2">
                <NeoCelebCard
                  celeb={createMockCeleb(config.grade, config.flavorName)}
                  variant={config.cardVariant}
                  size="small"
                />
                <div className="text-center mt-2">
                  <div className="text-lg font-bold text-accent">{config.grade}</div>
                  <div className="text-[10px] text-text-secondary">{config.flavorName} ({config.flavorKorean})</div>
                  <div className="text-[9px] text-text-tertiary max-w-[160px]">{config.description}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 일반 유저 등급 (명판) */}
      <section className="space-y-8">
        <div className="space-y-2">
          <h3 className="text-xl font-cinzel text-accent tracking-wider">Normal User Ranks</h3>
          <p className="text-xs text-text-tertiary">일반 유저 활동 레벨 기반 5단계</p>
        </div>

        {/* 명판 카드 (FriendCardNameplate) */}
        <div className="space-y-4 p-6 bg-white/[0.02] rounded-2xl border border-white/5">
          <span className="text-xs text-text-tertiary uppercase tracking-wider">Nameplates (FriendCardNameplate)</span>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {NORMAL_RANKS.map((config) => (
              <div key={config.key} className="flex flex-col gap-1">
                <FriendCardNameplate
                  friend={createMockFriend(config.label, config.koreanLabel)}
                  onClick={() => {}}
                  level={config.key}
                />
                <div className="flex justify-between items-center px-1">
                  <span className="text-[9px] text-accent">{config.label} ({config.levelRange})</span>
                  <span className="text-[9px] text-text-tertiary">{config.description}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 등급 체계 요약 */}
      <section className="space-y-4 p-6 bg-accent/5 rounded-2xl border border-accent/20">
        <h3 className="text-lg font-cinzel text-accent tracking-wider">Grade System Summary</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
          {/* 셀럽 등급 테이블 */}
          <div className="space-y-3">
            <span className="text-accent font-semibold">셀럽 등급 (영향력 점수)</span>
            <table className="w-full text-xs">
              <thead>
                <tr className="text-text-tertiary border-b border-white/10">
                  <th className="text-left py-1">등급</th>
                  <th className="text-left py-1">점수</th>
                  <th className="text-left py-1">카드</th>
                  <th className="text-left py-1">Flavor</th>
                </tr>
              </thead>
              <tbody className="text-text-secondary">
                {CELEB_RANKS.map((c) => (
                  <tr key={c.grade} className="border-b border-white/5">
                    <td className="py-1.5 font-bold text-accent">{c.grade}</td>
                    <td className="py-1.5">{c.scoreRange}</td>
                    <td className="py-1.5">{c.cardVariant}</td>
                    <td className="py-1.5 text-text-tertiary">{c.flavorName}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 일반 유저 등급 테이블 */}
          <div className="space-y-3">
            <span className="text-accent font-semibold">일반 등급 (활동 기반)</span>
            <table className="w-full text-xs">
              <thead>
                <tr className="text-text-tertiary border-b border-white/10">
                  <th className="text-left py-1">등급</th>
                  <th className="text-left py-1">레벨</th>
                  <th className="text-left py-1">한국어</th>
                </tr>
              </thead>
              <tbody className="text-text-secondary">
                {NORMAL_RANKS.map((c) => (
                  <tr key={c.key} className="border-b border-white/5">
                    <td className="py-1.5 font-bold text-accent">{c.label}</td>
                    <td className="py-1.5">{c.levelRange}</td>
                    <td className="py-1.5 text-text-tertiary">{c.koreanLabel}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 핵심 원칙 */}
        <div className="mt-6 pt-4 border-t border-accent/20">
          <h4 className="text-sm font-semibold text-accent mb-3">핵심 원칙</h4>
          <ul className="text-xs text-text-secondary space-y-2">
            <li className="flex items-start gap-2">
              <span className="text-green-400">✓</span>
              <span><strong>뱃지:</strong> S/A/B/C/D 직관적 표시 (누구나 이해)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-400">✓</span>
              <span><strong>카드:</strong> 등급별 차별화된 색상/효과 (holographic, crimson, gold, silver, bronze)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-400">✓</span>
              <span><strong>Flavor:</strong> COSMIC, TITAN 등 명칭은 프로필/툴팁에서 보조적 사용</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-400">✓</span>
              <span><strong>일반 유저:</strong> 별도 뱃지 없이 명판 스타일로만 등급 표현</span>
            </li>
          </ul>
        </div>
      </section>
    </div>
  );
}
// #endregion
