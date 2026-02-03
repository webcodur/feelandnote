/*
  파일명: /components/features/scriptures/ScriptureCelebModal.tsx
  기능: 경전 셀럽 목록 모달
  책임: 해당 콘텐츠를 선택한 셀럽 목록을 표시한다.
*/ // ------------------------------
"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Users, Crown, User, Loader2 } from "lucide-react";
import Modal, { ModalBody } from "@/components/ui/Modal";
import { getCelebsForContent } from "@/actions/scriptures";
import { getCelebProfessionLabel } from "@/constants/celebProfessions";

// #region Types
interface CelebInfo {
  id: string;
  nickname: string;
  avatar_url: string | null;
  profession: string | null;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  contentId: string;
  contentTitle: string;
  celebCount: number;
  userCount: number;
}
// #endregion

export default function ScriptureCelebModal({
  isOpen,
  onClose,
  contentId,
  contentTitle,
  celebCount,
  userCount,
}: Props) {
  const [celebs, setCelebs] = useState<CelebInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    const fetchCelebs = async () => {
      setIsLoading(true);
      const data = await getCelebsForContent(contentId);
      setCelebs(data);
      setIsLoading(false);
    };

    fetchCelebs();
  }, [isOpen, contentId]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="인원 구성" icon={Users} size="sm">
      <ModalBody className="space-y-4">
        {/* 콘텐츠 제목 */}
        <div className="text-center pb-3 border-b border-border/30">
          <p className="text-sm text-text-secondary line-clamp-2">{contentTitle}</p>
        </div>

        {/* 통계 요약 */}
        <div className="flex justify-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center">
              <Crown size={16} className="text-accent" />
            </div>
            <div>
              <p className="text-lg font-bold text-text-primary">{celebCount}</p>
              <p className="text-xs text-text-secondary">셀럽</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
              <User size={16} className="text-text-secondary" />
            </div>
            <div>
              <p className="text-lg font-bold text-text-primary">{userCount}</p>
              <p className="text-xs text-text-secondary">사용자</p>
            </div>
          </div>
        </div>

        {/* 셀럽 목록 */}
        <div className="pt-2">
          <h4 className="text-xs font-medium text-text-tertiary mb-3">이 콘텐츠를 선택한 셀럽</h4>

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 size={24} className="text-accent animate-spin" />
            </div>
          ) : celebs.length > 0 ? (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {celebs.map((celeb) => (
                <Link
                  key={celeb.id}
                  href={`/${celeb.id}`}
                  onClick={onClose}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5"
                >
                  <div className="relative w-10 h-10 rounded-full overflow-hidden bg-neutral-800 flex-shrink-0">
                    {celeb.avatar_url ? (
                      <Image
                        src={celeb.avatar_url}
                        alt={celeb.nickname}
                        fill
                        sizes="40px"
                        className="object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <User size={20} className="text-text-tertiary" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text-primary truncate">
                      {celeb.nickname}
                    </p>
                    <p className="text-xs text-text-tertiary">
                      {getCelebProfessionLabel(celeb.profession)}
                    </p>
                  </div>
                  <Crown size={14} className="text-accent/60 flex-shrink-0" />
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 text-text-tertiary text-sm">
              셀럽 정보가 없습니다
            </div>
          )}
        </div>

        {/* 안내 문구 */}
        <p className="text-[10px] text-text-tertiary text-center pt-2 border-t border-border/30">
          셀럽은 역사적 인물과 유명인을 의미합니다
        </p>
      </ModalBody>
    </Modal>
  );
}
