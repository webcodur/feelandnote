"use client";

import { useState, useEffect, useCallback } from "react";
import { Loader2, ArrowRight } from "lucide-react";
import FeedPostCard from "./FeedPostCard";
import type { SubTab } from "./ArchiveDetailTabs";
import { getFeedRecords, type FeedRecord } from "@/actions/records";
import type { RecordType } from "@/actions/records";
import Button from "@/components/ui/Button";

const PAGE_SIZE = 10;

interface FeedSectionProps {
  contentId: string;
  subTab: SubTab;
}

// NOTE: REVIEW는 user_contents로 이동됨, 피드에서는 NOTE/QUOTE만 표시
const subTabToRecordType: Partial<Record<SubTab, RecordType>> = {
  note: "NOTE",
  creation: "CREATION",
};

export default function FeedSection({ contentId, subTab }: FeedSectionProps) {
  const [records, setRecords] = useState<FeedRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);

  const loadRecords = useCallback(async (offset = 0, append = false) => {
    // review 탭은 user_contents로 이동되어 피드에서 지원하지 않음
    if (subTab === "review") {
      setRecords([]);
      setIsLoading(false);
      return;
    }

    if (offset === 0) {
      setIsLoading(true);
    } else {
      setIsLoadingMore(true);
    }

    try {
      const recordType = subTabToRecordType[subTab];
      if (!recordType) {
        setRecords([]);
        setIsLoading(false);
        return;
      }

      const data = await getFeedRecords({
        contentId,
        type: recordType,
        limit: PAGE_SIZE,
        offset,
      });

      if (append) {
        setRecords((prev) => [...prev, ...data]);
      } else {
        setRecords(data);
      }
      setHasMore(data.length === PAGE_SIZE);
    } catch (error) {
      console.error("피드 로드 실패:", error);
      if (!append) setRecords([]);
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, [contentId, subTab]);

  useEffect(() => {
    setRecords([]);
    loadRecords(0, false);
  }, [loadRecords]);

  const handleLoadMore = () => {
    loadRecords(records.length, true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 size={24} className="animate-spin text-accent" />
      </div>
    );
  }

  if (records.length === 0) {
    return (
      <div className="animate-fade-in text-center py-12 text-text-secondary text-sm">
        아직 다른 사람들의 기록이 없습니다.
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="grid grid-cols-1 sm:grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-3">
        {records.map((record) => (
          <FeedPostCard key={record.id} record={record} />
        ))}
      </div>

      {hasMore && (
        <Button
          unstyled
          onClick={handleLoadMore}
          disabled={isLoadingMore}
          className="mt-4 flex items-center gap-1 mx-auto px-4 py-2 text-xs text-accent hover:text-accent-hover"
        >
          {isLoadingMore ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <>
              <span>더보기</span>
              <ArrowRight size={14} />
            </>
          )}
        </Button>
      )}
    </div>
  );
}
