/*
  파일명: /components/features/content/ContentDetailPage.tsx
  기능: 콘텐츠 상세 페이지 메인 컴포넌트
  책임: 아코디언 레이아웃으로 콘텐츠 정보, 내 리뷰, 내 노트, 모든 리뷰를 조합한다.
*/ // ------------------------------
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Info, Star, Lock, MessageSquare } from "lucide-react";
import Button from "@/components/ui/Button";
import AccordionSection from "./AccordionSection";
import ContentInfoSection from "./ContentInfoSection";
import MyReviewSection from "./MyReviewSection";
import MyNoteSection from "./MyNoteSection";
import AllReviewsSection from "./AllReviewsSection";
import type { ContentDetailData } from "@/actions/contents/getContentDetail";

interface ContentDetailPageProps {
  initialData: ContentDetailData;
}

export default function ContentDetailPage({ initialData }: ContentDetailPageProps) {
  const router = useRouter();
  const [data, setData] = useState(initialData);

  const { content, userRecord, isLoggedIn, hasApiKey, initialReviews, initialAiReviews } = data;

  const handleRecordChange = (newRecord: ContentDetailData["userRecord"]) => {
    setData((prev) => ({ ...prev, userRecord: newRecord }));
  };

  return (
    <div className="max-w-3xl mx-auto">
      {/* 뒤로가기 */}
      <Button
        variant="ghost"
        className="flex items-center gap-2 text-text-secondary text-sm font-semibold mb-4"
        onClick={() => router.back()}
      >
        <ArrowLeft size={16} />
        <span>뒤로 가기</span>
      </Button>

      <div className="space-y-4">
        {/* 1. 콘텐츠 정보 */}
        <AccordionSection title="콘텐츠 정보" icon={<Info size={16} />} defaultOpen>
          <ContentInfoSection
            content={content}
            userRecord={userRecord}
            hasApiKey={hasApiKey}
            isLoggedIn={isLoggedIn}
            onRecordChange={handleRecordChange}
          />
        </AccordionSection>

        {/* 2. 내 리뷰 (로그인 시 표시) */}
        {isLoggedIn && (
          <AccordionSection
            title="내 리뷰"
            icon={<Star size={16} />}
            badge={
              userRecord?.rating && (
                <span className="text-xs text-yellow-400">{"★".repeat(userRecord.rating)}</span>
              )
            }
            defaultOpen
          >
            <MyReviewSection
              content={content}
              userRecord={userRecord}
              onRecordChange={handleRecordChange}
            />
          </AccordionSection>
        )}

        {/* 3. 내 노트 (기록이 있고 로그인 시) */}
        {userRecord && isLoggedIn && (
          <AccordionSection
            title="내 노트"
            icon={<Lock size={16} />}
            badge={<span className="text-[10px] text-text-tertiary bg-white/5 px-1.5 py-0.5 rounded">비공개</span>}
            defaultOpen={false}
          >
            <MyNoteSection contentId={content.id} />
          </AccordionSection>
        )}

        {/* 4. 모든 리뷰 (항상 표시) */}
        <div className="bg-bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-4">
            <MessageSquare size={16} className="text-accent" />
            <h3 className="font-semibold text-sm text-text-primary">다른 기록자들의 리뷰</h3>
          </div>
          <AllReviewsSection
            contentId={content.id}
            contentTitle={content.title}
            contentType={content.type}
            hasApiKey={hasApiKey}
            initialReviews={initialReviews}
            initialAiReviews={initialAiReviews}
          />
        </div>
      </div>
    </div>
  );
}
