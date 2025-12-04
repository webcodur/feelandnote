"use client";

import { useState } from "react";
import Link from "next/link";
import ContentCard from "@/components/features/archive/ContentCard";
import { ARCHIVE_ITEMS } from "@/lib/mock-data";
import { Plus, Book, Film, Tv, Gamepad2, Archive } from "lucide-react";
import { SectionHeader, ContentGrid } from "@/components/ui";

function getIconForTab(tab: string) {
  switch (tab) {
    case "도서":
      return <Book size={16} />;
    case "영화":
      return <Film size={16} />;
    case "드라마":
      return <Tv size={16} />;
    case "게임":
      return <Gamepad2 size={16} />;
    default:
      return null;
  }
}

export default function ArchivePage() {
  const [activeTab, setActiveTab] = useState("전체");

  const tabs = ["전체", "도서", "영화", "드라마", "게임"];

  const filteredItems =
    activeTab === "전체"
      ? ARCHIVE_ITEMS
      : ARCHIVE_ITEMS.filter((item) => item.type === activeTab);

  return (
    <>
      <div className="mb-8">
        <SectionHeader title="내 기록관" icon={<Archive size={24} />} />

        <div className="flex gap-4 border-b border-border pb-4 mb-6">
          {tabs.map((tab) => (
            <div
              key={tab}
              className={`font-semibold cursor-pointer py-2 px-4 rounded-lg transition-all duration-200 flex items-center gap-1.5
                ${activeTab === tab ? "text-text-primary bg-bg-secondary" : "text-text-secondary hover:text-text-primary hover:bg-white/5"}`}
              onClick={() => setActiveTab(tab)}
            >
              {getIconForTab(tab)} {tab}
            </div>
          ))}
        </div>

        <div className="flex justify-between items-center mb-6">
          <div className="flex gap-3">
            <button className="bg-bg-secondary border border-border text-text-secondary py-1.5 px-3 rounded-md text-[13px] cursor-pointer transition-all duration-200 hover:border-text-secondary hover:text-text-primary">
              상태: 전체 ▼
            </button>
            <button className="bg-bg-secondary border border-border text-text-secondary py-1.5 px-3 rounded-md text-[13px] cursor-pointer transition-all duration-200 hover:border-text-secondary hover:text-text-primary">
              정렬: 최근 추가순 ▼
            </button>
          </div>
          <div className="flex bg-bg-secondary rounded-md p-0.5">
            <div className="py-1.5 px-2.5 rounded cursor-pointer bg-bg-card">▦</div>
            <div className="py-1.5 px-2.5 rounded cursor-pointer opacity-50">≡</div>
          </div>
        </div>
      </div>

      <ContentGrid>
        {filteredItems.map((item) => (
          <Link href={`/archive/${item.id}`} key={item.id}>
            <ContentCard item={item} />
          </Link>
        ))}
      </ContentGrid>

      <button className="fixed bottom-10 right-10 w-16 h-16 rounded-full bg-accent flex items-center justify-center shadow-lg cursor-pointer transition-all duration-300 z-20 hover:scale-110 hover:rotate-90 hover:bg-accent-hover">
        <Plus color="white" size={32} />
      </button>
    </>
  );
}
