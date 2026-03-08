"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import Modal, { ModalBody } from "@/components/ui/Modal";
import { ArrowRight, Activity } from "lucide-react";
import PersonaStatPanel from "@/components/shared/PersonaStatPanel";
import { getPersonaQuickViewData, type PersonaQuickViewData } from "@/actions/home/getPersonaQuickViewData";
import type { PersonaExtremeEntry } from "@/actions/home/getPersonaExtremes";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  entry: PersonaExtremeEntry | null;
  isOpposing?: boolean;
  color: string;
}

export default function PersonaQuickViewModal({ isOpen, onClose, entry, isOpposing = false, color }: Props) {
  const locale = useLocale();
  const [data, setData] = useState<PersonaQuickViewData | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!isOpen || !entry) {
      setData(null);
      return;
    }

    const celebId = isOpposing && entry.opposing ? entry.opposing.celeb.id : entry.celeb.id;
    let isMounted = true;

    async function fetchData() {
      setIsLoading(true);
      try {
        const res = await getPersonaQuickViewData(celebId);
        if (isMounted) setData(res);
      } catch (err) {
        console.error("Failed to fetch quick view data", err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    fetchData();

    return () => {
      isMounted = false;
    };
  }, [isOpen, entry, isOpposing]);

  if (!entry) return null;

  const isEn = locale === "en";
  const target = isOpposing && entry.opposing ? entry.opposing : entry;
  const celeb = target.celeb;
  const name = isEn && celeb.nickname_en ? celeb.nickname_en : celeb.nickname;
  const reasonText = isEn ? target.reason.en : target.reason.ko;
  
  // 축 방향 이름 (예: 낙관, 통솔력 등)
  const axisLabel = isEn ? entry.label.en : entry.label.ko;
  const sides = axisLabel.includes(" vs ") ? axisLabel.split(" vs ") : [axisLabel, "Opposite"];
  const currentSideLabel = isOpposing ? sides[1] : sides[0];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="md"
      showCloseButton={true}
      zIndex={100}
    >
      <div 
        className="relative overflow-hidden selection:bg-white/20"
        style={{ "--modal-color": color } as any}
      >
        {/* 상단 장식 글로우 */}
        <div 
          className="absolute -top-24 -right-24 w-64 h-64 rounded-full blur-[80px] pointer-events-none opacity-20"
          style={{ backgroundColor: color }}
        />
        
        <ModalBody className="p-0">
          <div className="flex flex-col">
            {/* 1. 아바타 & 핵심 스탯 영역 */}
            <div className="relative p-6 pb-5 border-b border-border/40">
              <div className="flex gap-5 items-start">
                {/* 아바타 */}
                <div className="relative shrink-0 w-24 h-24 sm:w-28 sm:h-28 rounded-2xl shadow-2xl overflow-hidden bg-bg-card border border-white/10 group">
                  <div className="absolute inset-0 z-20 border border-white/20 rounded-2xl opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                  {celeb.avatar_url ? (
                    <Image src={celeb.avatar_url} alt={name} fill sizes="120px" className="object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-4xl font-serif text-text-tertiary">
                      {name.charAt(0)}
                    </div>
                  )}
                  {/* 상단 장식 선 */}
                  <div className="absolute top-0 inset-x-0 h-1 z-10 opacity-80" style={{ background: `linear-gradient(90deg, transparent, ${color}, transparent)` }} />
                </div>

                {/* 인물 정보 & 뱃지 */}
                <div className="flex flex-col flex-1 min-w-0 pt-1">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span 
                      className="px-2.5 py-1 rounded-full text-[11px] sm:text-xs font-bold tracking-widest uppercase border shadow-sm"
                      style={{ backgroundColor: `${color}15`, borderColor: `${color}40`, color }}
                    >
                      {currentSideLabel}
                    </span>
                    <span className="text-[11px] sm:text-xs font-bold text-text-secondary uppercase px-2 py-1 rounded-full bg-white/5 border border-white/5">
                      Top {target.percentile}%
                    </span>
                  </div>
                  
                  <h2 className="text-2xl sm:text-3xl font-black text-text-primary mb-1 truncate">
                    {name}
                  </h2>
                  <div className="flex items-baseline gap-1" style={{ color }}>
                    <span className="text-3xl sm:text-4xl font-black tabular-nums tracking-tighter leading-none">
                      {target.score}
                    </span>
                    <span className="text-xs sm:text-sm font-bold uppercase opacity-60">pts</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 2. 페르소나 스탯 영역 */}
            <div className="relative p-6 pt-5 pb-4 bg-black/40 border-b border-border/40 min-h-[120px]">
              {isLoading ? (
                <div className="w-full h-8 flex items-center justify-center gap-2 text-text-tertiary">
                  <Activity size={18} className="animate-spin opacity-50" />
                  <span className="text-sm font-medium">{isEn ? "Loading insights..." : "페르소나 분석 중..."}</span>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  {/* 왜 이 축의 극단에 서 있는지에 대한 사유 */}
                  <div className="relative z-10 pl-4 border-l-2" style={{ borderColor: `${color}60` }}>
                    <p className="text-sm sm:text-[15px] font-medium text-text-secondary leading-relaxed tracking-tight break-keep">
                      {reasonText}
                    </p>
                  </div>
                  
                  {/* 전체 페르소나 스탯 패널 */}
                  {data?.stats && (
                    <div className="rounded-lg border border-white/10 bg-black/20 overflow-hidden shadow-inner">
                      <PersonaStatPanel stats={data.stats} />
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 4. 액션 버튼 */}
            <div className="p-6 pt-5 bg-gradient-to-t from-black/80 to-transparent">
              <Link
                href={`/celeb/${celeb.slug ?? celeb.id}`}
                onClick={onClose}
                className="group flex items-center justify-between w-full p-4 rounded-xl border transition-all duration-300 hover:-translate-y-0.5"
                style={{ 
                  backgroundColor: `${color}10`,
                  borderColor: `${color}40`,
                  boxShadow: `0 4px 20px ${color}10`
                }}
              >
                <div className="flex flex-col items-start gap-1">
                  <span className="text-lg font-bold text-white group-hover:text-white transition-colors">
                    {isEn ? "Visit Library" : "인물의 서재 방문하기"}
                  </span>
                  <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: `${color}cc` }}>
                    {isEn ? "Explore Philosophy & Tastes" : "감상 철학과 취향 탐색"}
                  </span>
                </div>
                <div 
                  className="w-10 h-10 rounded-full flex items-center justify-center transition-transform duration-300 group-hover:scale-110 group-hover:translate-x-1"
                  style={{ backgroundColor: color, color: "#fff" }}
                >
                  <ArrowRight size={20} strokeWidth={2.5} />
                </div>
              </Link>
            </div>

          </div>
        </ModalBody>
      </div>
    </Modal>
  );
}
