"use client";

import Link from "next/link";
import Image from "next/image";
import { ChevronRight, Star } from "lucide-react";
import { BLUR_DATA_URL } from "@/constants/image";
import type { UserContentPublic } from "@/actions/contents/getUserContents";

interface RecentRecordsProps {
  items: UserContentPublic[];
  userId: string;
}

export default function RecentRecords({ items, userId }: RecentRecordsProps) {
  if (items.length === 0) {
    return (
      <div className="p-12 text-center border border-dashed border-accent-dim/30 rounded-sm">
        <p className="text-text-secondary font-serif italic">The archives are currently empty.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 min-[440px]:grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2 sm:gap-4 md:gap-5 lg:gap-6">
      {items.map((item) => (
        <Link
          key={item.id}
          href={`/${userId}/records/${item.content_id}`}
          className="group flex flex-col gap-2.5"
        >
          {/* 썸네일 */}
          <div className="relative aspect-[10/14] rounded-sm overflow-hidden border border-accent-dim/30 bg-bg-secondary group-hover:border-accent group-hover:shadow-[0_0_15px_rgba(212,175,55,0.2)] transition-all duration-300">
            {item.content.thumbnail_url ? (
              <Image
                src={item.content.thumbnail_url}
                alt={item.content.title}
                fill
                sizes="(max-width: 640px) 33vw, (max-width: 1024px) 25vw, 15vw"
                className="object-cover transition-transform duration-500 group-hover:scale-105"
                placeholder="blur"
                blurDataURL={BLUR_DATA_URL}
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center bg-bg-card/50">
                <span className="font-serif text-xs tracking-widest font-black text-accent/50">이미지 없음</span>
              </div>
            )}
            



            {/* 별점 - 하단에 강조 표시 (더 견고한 디자인) */}
            {item.public_record?.rating && (
              <div className="absolute bottom-0 left-0 flex items-center gap-1.5 px-3 py-1 bg-accent text-bg-main text-[11px] font-black border-t border-r border-white/20 shadow-[5px_-5px_15px_rgba(0,0,0,0.5)] z-20">
                <Star size={11} fill="currentColor" strokeWidth={0} />
                <span className="tabular-nums">{item.public_record.rating.toFixed(1)}</span>
              </div>
            )}
          </div>

          {/* 정보 - 더 가독성 있게 */}
          <div className="px-0.5">
            <h3 className="text-xs md:text-sm font-serif font-bold text-text-primary leading-snug line-clamp-1 group-hover:text-accent transition-colors mb-1">
              {item.content.title}
            </h3>
            <p className="text-[10px] md:text-xs text-text-secondary font-serif line-clamp-1 font-medium">
              {item.content.creator || "작자 미상"}
            </p>
          </div>
        </Link>
      ))}
      
      {/* 더보기 카드 - 더 작고 견고하게 */}
      <Link
        href={`/${userId}/records`}
        className="flex flex-col items-center justify-center gap-3 aspect-[10/14] rounded-sm border-2 border-dashed border-accent-dim/30 bg-bg-card/30 hover:bg-accent/10 hover:border-accent group transition-all duration-300"
      >
        <div className="w-10 h-10 rounded-full border-2 border-accent/30 flex items-center justify-center group-hover:border-accent transition-all duration-300 shadow-sm">
            <ChevronRight size={20} className="text-accent opacity-60 group-hover:opacity-100" />
        </div>
        <span className="text-xs text-accent font-serif font-black tracking-widest group-hover:underline">
            전체 보기
        </span>
      </Link>
    </div>
  );
}
