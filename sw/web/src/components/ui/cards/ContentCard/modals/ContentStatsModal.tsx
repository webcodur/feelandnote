/*
  인원 구성 모달
  - 필앤노트 전체에서 이 콘텐츠를 감상한 셀럽 목록 표시
*/
"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { Users, Crown, User } from "lucide-react";
import Modal, { ModalBody, ModalFooter } from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import { getCelebProfessionLabel } from "@/constants/celebProfessions";
import { getCelebsForContent } from "@/actions/scriptures";
import { getCelebForModal } from "@/actions/celebs";
import CelebDetailModal from "@/components/features/home/celeb-card-drafts/CelebDetailModal";
import type { CelebProfile } from "@/types/home";

interface CelebInfo {
  id: string;
  nickname: string;
  avatar_url: string | null;
  profession: string | null;
}

interface ContentStatsModalProps {
  isOpen: boolean;
  onClose: () => void;
  contentId: string;
  contentTitle: string;
  contentThumbnail?: string | null;
  celebCount: number;
}

export default function ContentStatsModal({
  isOpen,
  onClose,
  contentId,
  contentTitle,
  contentThumbnail,
  celebCount,
}: ContentStatsModalProps) {
  const [celebs, setCelebs] = useState<CelebInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // 셀럽 상세 모달 상태
  const [selectedCeleb, setSelectedCeleb] = useState<CelebProfile | null>(null);
  const [isCelebModalOpen, setIsCelebModalOpen] = useState(false);
  const [isCelebLoading, setIsCelebLoading] = useState(false);

  useEffect(() => {
    if (!isOpen || !contentId) return;

    const fetchCelebs = async () => {
      setIsLoading(true);
      const data = await getCelebsForContent(contentId);
      setCelebs(data);
      setIsLoading(false);
    };

    fetchCelebs();
  }, [isOpen, contentId]);

  const hasCeleb = celebCount > 0;

  // 셀럽 클릭 핸들러
  const handleCelebClick = async (celebId: string) => {
    if (isCelebLoading) return;
    setIsCelebLoading(true);
    
    const profile = await getCelebForModal(celebId);
    if (profile) {
      setSelectedCeleb(profile);
      setIsCelebModalOpen(true);
    }
    setIsCelebLoading(false);
  };

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title="인원 구성" icon={Users} size="md">
        <ModalBody className="!p-0">
          <div className="flex flex-col sm:flex-row">
            {/* ─────────────────────────────────────────────────────────
               좌측 패널: 콘텐츠 정보 (고정 앵커)
            ───────────────────────────────────────────────────────── */}
            <div className="sm:w-[160px] shrink-0 p-5 bg-gradient-to-b from-stone-900 to-stone-950 border-b sm:border-b-0 sm:border-r border-border/40 flex flex-col items-center">
              {/* 썸네일 */}
              {contentThumbnail ? (
                <img
                  src={contentThumbnail}
                  alt={contentTitle}
                  className="w-[80px] h-[112px] object-cover rounded-lg border border-accent/30 shadow-lg"
                />
              ) : (
                <div className="w-[80px] h-[112px] bg-bg-card rounded-lg border border-accent/30 flex items-center justify-center">
                  <Crown size={24} className="text-accent/50" />
                </div>
              )}

              {/* 제목 */}
              <p className="mt-4 text-xs font-sans text-text-primary text-center leading-snug line-clamp-2">
                {contentTitle}
              </p>

              {/* 셀럽 카운트 */}
              {hasCeleb && (
                <div className="mt-3 flex items-center gap-1.5 text-accent">
                  <Crown size={12} />
                  <span className="text-sm font-bold">{celebCount}</span>
                </div>
              )}
            </div>

            {/* ─────────────────────────────────────────────────────────
               우측 패널: 셀럽 목록
            ───────────────────────────────────────────────────────── */}
            <div className="flex-1 flex flex-col min-w-0">
              {/* 셀럽 목록 */}
              <div className="p-4 flex-1">
                <h4 className="text-xs font-sans font-medium text-text-tertiary mb-3">이 콘텐츠를 선택한 셀럽</h4>

                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="inline-block w-5 h-5 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
                  </div>
                ) : celebs.length > 0 ? (
                  <div className="space-y-1.5 max-h-56 overflow-y-auto custom-scrollbar">
                    {celebs.map((celeb) => (
                      <button
                        key={celeb.id}
                        type="button"
                        onClick={() => handleCelebClick(celeb.id)}
                        disabled={isCelebLoading}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg bg-transparent border border-transparent hover:bg-stone-800/50 hover:border-border/30 transition-all disabled:opacity-50 disabled:cursor-wait"
                      >
                        {/* 아바타 */}
                        <div className="relative shrink-0">
                          {celeb.avatar_url ? (
                            <Image
                              src={celeb.avatar_url}
                              alt={celeb.nickname}
                              width={36}
                              height={36}
                              className="w-9 h-9 rounded-full object-cover border border-border/30"
                            />
                          ) : (
                            <div className="w-9 h-9 rounded-full bg-bg-card flex items-center justify-center border border-border/30">
                              <User size={14} className="text-text-tertiary" />
                            </div>
                          )}
                        </div>

                        {/* 정보 */}
                        <div className="flex-1 min-w-0 text-start">
                          <p className="text-sm font-sans font-medium text-text-primary truncate">
                            {celeb.nickname}
                          </p>
                          <div className="flex items-center gap-1 text-[11px] text-accent/70">
                            <Crown size={10} />
                            <span>{getCelebProfessionLabel(celeb.profession)}</span>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Users size={24} className="text-text-tertiary/30 mx-auto mb-2" />
                    <p className="text-text-tertiary text-xs font-sans">셀럽 정보가 없습니다</p>
                  </div>
                )}
              </div>

              {/* 안내 문구 */}
              <div className="px-4 py-2.5 border-t border-border/30 bg-stone-950/30">
                <p className="text-[10px] font-sans text-text-tertiary text-center">
                  셀럽은 역사적 인물과 유명인을 의미합니다
                </p>
              </div>
            </div>
          </div>
        </ModalBody>

        {/* 푸터: 닫기 버튼 */}
        <ModalFooter className="!py-3 !px-5 bg-stone-950/50 border-t border-border/30 justify-end">
          <Button
            unstyled
            onClick={onClose}
            className="min-w-[100px] px-5 py-2.5 rounded-lg text-sm font-sans font-medium text-text-secondary hover:text-text-primary bg-stone-800/60 hover:bg-stone-700/60 border border-border/40 transition-colors text-center"
          >
            닫기
          </Button>
        </ModalFooter>
      </Modal>

      {/* 셀럽 상세 모달 */}
      {selectedCeleb && (
        <CelebDetailModal
          celeb={selectedCeleb}
          isOpen={isCelebModalOpen}
          onClose={() => {
            setIsCelebModalOpen(false);
            setSelectedCeleb(null);
          }}
        />
      )}
    </>
  );
}
