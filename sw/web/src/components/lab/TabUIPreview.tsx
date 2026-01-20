/*
  파일명: /components/lab/TabUIPreview.tsx
  기능: 탭 UI 통합 프리뷰
  책임: 탭 UI/UX 디자인 시스템 비교를 위한 프리뷰 제공
*/

"use client";

import { useState } from "react";
import { Flame, Sparkles, Users, User, BookOpen, Tv, Gamepad2, Music, Award } from "lucide-react";

// #region 공통 타입
interface TabItem {
  id: string;
  label: string;
  icon?: React.ComponentType<{ size?: number }>;
  count?: number;
}

type TabSize = "sm" | "md" | "lg";
// #endregion

// #region 옵션 A: 언더라인 탭
interface UnderlineTabsProps {
  items: TabItem[];
  value: string;
  onChange: (value: string) => void;
  size?: TabSize;
  showIcon?: boolean;
}

const underlineSizeStyles: Record<TabSize, { text: string; gap: string; indicator: string; py: string }> = {
  sm: { text: "text-xs", gap: "gap-4", indicator: "h-[1.5px]", py: "py-1" },
  md: { text: "text-sm", gap: "gap-6", indicator: "h-[2px]", py: "py-1.5" },
  lg: { text: "text-base", gap: "gap-8", indicator: "h-[2.5px]", py: "py-2" },
};

function UnderlineTabs({ items, value, onChange, size = "md", showIcon = false }: UnderlineTabsProps) {
  const styles = underlineSizeStyles[size];

  return (
    <div className={`relative flex ${styles.gap} border-b border-accent-dim/20`}>
      {items.map((item) => {
        const Icon = item.icon;
        const isActive = value === item.id;

        return (
          <button
            key={item.id}
            onClick={() => onChange(item.id)}
            className={`
              relative ${styles.py} px-0 font-semibold ${styles.text}
              ${isActive ? "text-accent" : "text-text-secondary hover:text-text-primary"}
            `}
          >
            <span className="flex items-center gap-1.5">
              {showIcon && Icon && <Icon size={size === "sm" ? 12 : size === "md" ? 14 : 16} />}
              {item.label}
              {item.count !== undefined && (
                <span className="text-xs opacity-60">({item.count})</span>
              )}
            </span>
            {isActive && (
              <span className={`absolute bottom-0 left-0 right-0 ${styles.indicator} bg-accent`} />
            )}
          </button>
        );
      })}
    </div>
  );
}
// #endregion

// #region 옵션 B: 칩 탭
type ChipVariant = "filled" | "outlined" | "subtle";

interface ChipTabsProps {
  items: TabItem[];
  value: string;
  onChange: (value: string) => void;
  size?: TabSize;
  variant?: ChipVariant;
  showIcon?: boolean;
}

const chipSizeStyles: Record<TabSize, { padding: string; text: string; gap: string; iconSize: number }> = {
  sm: { padding: "py-1 px-2.5", text: "text-xs", gap: "gap-1.5", iconSize: 12 },
  md: { padding: "py-1.5 px-3", text: "text-sm", gap: "gap-2", iconSize: 14 },
  lg: { padding: "py-2 px-4", text: "text-base", gap: "gap-3", iconSize: 16 },
};

const chipVariantStyles: Record<ChipVariant, { active: string; inactive: string }> = {
  filled: {
    active: "bg-accent text-bg-main shadow-md font-bold",
    inactive: "bg-bg-secondary text-text-secondary border border-accent-dim/20 hover:text-text-primary hover:border-accent hover:bg-white/5",
  },
  outlined: {
    active: "bg-accent/10 border border-accent text-accent font-bold shadow-sm shadow-accent/20",
    inactive: "bg-transparent border border-accent-dim/30 text-text-secondary hover:border-accent hover:text-text-primary",
  },
  subtle: {
    active: "bg-accent/20 text-accent font-bold",
    inactive: "bg-transparent text-text-secondary hover:bg-white/5 hover:text-text-primary",
  },
};

function ChipTabs({ items, value, onChange, size = "md", variant = "filled", showIcon = true }: ChipTabsProps) {
  const sizeStyle = chipSizeStyles[size];
  const variantStyle = chipVariantStyles[variant];

  return (
    <div className={`flex items-center ${sizeStyle.gap} flex-wrap`}>
      {items.map((item) => {
        const Icon = item.icon;
        const isActive = value === item.id;

        return (
          <button
            key={item.id}
            onClick={() => onChange(item.id)}
            className={`
              rounded-lg font-medium ${sizeStyle.padding} ${sizeStyle.text}
              ${isActive ? variantStyle.active : variantStyle.inactive}
            `}
          >
            <span className="flex items-center gap-1.5">
              {showIcon && Icon && <Icon size={sizeStyle.iconSize} />}
              {item.label}
              {item.count !== undefined && (
                <span className={`text-xs ${isActive ? "opacity-80" : "opacity-50"}`}>
                  {item.count}
                </span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}
// #endregion

// #region 옵션 C: 세그먼트 컨트롤
interface SegmentTabsProps {
  items: TabItem[];
  value: string;
  onChange: (value: string) => void;
  size?: TabSize;
}

const segmentSizeStyles: Record<TabSize, { container: string; button: string; text: string }> = {
  sm: { container: "p-0.5 gap-0.5", button: "py-1 px-2", text: "text-xs" },
  md: { container: "p-1 gap-1", button: "py-1.5 px-3", text: "text-sm" },
  lg: { container: "p-1.5 gap-1.5", button: "py-2 px-4", text: "text-base" },
};

function SegmentTabs({ items, value, onChange, size = "md" }: SegmentTabsProps) {
  const styles = segmentSizeStyles[size];

  return (
    <div className={`inline-flex bg-white/5 rounded-lg ${styles.container}`}>
      {items.map((item) => {
        const isActive = value === item.id;

        return (
          <button
            key={item.id}
            onClick={() => onChange(item.id)}
            className={`
              rounded-md font-medium ${styles.button} ${styles.text}
              ${isActive
                ? "bg-accent text-bg-main font-semibold"
                : "text-text-secondary hover:text-text-primary"
              }
            `}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
// #endregion

// #region Mock 데이터
const BASIC_TABS: TabItem[] = [
  { id: "celeb", label: "셀럽" },
  { id: "friend", label: "친구" },
  { id: "following", label: "팔로잉" },
];

const TABS_WITH_ICONS: TabItem[] = [
  { id: "popular", label: "인기", icon: Flame },
  { id: "latest", label: "최신", icon: Sparkles },
  { id: "following", label: "팔로잉", icon: Users },
  { id: "my", label: "내 것", icon: User },
];

const CATEGORY_TABS: TabItem[] = [
  { id: "book", label: "도서", icon: BookOpen, count: 42 },
  { id: "video", label: "영상", icon: Tv, count: 18 },
  { id: "game", label: "게임", icon: Gamepad2, count: 7 },
  { id: "music", label: "음악", icon: Music, count: 23 },
  { id: "cert", label: "자격증", icon: Award, count: 3 },
];

const MODE_TABS: TabItem[] = [
  { id: "review", label: "리뷰" },
  { id: "note", label: "노트" },
  { id: "creation", label: "창작" },
];

const VISIBILITY_TABS: TabItem[] = [
  { id: "private", label: "비공개" },
  { id: "followers", label: "팔로워" },
  { id: "public", label: "전체" },
];
// #endregion

// #region 메인 프리뷰 컴포넌트
export default function TabUIPreview() {
  // 각 프리뷰별 상태
  const [underlineValue, setUnderlineValue] = useState("celeb");
  const [underlineSmValue, setUnderlineSmValue] = useState("celeb");
  const [underlineLgValue, setUnderlineLgValue] = useState("celeb");
  const [underlineIconValue, setUnderlineIconValue] = useState("popular");

  const [chipFilledValue, setChipFilledValue] = useState("popular");
  const [chipOutlinedValue, setChipOutlinedValue] = useState("book");
  const [chipSubtleValue, setChipSubtleValue] = useState("popular");
  const [chipSmValue, setChipSmValue] = useState("popular");
  const [chipLgValue, setChipLgValue] = useState("popular");

  const [segmentValue, setSegmentValue] = useState("review");
  const [segmentSmValue, setSegmentSmValue] = useState("private");
  const [segmentLgValue, setSegmentLgValue] = useState("review");

  return (
    <div className="space-y-16">
      {/* 옵션 A: 언더라인 탭 */}
      <section className="space-y-8">
        <div className="space-y-2">
          <h3 className="text-xl font-cinzel text-accent tracking-wider">Option A: Underline Tabs</h3>
          <p className="text-xs text-text-tertiary">페이지 네비게이션, 섹션 전환에 적합</p>
        </div>

        <div className="grid gap-8">
          {/* 크기 비교 */}
          <div className="space-y-4 p-6 bg-white/[0.02] rounded-2xl border border-white/5">
            <span className="text-xs text-text-tertiary uppercase tracking-wider">Size Variants</span>

            <div className="space-y-6">
              <div className="space-y-2">
                <span className="text-[10px] text-accent/60 uppercase">SM</span>
                <UnderlineTabs items={BASIC_TABS} value={underlineSmValue} onChange={setUnderlineSmValue} size="sm" />
              </div>

              <div className="space-y-2">
                <span className="text-[10px] text-accent/60 uppercase">MD (Default)</span>
                <UnderlineTabs items={BASIC_TABS} value={underlineValue} onChange={setUnderlineValue} size="md" />
              </div>

              <div className="space-y-2">
                <span className="text-[10px] text-accent/60 uppercase">LG</span>
                <UnderlineTabs items={BASIC_TABS} value={underlineLgValue} onChange={setUnderlineLgValue} size="lg" />
              </div>
            </div>
          </div>

          {/* 아이콘 포함 */}
          <div className="space-y-4 p-6 bg-white/[0.02] rounded-2xl border border-white/5">
            <span className="text-xs text-text-tertiary uppercase tracking-wider">With Icons</span>
            <UnderlineTabs items={TABS_WITH_ICONS} value={underlineIconValue} onChange={setUnderlineIconValue} showIcon />
          </div>
        </div>
      </section>

      {/* 옵션 B: 칩 탭 */}
      <section className="space-y-8">
        <div className="space-y-2">
          <h3 className="text-xl font-cinzel text-accent tracking-wider">Option B: Chip Tabs</h3>
          <p className="text-xs text-text-tertiary">필터 선택, 아이콘 포함 탭, 모바일 터치 UI에 적합</p>
        </div>

        <div className="grid gap-8">
          {/* Variant 비교 */}
          <div className="space-y-4 p-6 bg-white/[0.02] rounded-2xl border border-white/5">
            <span className="text-xs text-text-tertiary uppercase tracking-wider">Variants</span>

            <div className="space-y-6">
              <div className="space-y-2">
                <span className="text-[10px] text-accent/60 uppercase">Filled (Default)</span>
                <ChipTabs items={TABS_WITH_ICONS} value={chipFilledValue} onChange={setChipFilledValue} variant="filled" />
              </div>

              <div className="space-y-2">
                <span className="text-[10px] text-accent/60 uppercase">Outlined</span>
                <ChipTabs items={CATEGORY_TABS} value={chipOutlinedValue} onChange={setChipOutlinedValue} variant="outlined" />
              </div>

              <div className="space-y-2">
                <span className="text-[10px] text-accent/60 uppercase">Subtle</span>
                <ChipTabs items={TABS_WITH_ICONS} value={chipSubtleValue} onChange={setChipSubtleValue} variant="subtle" />
              </div>
            </div>
          </div>

          {/* 크기 비교 */}
          <div className="space-y-4 p-6 bg-white/[0.02] rounded-2xl border border-white/5">
            <span className="text-xs text-text-tertiary uppercase tracking-wider">Size Variants</span>

            <div className="space-y-6">
              <div className="space-y-2">
                <span className="text-[10px] text-accent/60 uppercase">SM</span>
                <ChipTabs items={TABS_WITH_ICONS} value={chipSmValue} onChange={setChipSmValue} size="sm" />
              </div>

              <div className="space-y-2">
                <span className="text-[10px] text-accent/60 uppercase">MD (Default)</span>
                <ChipTabs items={TABS_WITH_ICONS} value={chipFilledValue} onChange={setChipFilledValue} size="md" />
              </div>

              <div className="space-y-2">
                <span className="text-[10px] text-accent/60 uppercase">LG</span>
                <ChipTabs items={TABS_WITH_ICONS} value={chipLgValue} onChange={setChipLgValue} size="lg" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 옵션 C: 세그먼트 컨트롤 */}
      <section className="space-y-8">
        <div className="space-y-2">
          <h3 className="text-xl font-cinzel text-accent tracking-wider">Option C: Segment Control</h3>
          <p className="text-xs text-text-tertiary">2~4개 옵션의 모드 전환, 뷰 모드, 공개 범위에 적합</p>
        </div>

        <div className="grid gap-8">
          {/* 크기 비교 */}
          <div className="space-y-4 p-6 bg-white/[0.02] rounded-2xl border border-white/5">
            <span className="text-xs text-text-tertiary uppercase tracking-wider">Size Variants</span>

            <div className="space-y-6">
              <div className="space-y-2">
                <span className="text-[10px] text-accent/60 uppercase">SM - 공개 범위</span>
                <SegmentTabs items={VISIBILITY_TABS} value={segmentSmValue} onChange={setSegmentSmValue} size="sm" />
              </div>

              <div className="space-y-2">
                <span className="text-[10px] text-accent/60 uppercase">MD (Default) - 탭 전환</span>
                <SegmentTabs items={MODE_TABS} value={segmentValue} onChange={setSegmentValue} size="md" />
              </div>

              <div className="space-y-2">
                <span className="text-[10px] text-accent/60 uppercase">LG</span>
                <SegmentTabs items={MODE_TABS} value={segmentLgValue} onChange={setSegmentLgValue} size="lg" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 권장 사용 가이드 */}
      <section className="space-y-4 p-6 bg-accent/5 rounded-2xl border border-accent/20">
        <h3 className="text-lg font-cinzel text-accent tracking-wider">Option D: Hybrid (권장)</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className="space-y-2">
            <span className="text-accent font-semibold">Underline 사용</span>
            <ul className="text-text-secondary text-xs space-y-1">
              <li>• 페이지 상단 네비게이션</li>
              <li>• 섹션 전환 (홈 탭)</li>
              <li>• 상세 페이지 하위 탭</li>
            </ul>
          </div>

          <div className="space-y-2">
            <span className="text-accent font-semibold">Chip 사용</span>
            <ul className="text-text-secondary text-xs space-y-1">
              <li>• 필터 선택 (카테고리, 상태)</li>
              <li>• 아이콘 포함 탭</li>
              <li>• 4개 이상 옵션</li>
            </ul>
          </div>

          <div className="space-y-2">
            <span className="text-accent font-semibold">Segment 사용</span>
            <ul className="text-text-secondary text-xs space-y-1">
              <li>• 모드 전환 (리뷰/노트/창작)</li>
              <li>• 공개 범위 선택</li>
              <li>• 2~3개 옵션의 토글</li>
            </ul>
          </div>

          <div className="space-y-2">
            <span className="text-text-tertiary font-semibold">통일 규칙</span>
            <ul className="text-text-tertiary text-xs space-y-1">
              <li>• 기본 크기: md</li>
              <li>• 활성 색상: accent</li>
              <li>• 비활성: text-secondary</li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}
// #endregion
