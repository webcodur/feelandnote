/*
  파일명: /components/features/user/profile/StatsModal.tsx
  기능: 통계 모달
  책임: 열람실에서 통계 데이터를 모달로 표시한다.
*/

"use client";

import { useState, useCallback } from "react";
import { BarChart3, X, Loader2 } from "lucide-react";
import { getDetailedStats, type DetailedStats } from "@/actions/user";
import ProfileStatsSection from "@/app/(main)/[userId]/ProfileStatsSection";
import Button from "@/components/ui/Button";
import { Z_INDEX } from "@/constants/zIndex";

export default function StatsModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [stats, setStats] = useState<DetailedStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleOpen = useCallback(async () => {
    setIsOpen(true);
    if (!stats) {
      setIsLoading(true);
      const data = await getDetailedStats();
      setStats(data);
      setIsLoading(false);
    }
  }, [stats]);

  return (
    <>
      <Button
        unstyled
        onClick={handleOpen}
        className="p-2 rounded-lg text-text-secondary hover:text-accent hover:bg-white/5"
        title="통계"
      >
        <BarChart3 size={20} />
      </Button>

      {isOpen && (
        <div className="fixed inset-0 flex items-center justify-center p-4" style={{ zIndex: Z_INDEX.modal }}>
          {/* Overlay */}
          <div className="absolute inset-0 bg-black/70 animate-modal-overlay" onClick={() => setIsOpen(false)} />

          {/* Content */}
          <div className="relative w-full max-w-4xl max-h-[85vh] overflow-y-auto rounded-2xl bg-bg-main border border-accent-dim/20 shadow-2xl animate-modal-content">
            <div className="sticky top-0 flex justify-end p-3 bg-bg-main/90 backdrop-blur-sm border-b border-accent-dim/10" style={{ zIndex: 1 }}>
              <Button unstyled onClick={() => setIsOpen(false)} className="p-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-white/5">
                <X size={20} />
              </Button>
            </div>
            <div className="p-4 sm:p-6">
              {isLoading ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 size={32} className="animate-spin text-accent" />
                </div>
              ) : stats ? (
                <ProfileStatsSection stats={stats} />
              ) : null}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
