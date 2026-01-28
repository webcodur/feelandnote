/*
  파일명: /components/features/recommendations/RecommendButton.tsx
  기능: 추천 버튼
  책임: 콘텐츠 상세 페이지에서 추천 모달을 여는 버튼을 제공한다.
*/ // ------------------------------
"use client";

import { useState } from "react";
import { Gift } from "lucide-react";
import Button from "@/components/ui/Button";
import RecommendationModal from "./RecommendationModal";

interface RecommendButtonProps {
  userContentId: string;
  contentTitle: string;
  contentThumbnail: string | null;
  contentType: string;
  iconOnly?: boolean;
}

export default function RecommendButton({
  userContentId,
  contentTitle,
  contentThumbnail,
  contentType,
  iconOnly = false,
}: RecommendButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <Button
        unstyled
        onClick={() => setIsModalOpen(true)}
        className={
          iconOnly
            ? "flex items-center justify-center w-8 h-8 rounded-full bg-black/60 text-accent hover:bg-accent hover:text-white backdrop-blur-sm"
            : "flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent/10 text-accent hover:bg-accent/20 text-sm font-medium transition-colors"
        }
        title="추천"
      >
        <Gift size={16} />
        {!iconOnly && <span>추천</span>}
      </Button>

      <RecommendationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        userContentId={userContentId}
        contentTitle={contentTitle}
        contentThumbnail={contentThumbnail}
        contentType={contentType}
      />
    </>
  );
}
