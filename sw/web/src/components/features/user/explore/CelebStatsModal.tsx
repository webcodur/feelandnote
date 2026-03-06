/*
  파일명: /components/features/user/explore/CelebStatsModal.tsx
  기능: 셀럽 통계 모달
  책임: 직군/국적/콘텐츠 타입/성별 분포를 시각적으로 표시
*/
"use client";

import { useState, useMemo } from "react";
import { BarChart3, Users, Globe, BookOpen, User2 } from "lucide-react";
import { Modal, ModalBody } from "@/components/ui";
import { CELEB_PROFESSIONS } from "@/constants/celebProfessions";
import type { ProfessionCounts, NationalityCounts, ContentTypeCounts, GenderCounts } from "@/actions/home";
import { useTranslations } from "next-intl";

// #region Types
interface CelebStatsModalProps {
  isOpen: boolean;
  onClose: () => void;
  professionCounts: ProfessionCounts;
  nationalityCounts: NationalityCounts;
  contentTypeCounts: ContentTypeCounts;
  genderCounts: GenderCounts;
}

type TabId = "profession" | "nationality" | "content" | "gender";

interface Tab {
  id: TabId;
  icon: React.ElementType;
}
// #endregion

// #region Constants
const TAB_KEYS: Tab[] = [
  { id: "profession", icon: Users },
  { id: "nationality", icon: Globe },
  { id: "content", icon: BookOpen },
  { id: "gender", icon: User2 },
];

const TAB_LABEL_KEYS: Record<TabId, string> = {
  profession: "tabProfession",
  nationality: "tabNationality",
  content: "tabContent",
  gender: "tabGender",
};
// #endregion

// #region Components
function StatBar({
  label,
  count,
  total,
  color = "var(--color-accent)",
  countLabel,
}: {
  label: string;
  count: number;
  total: number;
  color?: string;
  countLabel: string;
}) {
  const percentage = total > 0 ? (count / total) * 100 : 0;
  const displayPercent = percentage.toFixed(1);

  return (
    <div className="flex items-center gap-3 py-2">
      <div className="w-24 sm:w-28 text-sm text-text-primary font-medium truncate shrink-0">
        {label}
      </div>
      <div className="flex-1 h-5 bg-bg-secondary rounded-full overflow-hidden relative">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${Math.max(percentage, 0)}%`,
            background: color,
          }}
        />
        {/* 퍼센트 표시 (바 안쪽/바깥쪽) */}
        <span 
          className={`absolute top-1/2 -translate-y-1/2 text-[10px] font-bold ${
            percentage > 15 ? "left-2 text-white" : "left-full ml-2 text-text-secondary"
          }`}
        >
          {displayPercent}%
        </span>
      </div>
      <div className="w-12 text-right text-xs text-text-tertiary shrink-0">
        {countLabel}
      </div>
    </div>
  );
}

function TabButton({
  tab,
  label,
  isActive,
  onClick,
}: {
  tab: Tab;
  label: string;
  isActive: boolean;
  onClick: () => void;
}) {
  const Icon = tab.icon;
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-sm font-bold tracking-wide transition-all ${
        isActive
          ? "bg-accent text-black shadow-md"
          : "text-text-primary/70 hover:bg-white/5 hover:text-text-primary"
      }`}
    >
      <Icon size={15} />
      <span>{label}</span>
    </button>
  );
}

function ProfessionStats({
  professionCounts,
  t,
  tp,
}: {
  professionCounts: ProfessionCounts;
  t: (key: string, values?: Record<string, string | number | Date>) => string;
  tp: (key: string) => string;
}) {
  const total = professionCounts.all || 0;

  const sortedProfessions = useMemo(() => {
    return CELEB_PROFESSIONS
      .map(p => ({
        value: p.value,
        count: professionCounts[p.value] || 0,
      }))
      .sort((a, b) => b.count - a.count);
  }, [professionCounts]);

  return (
    <div className="space-y-1">
      {sortedProfessions.map((p) => (
        <StatBar
          key={p.value}
          label={tp(p.value)}
          count={p.count}
          total={total}
          countLabel={t("countUnit", { count: p.count })}
        />
      ))}
    </div>
  );
}

function NationalityStats({
  nationalityCounts,
  t,
}: {
  nationalityCounts: NationalityCounts;
  t: (key: string, values?: Record<string, string | number | Date>) => string;
}) {
  const total = nationalityCounts.find(n => n.value === 'all')?.count || 0;
  const topNationalities = nationalityCounts
    .filter(n => n.value !== 'all' && n.value !== 'none')
    .slice(0, 10);

  return (
    <div className="space-y-1">
      {topNationalities.map((n) => (
        <StatBar
          key={n.value}
          label={n.label}
          count={n.count}
          total={total}
          color="#3b82f6"
          countLabel={t("countUnit", { count: n.count })}
        />
      ))}
      {topNationalities.length === 0 && (
        <div className="text-center py-8 text-text-tertiary text-sm">
          {t("empty.noNationality")}
        </div>
      )}
    </div>
  );
}

function ContentTypeStats({
  contentTypeCounts,
  t,
  tc,
}: {
  contentTypeCounts: ContentTypeCounts;
  t: (key: string, values?: Record<string, string | number | Date>) => string;
  tc: (key: string) => string;
}) {
  const total = contentTypeCounts.all || 0;
  const types = ["BOOK", "VIDEO", "GAME", "MUSIC", "CERTIFICATE"];

  const CONTENT_COLORS: Record<string, string> = {
    BOOK: "#10b981",
    VIDEO: "#3b82f6",
    GAME: "#8b5cf6",
    MUSIC: "#f59e0b",
    CERTIFICATE: "#ec4899",
  };

  // 카운트 내림차순 정렬
  const sortedTypes = useMemo(() => {
    return types
      .map(type => ({
        value: type,
        label: tc(type.toLowerCase()),
        count: contentTypeCounts[type] || 0,
        color: CONTENT_COLORS[type] || "#666",
      }))
      .sort((a, b) => b.count - a.count);
  }, [contentTypeCounts]);

  // CSS conic-gradient 생성
  const gradientSegments = useMemo(() => {
    if (total === 0) return "transparent";
    let acc = 0;
    const segments: string[] = [];
    sortedTypes.forEach((item) => {
      const percent = (item.count / total) * 100;
      segments.push(`${item.color} ${acc}% ${acc + percent}%`);
      acc += percent;
    });
    return `conic-gradient(${segments.join(", ")})`;
  }, [sortedTypes, total]);

  return (
    <div className="flex flex-col items-center gap-6">
      {/* 원형 그래프 */}
      <div className="relative w-48 h-48">
        <div
          className="w-full h-full rounded-full shadow-lg"
          style={{ background: gradientSegments }}
        />
        {/* 중앙 구멍 (도넛 형태) */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-24 h-24 rounded-full bg-surface flex flex-col items-center justify-center border border-border/30">
            <span className="text-2xl font-black text-text-primary">{total}</span>
            <span className="text-[10px] text-text-tertiary font-medium">{t("totalContent")}</span>
          </div>
        </div>
      </div>

      {/* 범례 */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 w-full">
        {sortedTypes.map((item) => {
          const percent = total > 0 ? ((item.count / total) * 100).toFixed(1) : "0";
          return (
            <div
              key={item.value}
              className="flex items-center gap-2 p-2 rounded-lg bg-bg-card/50 border border-border/20"
            >
              <div
                className="w-3 h-3 rounded-full shrink-0"
                style={{ background: item.color }}
              />
              <div className="flex-1 min-w-0">
                <div className="text-xs font-bold text-text-primary truncate">{item.label}</div>
                <div className="text-[10px] text-text-tertiary">{t("countUnit", { count: item.count })} ({percent}%)</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function GenderStats({
  genderCounts,
  t,
}: {
  genderCounts: GenderCounts;
  t: (key: string, values?: Record<string, string | number | Date>) => string;
}) {
  const total = genderCounts.find(g => g.value === 'all')?.count || 0;
  const male = genderCounts.find(g => g.value === 'male');
  const female = genderCounts.find(g => g.value === 'female');

  const maleCount = male?.count || 0;
  const femaleCount = female?.count || 0;
  const malePercent = total > 0 ? (maleCount / total * 100).toFixed(1) : "0";
  const femalePercent = total > 0 ? (femaleCount / total * 100).toFixed(1) : "0";

  // CSS conic-gradient 생성
  const gradientSegments = useMemo(() => {
    if (total === 0) return "transparent";
    const maleP = (maleCount / total) * 100;
    const femaleP = (femaleCount / total) * 100;
    return `conic-gradient(#3b82f6 0% ${maleP}%, #ec4899 ${maleP}% ${maleP + femaleP}%)`;
  }, [maleCount, femaleCount, total]);

  return (
    <div className="flex flex-col items-center gap-6">
      {/* 원형 그래프 */}
      <div className="relative w-48 h-48">
        <div
          className="w-full h-full rounded-full shadow-lg"
          style={{ background: gradientSegments }}
        />
        {/* 중앙 구멍 (도넛 형태) */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-24 h-24 rounded-full bg-surface flex flex-col items-center justify-center border border-border/30">
            <span className="text-2xl font-black text-text-primary">{total}</span>
            <span className="text-[10px] text-text-tertiary font-medium">{t("totalPeople")}</span>
          </div>
        </div>
      </div>

      {/* 범례 카드 */}
      <div className="grid grid-cols-2 gap-4 w-full">
        <div className="p-4 rounded-xl bg-gradient-to-br from-blue-500/10 to-blue-600/5 border border-blue-500/20">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-3 h-3 rounded-full bg-blue-500" />
            <span className="text-sm font-bold text-text-primary">{t("male")}</span>
          </div>
          <div className="text-2xl font-black text-blue-400">{maleCount}</div>
          <div className="text-xs text-text-tertiary mt-1">{malePercent}%</div>
        </div>
        <div className="p-4 rounded-xl bg-gradient-to-br from-pink-500/10 to-pink-600/5 border border-pink-500/20">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-3 h-3 rounded-full bg-pink-500" />
            <span className="text-sm font-bold text-text-primary">{t("female")}</span>
          </div>
          <div className="text-2xl font-black text-pink-400">{femaleCount}</div>
          <div className="text-xs text-text-tertiary mt-1">{femalePercent}%</div>
        </div>
      </div>
    </div>
  );
}
// #endregion

// #region Main Component
export default function CelebStatsModal({
  isOpen,
  onClose,
  professionCounts,
  nationalityCounts,
  contentTypeCounts,
  genderCounts,
}: CelebStatsModalProps) {
  const [activeTab, setActiveTab] = useState<TabId>("profession");
  const t = useTranslations("explore.ui");
  const tp = useTranslations("profession");
  const tc = useTranslations("content.category");

  if (!isOpen) return null;

  const TAB_DESC_KEYS: Record<TabId, string> = {
    profession: "professionDist",
    nationality: "nationalityDist",
    content: "contentTypeDist",
    gender: "genderDist",
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t("celebStats")} icon={BarChart3} size="md">
      <ModalBody>
        <div className="h-[500px] flex flex-col">
          {/* 탭 네비게이션 */}
          <div className="flex gap-1 p-1 bg-bg-card border border-border rounded-lg mb-4 shrink-0">
            {TAB_KEYS.map((tab) => (
              <TabButton
                key={tab.id}
                tab={tab}
                label={t(TAB_LABEL_KEYS[tab.id])}
                isActive={activeTab === tab.id}
                onClick={() => setActiveTab(tab.id)}
              />
            ))}
          </div>

          {/* 총계 표시 */}
          <div className="flex items-center justify-between px-1 mb-3 shrink-0">
            <span className="text-xs text-text-tertiary">
              {t(TAB_DESC_KEYS[activeTab])}
            </span>
            <span className="text-xs font-bold text-accent">
              {t("totalCount", { count: professionCounts.all || 0 })}
            </span>
          </div>

          {/* 컨텐츠 영역 */}
          <div className="flex-1 overflow-y-auto scrollbar-thin pr-1">
            {activeTab === "profession" && (
              <ProfessionStats professionCounts={professionCounts} t={t} tp={tp} />
            )}
            {activeTab === "nationality" && (
              <NationalityStats nationalityCounts={nationalityCounts} t={t} />
            )}
            {activeTab === "content" && (
              <ContentTypeStats contentTypeCounts={contentTypeCounts} t={t} tc={tc} />
            )}
            {activeTab === "gender" && (
              <GenderStats genderCounts={genderCounts} t={t} />
            )}
          </div>
        </div>
      </ModalBody>
    </Modal>
  );
}
// #endregion
