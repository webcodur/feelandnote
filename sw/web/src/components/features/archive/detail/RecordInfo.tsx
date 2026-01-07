/*
  파일명: /components/features/archive/detail/RecordInfo.tsx
  기능: 기록 정보 읽기 전용 뷰 컴포넌트
  책임: RecordInfoPanel을 Card로 감싸서 읽기 전용으로 표시한다.
*/ // ------------------------------
"use client";

import { ExternalLink } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button, Card } from "@/components/ui";
import RecordInfoPanel from "./RecordInfoPanel";
import type { UserContentWithContent } from "@/actions/contents/getMyContents";

// #region 타입
interface RecordInfoProps {
  item: UserContentWithContent;
  href?: string;
  showTitle?: boolean;
  compact?: boolean;
}
// #endregion

export default function RecordInfo({
  item,
  href,
  showTitle = true,
  compact = false,
}: RecordInfoProps) {
  const router = useRouter();

  return (
    <Card className={`${compact ? "p-3" : "p-4"} h-full flex flex-col`}>
      {/* 헤더 */}
      {(showTitle || href) && (
        <div className="flex items-center justify-between mb-3 shrink-0">
          {showTitle && (
            <h3 className="text-sm font-semibold text-text-primary">내 기록</h3>
          )}
          {href && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push(href)}
              className="gap-1.5 text-xs"
            >
              <ExternalLink size={14} />
              기록관에서 보기
            </Button>
          )}
        </div>
      )}

      {/* 기록 정보 - RecordInfoPanel 사용 (리뷰 포함) */}
      <div className="flex-1 flex flex-col">
        <RecordInfoPanel data={item} editable={false} showReview fillHeight />
      </div>
    </Card>
  );
}
