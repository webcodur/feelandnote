/*
  오라 시스템 - 단일 원천 (Single Source of Truth)

  9단계 오라 (1이 최하, 9가 최상) - 내부 코드용, UI 노출 X

  | 오라 | 칭호 | 재질 | 컬러 | 구분 포인트 |
  |------|------|------|------|-------------|
  | 1 | 필멸자 | 목판 | Brown | 유일한 유기물, 가장 낮은 가치 |
  | 2 | 순례자 | 석판 | Dark Grey | 무겁고 탁한 회색 (무광) |
  | 3 | 수사 | 동 | Bronze/Orange | 금속광택의 시작, 따뜻한 구리색 |
  | 4 | 전도사 | 은 | Silver/White | 밝고 매끄러운 금속광 |
  | 5 | 사제 | 금 | Gold/Yellow | 누구나 아는 '은보다 위'의 상징 |
  | 6 | 신관 | 에메랄드 | Green | 금속을 벗어난 '보석' 단계의 시작 |
  | 7 | 선지자 | 크림슨레드 | Deep Red | 보석 중 가장 강렬하고 위엄 있는 색 |
  | 8 | 사도 | 다이아 | Cyan/Ice | 투명하고 차가운, 범접할 수 없는 광채 |
  | 9 | 불멸자 | 홀로그래픽 | Rainbow | 모든 색을 품은 초월적 빛의 효과 |

  컴포넌트 용도:
  - 셀럽: 액자(Frame), 카드(Card), 뱃지(Badge)
  - 노멀: 명판(Nameplate)
*/

import type { CardVariant } from "@/components/features/home/neo-celeb-card/types";

// #region 타입 정의
// 9개 재질
export type MaterialKey =
  | "wood"        // 1등급 - 목판
  | "stone"       // 2등급 - 석판
  | "bronze"      // 3등급 - 동
  | "silver"      // 4등급 - 은
  | "gold"        // 5등급 - 금
  | "emerald"     // 6등급 - 에메랄드
  | "crimson"     // 7등급 - 크림슨레드
  | "diamond"     // 8등급 - 다이아
  | "holographic" // 9등급 - 홀로그래픽
  | "obsidian"    // 통일 프레임용 - 흑요석
;

// 오라 (1~9, 높을수록 상위) - 내부 코드용, UI 노출 X
export type Aura = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

// 오라 칭호 (직업)
type AuraTitle =
  | "MORTAL"      // 필멸자 (1)
  | "PILGRIM"     // 순례자 (2)
  | "MONK"        // 수사 (3)
  | "EVANGELIST"  // 전도사 (4)
  | "PRIEST"      // 사제 (5)
  | "ARCHON"      // 신관 (6)
  | "PROPHET"     // 선지자 (7)
  | "APOSTLE"     // 사도 (8)
  | "IMMORTAL"    // 불멸자 (9)
;

// 하위 호환용 (deprecated)
type Level = 1 | 2 | 3 | 4 | 5;
export type CelebLevel = "COSMIC" | "TITAN" | "GIGANTIC" | "SAGE" | "HERO";
export type NormalLevel = "PROPHET" | "PRIEST" | "PILGRIM" | "NOVICE" | "MORTAL";

export interface MaterialConfig {
  key: MaterialKey;
  label: string;
  koreanLabel: string;

  // 오라 시스템
  aura: Aura;
  auraTitle: AuraTitle;
  auraTitleKo: string;
  romanNumeral: string;

  // 색상 (카드 기준)
  colors: {
    primary: string;
    secondary: string;
    light: string;
    dark: string;
    border: string;
    text: string;
    textOnSurface: string;
  };

  // 그라데이션 (카드 surface 기준)
  gradient: {
    surface: string;
    border: string;
    simple: string;
  };

  // 그림자
  shadow: {
    base: string;
    hover: string;
    glow: string;
  };

  // 텍스처 URL (있는 경우)
  textureUrl?: string;

  // LP 효과 (금속 계열만 해당)
  lp?: {
    gradient: string;
    duration?: string;
    blendMode?: string;
  };

  // 카드 variant 매핑
  cardVariant: CardVariant;

  // 하위 호환용 (deprecated)
  level: Level;
  celebLevel: CelebLevel;
  normalLevel: NormalLevel;
}
// #endregion
