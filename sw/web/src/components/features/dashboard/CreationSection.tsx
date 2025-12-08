"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card } from "@/components/ui";
import { MessageCircle, FileText, Quote, Lightbulb, Loader2 } from "lucide-react";
import { getRecords } from "@/actions/records";

interface RecordItem {
  id: string;
  type: string;
  content: string;
  created_at: string;
  contentData?: {
    id: string;
    title: string;
    type: string;
  };
}

function getRecordIcon(type: string) {
  switch (type) {
    case "REVIEW":
      return <FileText size={14} />;
    case "NOTE":
      return <MessageCircle size={14} />;
    case "QUOTE":
      return <Quote size={14} />;
    default:
      return <Lightbulb size={14} />;
  }
}

function getRecordLabel(type: string) {
  switch (type) {
    case "REVIEW":
      return "리뷰";
    case "NOTE":
      return "노트";
    case "QUOTE":
      return "인용";
    default:
      return "기록";
  }
}

export default function CreationSection() {
  const [records, setRecords] = useState<RecordItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadRecords() {
      try {
        const data = await getRecords({ limit: 4 });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setRecords(data.map((r: any) => ({
          id: r.id,
          type: r.type,
          content: r.content,
          created_at: r.created_at,
          contentData: r.contentData ? {
            id: r.contentData.id,
            title: r.contentData.title,
            type: r.contentData.type
          } : undefined
        })));
      } catch (error) {
        console.error("Failed to load records:", error);
      } finally {
        setIsLoading(false);
      }
    }
    loadRecords();
  }, []);

  if (isLoading) {
    return (
      <Card className="mb-8">
        <div className="flex justify-between items-center mb-5">
          <div className="text-lg font-bold flex items-center gap-2">
            <Lightbulb size={18} className="text-accent" /> 최근 기록
          </div>
        </div>
        <div className="flex items-center justify-center py-8">
          <Loader2 size={24} className="animate-spin text-accent" />
        </div>
      </Card>
    );
  }

  if (records.length === 0) {
    return (
      <Card className="mb-8">
        <div className="flex justify-between items-center mb-5">
          <div className="text-lg font-bold flex items-center gap-2">
            <Lightbulb size={18} className="text-accent" /> 최근 기록
          </div>
        </div>
        <div className="text-center py-8 text-text-secondary">
          <p>아직 작성한 기록이 없습니다.</p>
          <p className="text-sm mt-1">콘텐츠를 감상하고 기록을 남겨보세요!</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="mb-8">
      <div className="flex justify-between items-center mb-5">
        <div className="text-lg font-bold flex items-center gap-2">
          <Lightbulb size={18} className="text-accent" /> 최근 기록
        </div>
        <Link href="/archive" className="text-accent text-sm cursor-pointer font-semibold hover:underline">
          모두보기 →
        </Link>
      </div>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-5">
        {records.map((item) => (
          <Link
            key={item.id}
            href={item.contentData ? `/archive/${item.contentData.id}` : "#"}
            className="bg-white/[0.03] p-6 rounded-2xl border border-white/5 cursor-pointer transition-all duration-300 hover:border-accent hover:bg-accent/5 hover:-translate-y-1 hover:shadow-2xl"
          >
            <div className="text-[13px] text-accent mb-3 font-semibold uppercase tracking-wide flex items-center gap-1">
              {getRecordIcon(item.type)} {getRecordLabel(item.type)}
            </div>
            {item.contentData && (
              <div className="text-lg font-bold mb-3">{item.contentData.title}</div>
            )}
            <div className="text-sm text-text-secondary leading-relaxed line-clamp-3">
              {item.content}
            </div>
          </Link>
        ))}
      </div>
    </Card>
  );
}
