/*
  파일명: /components/shared/UserAvatarWithPopover.tsx
  기능: 대상 종류에 따른 아바타 상호작용 분기
  책임: USER는 미니 팝오버, CELEB은 상세 모달을 표시한다.
*/ // ------------------------------
"use client";

import { useState, useCallback, lazy, Suspense, type ReactNode } from "react";
import UserMiniProfilePopover from "./UserMiniProfilePopover";
import { getCelebForModal } from "@/actions/celebs";
import type { CelebProfile } from "@/types/home";

const CelebDetailModal = lazy(() => import("@/components/features/celeb/modals/CelebDetailModal"));

interface UserAvatarWithPopoverProps {
  userId: string;
  subjectKind: "member" | "celeb";
  trigger: ReactNode;
}

export default function UserAvatarWithPopover({ userId, subjectKind, trigger }: UserAvatarWithPopoverProps) {
  const [celebData, setCelebData] = useState<CelebProfile | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleCelebClick = useCallback(async () => {
    if (isLoading) return;
    setIsLoading(true);
    const data = await getCelebForModal(userId);
    if (data) {
      setCelebData(data);
      setIsModalOpen(true);
    }
    setIsLoading(false);
  }, [userId, isLoading]);

  // USER: 미니 팝오버
  if (subjectKind === "member") {
    return <UserMiniProfilePopover userId={userId} trigger={trigger} />;
  }

  // CELEB: 상세 모달
  return (
    <>
      <div
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          handleCelebClick();
        }}
        className="cursor-pointer"
      >
        {trigger}
      </div>

      {celebData && (
        <Suspense fallback={null}>
          <CelebDetailModal
            celeb={celebData}
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
          />
        </Suspense>
      )}
    </>
  );
}
