"use client";

import Link from "next/link";
import { ContentCard, type ContentCardProps } from "@/components/ui/cards";
import { ArrowRight } from "lucide-react";

// Mock Data for Archive Preview
const MOCK_RECORDS: Partial<ContentCardProps>[] = [
  {
    contentId: "mock-1",
    contentType: "BOOK",
    title: "The Great Gatsby",
    creator: "F. Scott Fitzgerald",
    status: "FINISHED",
    rating: 4.5,
    review: "화려함 뒤에 숨겨진 공허함. 아메리칸 드림의 허상을 날카롭게 비판하면서도 아름다운 문체로 그려낸 걸작."
  },
  {
    contentId: "mock-2",
    contentType: "VIDEO",
    title: "Interstellar",
    creator: "Christopher Nolan",
    status: "FINISHED",
    rating: 5.0,
    review: "사랑은 시공간을 초월하는 유일한 것. 과학적 상상력과 휴머니즘의 완벽한 조화."
  },
  {
    contentId: "mock-3",
    contentType: "MUSIC",
    title: "Bohemian Rhapsody",
    creator: "Queen",
    status: "WANT",
    rating: null,
    review: "오페라와 록의 파격적인 만남."
  },
  {
    contentId: "mock-4",
    contentType: "GAME",
    title: "The Legend of Zelda",
    creator: "Nintendo",
    status: "FINISHED",
    rating: 4.8,
    review: "진정한 모험이란 무엇인가를 보여주는 게임."
  }
];

interface ArchivePreviewProps {
  initialRecords?: ContentCardProps[];
  userId?: string;
}

export default function ArchivePreview({ initialRecords = [], userId }: ArchivePreviewProps) {
  const isGuest = !userId;
  const hasRecords = initialRecords.length > 0;
  
  // 게스트인 경우 MOCK 데이터 사용, 로그인했지만 기록이 없으면 빈 배열
  const displayRecords = isGuest ? MOCK_RECORDS : initialRecords;

  return (
    <div className="w-full">
      <div className="relative text-left">
        {/* Records Grid */}
        <div className={`grid grid-cols-2 gap-3 sm:gap-6 transition-opacity duration-500 ${isGuest ? "opacity-80 hover:opacity-100" : ""}`}>
          {displayRecords.map((record, idx) => (
            <div 
              key={record.contentId} 
              className="transform hover:-translate-y-2 transition-transform duration-300"
              style={{ transitionDelay: `${idx * 100}ms` }}
            >
              <ContentCard
                {...record as ContentCardProps}
                heightClass="h-[300px]"
                className="shadow-xl"
              />
            </div>
          ))}
        </div>

        {/* Empty State (Logged in but no records) */}
        {!isGuest && !hasRecords && (
          <div className="py-20 flex flex-col items-center justify-center text-center borderBorder border-dashed border-white/10 rounded-2xl bg-white/5">
            <p className="text-text-secondary font-serif mb-4">아직 기록된 영감이 없습니다.</p>
            <Link
              href="/archive"
              className="text-accent underline text-sm hover:text-accent-bright"
            >
              첫 기록 남기기
            </Link>
          </div>
        )}

        {/* Guest CTA Overlay (Desktop only - hover to reveal) */}
        {isGuest && (
          <div className="absolute inset-0 hidden md:flex items-center justify-center bg-bg-main/80 backdrop-blur-sm opacity-0 hover:opacity-100 transition-opacity duration-300 group z-10">
            <Link
              href="/login"
              className="group px-8 py-3 rounded-full border border-white/20 hover:border-accent hover:bg-accent/5 text-sm font-medium transition-all flex items-center gap-2 text-text-secondary hover:text-accent bg-bg-main"
            >
              <span>나의 기록 만들기</span>
              <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
