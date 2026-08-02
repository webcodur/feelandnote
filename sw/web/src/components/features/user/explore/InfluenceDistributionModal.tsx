/*
  파일명: /components/features/user/explore/InfluenceDistributionModal.tsx
  기능: 셀럽 영향력 분포 인포그래픽 모달
  책임: 오라별 분포 시각화 (리스트) + 순위 테이블 + 상세 보기
*/
"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "@/i18n/navigation";
import { BarChart3, List, ChevronLeft, ChevronRight } from "lucide-react";
import { Modal, ModalBody } from "@/components/ui";
import CelebImage from "@/components/ui/CelebImage";
import { getInfluenceDistribution } from "@/actions/home";
import type { InfluenceDistribution, RankedCeleb } from "@/actions/home";
import {
  type Aura,
  AURA_ORDER_DESC,
  getMaterialFromAura,
} from "@/constants/materials";
import { getCelebProfileUrl } from "@/lib/url";
import { useTranslations } from "next-intl";

interface InfluenceDistributionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type ViewMode = "chart" | "table";

// #region Types
type TranslationFn = (key: string, values?: Record<string, string | number | Date>) => string;
// #endregion

// #region Components
function AuraListItem({
  aura,
  count,
  total,
  celebs,
  onClick,
  t,
}: {
  aura: Aura;
  count: number;
  total: number;
  celebs: { id: string; nickname: string; avatar_url: string | null }[];
  onClick: () => void;
  t: TranslationFn;
}) {
  const mat = getMaterialFromAura(aura);
  const percentage = total > 0 ? ((count / total) * 100).toFixed(1) : "0";
  const numPercent = total > 0 ? (count / total) * 100 : 0;
  
  // 1~5등급도 뱃지에서는 원래의 가독성 규칙 준수
  const isDarkBadge = aura <= 5;
  const badgeTextColor = isDarkBadge ? "#000000" : "#ffffff";

  return (
    <button 
      onClick={onClick} 
      className="w-full flex items-center p-3 gap-3 border-b border-border/40 hover:bg-accent/5 transition-colors text-left group last:border-0"
    >
      {/* Badge */}
      <div 
        className="w-10 h-10 shrink-0 rounded-lg flex items-center justify-center font-cinzel font-black text-lg shadow-sm border border-black/5"
        style={{ 
          background: mat.gradient.simple, 
          color: badgeTextColor,
          borderColor: mat.colors.border
        }}
      >
        {mat.romanNumeral}
      </div>
      
      {/* Text Info + Bar */}
      <div className="flex-1 min-w-0 flex flex-col justify-center">
         <div className="flex items-center gap-2 mb-1">
            <span className="font-bold text-text-primary text-sm">{t(`auraTitle.${aura}`)}</span>
            <span className="text-xs bg-bg-secondary px-1.5 py-0.5 rounded text-[10px] whitespace-nowrap">{t(`scoreRanges.${aura}`)}</span>
         </div>
         {/* Distribution Bar */}
         <div className="w-full h-1 bg-bg-secondary rounded-full overflow-hidden">
            <div 
              className="h-full rounded-full transition-all duration-500" 
              style={{ 
                width: `${Math.max(numPercent, 0)}%`, 
                background: mat.colors.primary 
              }} 
            />
         </div>
      </div>

      {/* Avatars (복원됨) */}
      {celebs.length > 0 && (
        <div className="flex -space-x-2 shrink-0 px-2 hidden sm:flex">
          {celebs.slice(0, 4).map((celeb) => (
            <div
              key={celeb.id}
              className="relative w-7 h-7 rounded-full overflow-hidden border-2 border-surface bg-bg-card shadow-sm"
              style={{ borderColor: mat.colors.border }}
              title={celeb.nickname}
            >
              {celeb.avatar_url ? (
                <CelebImage
                  src={celeb.avatar_url}
                  alt={celeb.nickname}
                  shape="circle"
                  sizes="28px"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-[10px] font-bold" style={{ color: mat.colors.text }}>
                  {celeb.nickname.charAt(0)}
                </div>
              )}
            </div>
          ))}
          {celebs.length > 4 && (
            <div className="w-7 h-7 rounded-full bg-bg-secondary flex items-center justify-center text-[9px] font-bold text-text-secondary border-2 border-surface z-10">
              +{celebs.length - 4}
            </div>
          )}
        </div>
      )}

      {/* Stats */}
      <div className="text-right shrink-0 min-w-[50px] flex flex-col items-end">
         <div className="font-bold text-text-primary text-sm">{t("countUnit", { count })}</div>
         <div className="text-[10px]">{percentage}%</div>
      </div>

      <ChevronRight className="text-text-placeholder group-hover:text-accent transition-colors shrink-0" size={16} />
    </button>
  );
}

function RankingTable({ ranking, onCelebClick, t }: { ranking: RankedCeleb[]; onCelebClick: (celeb: { id: string; slug: string | null }) => void; t: TranslationFn }) {
  if (ranking.length === 0) {
     return <div className="h-full flex items-center justify-center text-sm">{t("empty.noAuraCelebs")}</div>;
  }

  return (
    <div className="h-full overflow-y-auto scrollbar-thin">
      <div className="flex flex-col">
          {ranking.map((celeb, index) => {
            const mat = getMaterialFromAura(celeb.aura);
            const isDarkBadge = celeb.aura <= 5;
            const badgeTextColor = isDarkBadge ? "#000000" : "#ffffff";
            
            return (
              <div
                key={celeb.id}
                onClick={() => onCelebClick({ id: celeb.id, slug: celeb.slug })}
                className="flex items-center gap-3 p-3 border-b border-border/30 hover:bg-accent/5 cursor-pointer transition-colors last:border-0"
              >
                <div className="w-6 text-center font-medium text-xs">{celeb.ranking}</div>
                
                <div className="relative w-9 h-9 rounded-full overflow-hidden bg-bg-card flex-shrink-0 border border-border/50">
                  {celeb.avatar_url ? (
                    <CelebImage
                      src={celeb.avatar_url}
                      alt={celeb.nickname}
                      shape="circle"
                      sizes="36px"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs font-bold text-text-secondary">
                      {celeb.nickname.charAt(0)}
                    </div>
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm text-text-primary truncate">{celeb.nickname}</p>
                  {celeb.profession && <p className="text-[11px] truncate">{celeb.profession}</p>}
                </div>
                
                <div className="text-right">
                  <div className="font-bold text-sm text-text-primary">{t("scoreUnit", { score: celeb.total_score })}</div>
                  <div className="flex items-center justify-end gap-1 mt-0.5">
                    <span 
                      className="inline-block px-1.5 py-0.5 rounded text-[9px] font-bold border border-black/5"
                      style={{
                          background: mat.gradient.simple,
                          color: badgeTextColor,
                      }}
                    >
                      {t(`auraTitle.${celeb.aura}`)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="flex flex-col gap-2 h-full justify-center">
      {Array.from({ length: 9 }).map((_, i) => (
        <div key={i} className="h-14 w-full bg-bg-card animate-pulse rounded-lg border border-border/30" />
      ))}
    </div>
  );
}

function ViewToggle({ mode, onChange, t }: { mode: ViewMode; onChange: (mode: ViewMode) => void; t: TranslationFn }) {
  return (
    <div className="flex justify-center gap-1 p-1 bg-bg-card border border-border rounded-lg mb-4 h-10 shrink-0">
      <button
        onClick={() => onChange("chart")}
        className={`flex-1 flex items-center justify-center gap-1.5 rounded text-xs font-bold transition-all ${
          mode === "chart" ? "bg-accent text-white shadow-sm" : "text-text-secondary hover:bg-bg-secondary hover:text-text-primary"
        }`}
      >
        <BarChart3 size={14} />
        <span>{t("gradeDistribution")}</span>
      </button>
      <button
        onClick={() => onChange("table")}
        className={`flex-1 flex items-center justify-center gap-1.5 rounded text-xs font-bold transition-all ${
          mode === "table" ? "bg-accent text-white shadow-sm" : "text-text-secondary hover:bg-bg-secondary hover:text-text-primary"
        }`}
      >
        <List size={14} />
        <span>{t("fullRanking")}</span>
      </button>
    </div>
  );
}
// #endregion

export default function InfluenceDistributionModal({ isOpen, onClose }: InfluenceDistributionModalProps) {
  const router = useRouter();
  const t = useTranslations("explore.ui");
  const [distribution, setDistribution] = useState<InfluenceDistribution | null>(null);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("chart");

  // 상세 보기 상태 (클릭된 오라)
  const [selectedAura, setSelectedAura] = useState<Aura | null>(null);

  useEffect(() => {
    if (isOpen && !distribution) {
      setLoading(true);
      getInfluenceDistribution()
        .then(setDistribution)
        .finally(() => setLoading(false));
    }
  }, [isOpen, distribution]);

  // 등급 선택 시 상세 뷰로 이동
  const handleLevelClick = (aura: Aura) => {
    setSelectedAura(aura);
  };

  // 상세 뷰에서 뒤로가기
  const handleBack = () => {
    setSelectedAura(null);
  };

  const handleCelebClick = (celeb: { id: string; slug: string | null }) => {
    onClose();
    router.push(getCelebProfileUrl({ ...celeb, profile_type: 'CELEB' }));
  };

  // 필터링된 랭킹 리스트 (선택된 오라가 있으면 해당 오라만)
  const filteredRanking = useMemo(() => {
      if (!distribution) return [];
      if (selectedAura) {
          return distribution.ranking.filter(c => c.aura === selectedAura);
      }
      return distribution.ranking;
  }, [distribution, selectedAura]);

  // 선택된 오라의 메타데이터
  const selectedAuraMat = selectedAura ? getMaterialFromAura(selectedAura) : null;

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t("influenceDistribution")} size="md">
      <ModalBody>
        <div className="h-[550px] flex flex-col">
            {/* 헤더 및 네비게이션 */}
            {selectedAura ? (
                // 상세 뷰 헤더
                <div className="flex items-center gap-3 mb-4 pb-4 border-b border-border/40 shrink-0">
                    <button 
                        onClick={handleBack} 
                        className="p-1.5 rounded-full hover:bg-bg-secondary transition-colors -ml-1 text-text-secondary"
                    >
                        <ChevronLeft size={20} />
                    </button>
                    <div className="flex-1">
                        <div className="flex items-center gap-2">
                            <span 
                                className="w-6 h-6 rounded flex items-center justify-center text-[10px] font-black font-cinzel border border-black/5"
                                style={{ 
                                    background: selectedAuraMat?.gradient.simple,
                                    color: (selectedAura || 0) <= 5 ? 'black' : 'white',
                                    borderColor: selectedAuraMat?.colors.border
                                }}
                            >
                                {selectedAuraMat?.romanNumeral}
                            </span>
                            <h3 className="text-base font-bold text-text-primary">
                                {selectedAura && t(`auraTitle.${selectedAura}`)}
                            </h3>
                        </div>
                        <div className="text-xs mt-1">
                            {t("scoreRange")}: {t(`scoreRanges.${selectedAura}`)}
                        </div>
                    </div>
                </div>
            ) : (
                null
            )}

            {/* 뷰 토글 (메인 화면에서만 노출) */}
            {!selectedAura && <ViewToggle mode={viewMode} onChange={setViewMode} t={t} />}

            {/* 컨텐츠 영역 */}
            <div className="flex-1 overflow-hidden relative">
                {loading ? (
                    <LoadingSkeleton />
                ) : distribution ? (
                    <div className="h-full overflow-y-auto scrollbar-thin pr-1">
                        {/* 리스트 뷰 (분포) */}
                        {viewMode === "chart" && !selectedAura && (
                            <div className="flex flex-col bg-surface rounded-xl border border-border/40 overflow-hidden">
                                {/* 높은 등급(9)부터 렌더링 */}
                                {AURA_ORDER_DESC.map((aura) => {
                                    const topCelebsForAura = distribution.topCelebs.find((t) => t.aura === aura);
                                    return (
                                        <AuraListItem
                                            key={aura}
                                            aura={aura}
                                            count={distribution.counts[aura]}
                                            total={distribution.total}
                                            celebs={topCelebsForAura?.celebs ?? []}
                                            onClick={() => handleLevelClick(aura)}
                                            t={t}
                                        />
                                    );
                                })}
                            </div>
                        )}

                        {/* 테이블 뷰 (전체 랭킹) OR 상세 뷰 (특정 오라 랭킹) */}
                        {(viewMode === "table" || selectedAura) && (
                            <RankingTable ranking={filteredRanking} onCelebClick={handleCelebClick} t={t} />
                        )}
                    </div>
                ) : null}
            </div>
        </div>
      </ModalBody>
    </Modal>
  );
}
