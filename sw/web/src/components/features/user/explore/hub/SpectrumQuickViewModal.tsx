"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import Modal, { ModalBody } from "@/components/ui/Modal";
import BlurDissolve from "@/components/ui/BlurDissolve";
import { ArrowRight, Activity } from "lucide-react";
import SpectrumStatPanel from "@/components/shared/SpectrumStatPanel";
import { getSpectrumQuickViewData, type SpectrumQuickViewData } from "@/actions/home/getSpectrumQuickViewData";
import type { SpectrumExtremeEntry } from "@/actions/home/getSpectrumExtremes";
import { localizeSpectrumText } from "@/lib/spectrum/localizeText";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  entry: SpectrumExtremeEntry | null;
  isOpposing?: boolean;
  color: string;
}

export default function SpectrumQuickViewModal({ isOpen, onClose, entry, isOpposing = false, color }: Props) {
  const locale = useLocale();
  const t = useTranslations("explore.ui.spectrumQuickView");
  const [data, setData] = useState<SpectrumQuickViewData | null>(null);
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
        const res = await getSpectrumQuickViewData(celebId);
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

  // 축 방향 이름 (예: 낙관, 통솔력 등)
  const axisLabel = isEn ? entry.label.en : entry.label.ko;
  const sides = axisLabel.includes(" vs ") ? axisLabel.split(" vs ") : [axisLabel, "Opposite"];
  const currentSideLabel = isOpposing ? sides[1] : sides[0];

  // CTA에 쓸 짧은 이름 (긴 이름은 축약)
  const shortName = isEn
    ? (celeb.nickname_en ?? name).split(" ").pop() ?? name
    : celeb.nickname;

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
        style={{ ["--modal-color" as string]: color }}
      >
        {/* 상단 장식 글로우 */}
        <div
          className="absolute -top-24 -right-24 w-64 h-64 rounded-full blur-[80px] pointer-events-none opacity-20"
          style={{ backgroundColor: color }}
        />

        <ModalBody className="p-0">
          <div className="flex flex-col">
            {/* 1. 아바타 & 핵심 스탯 — 수직 중앙 레이아웃 */}
            <div className="relative px-0 pt-8 pb-5 border-b border-border/40">
              <div className="flex flex-col items-center text-center gap-3">
                {/* 아바타 */}
                <div className="relative shrink-0 w-24 h-24 sm:w-28 sm:h-28 rounded-2xl shadow-2xl overflow-hidden bg-bg-card border border-white/10 group">
                  <div className="absolute inset-0 z-20 border border-white/20 rounded-2xl opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                  {celeb.avatar_url ? (
                    // 보던 인물이 바뀌면 등장 효과가 다시 재생되도록 key로 구분한다
                    <BlurDissolve key={celeb.id} className="absolute inset-0">
                      <Image src={celeb.avatar_url} alt={name} fill sizes="120px" className="object-cover" />
                    </BlurDissolve>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-4xl font-serif">
                      {name.charAt(0)}
                    </div>
                  )}
                  {/* 상단 장식 선 */}
                  <div className="absolute top-0 inset-x-0 h-1 z-10 opacity-80" style={{ background: `linear-gradient(90deg, transparent, ${color}, transparent)` }} />
                </div>

                {/* 뱃지 */}
                <span
                  className="px-2.5 py-1 rounded-full text-[11px] sm:text-xs font-bold tracking-widest uppercase border shadow-sm"
                  style={{ backgroundColor: `${color}15`, borderColor: `${color}40`, color }}
                >
                  {currentSideLabel}
                </span>

                {/* 이름 — 전체 표시, 줄바꿈 허용 */}
                <h2 className="text-2xl sm:text-3xl font-black text-text-primary leading-tight break-keep">
                  {name}
                </h2>

                {/* 점수 */}
                <div className="flex items-baseline gap-1" style={{ color }}>
                  <span className="text-3xl sm:text-4xl font-black tabular-nums tracking-tighter leading-none">
                    {target.score}
                  </span>
                  <span className="text-xs sm:text-sm font-bold uppercase text-text-secondary">pts</span>
                </div>
              </div>
            </div>

            {/* 2. 스펙트럼 스탯 영역 */}
            {isLoading ? (
              <div className="w-full py-6 flex items-center justify-center gap-2">
                <Activity size={18} className="animate-spin opacity-50" />
                <span className="text-sm font-medium">{t("loading")}</span>
              </div>
            ) : data && (
              <>
                {data.rationale && (
                  <div className="pt-5">
                    <p className="text-xs font-semibold text-accent tracking-wider mb-1.5">
                      {t("analysis")}
                    </p>
                    <p className="text-sm leading-relaxed text-text-secondary break-keep">
                      {localizeSpectrumText(
                        isEn ? data.rationale.en : data.rationale.ko,
                        locale,
                      )}
                    </p>
                  </div>
                )}
                {data.stats && (
                  <div className="pt-4">
                    <div className="rounded-lg border border-white/10 overflow-hidden">
                      <SpectrumStatPanel stats={data.statsWithReasons ?? data.stats} />
                    </div>
                  </div>
                )}
              </>
            )}

            {/* 3. 액션 버튼 */}
            <Link
              href={`/celeb/${celeb.slug ?? celeb.id}`}
              onClick={onClose}
              className="group flex items-center justify-between mt-4 mb-6 p-4 rounded-xl border transition-all duration-300 hover:-translate-y-0.5"
              style={{
                backgroundColor: `${color}10`,
                borderColor: `${color}40`,
                boxShadow: `0 4px 20px ${color}10`
              }}
            >
              <div className="flex flex-col items-start gap-1">
                <span className="text-base sm:text-lg font-bold text-white group-hover:text-white transition-colors break-keep">
                  {t("visitLibrary", { name: shortName })}
                </span>
                <span className="text-xs text-text-secondary">
                  {t("exploreJourney")}
                </span>
              </div>
              <div
                className="shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-transform duration-300 group-hover:scale-110 group-hover:translate-x-1"
                style={{ backgroundColor: color, color: "#fff" }}
              >
                <ArrowRight size={20} strokeWidth={2.5} />
              </div>
            </Link>

          </div>
        </ModalBody>
      </div>
    </Modal>
  );
}
