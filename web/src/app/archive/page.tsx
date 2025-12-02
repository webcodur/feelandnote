"use client";

import { useState } from "react";
import Link from "next/link";
import MainLayout from "@/components/layout/MainLayout";
import ContentCard from "@/components/features/archive/ContentCard";
import { ARCHIVE_ITEMS } from "@/lib/mock-data";
import { Plus } from "lucide-react";

export default function ArchivePage() {
  const [activeTab, setActiveTab] = useState("전체");

  const tabs = ["전체", "도서", "영화", "드라마", "게임"];

  const filteredItems =
    activeTab === "전체"
      ? ARCHIVE_ITEMS
      : ARCHIVE_ITEMS.filter((item) => item.type === activeTab);

  return (
    <MainLayout>
      <div className="page-header">
        <h1 className="page-title">내 기록관</h1>

        <div className="tabs">
          {tabs.map((tab) => (
            <div
              key={tab}
              className={`tab ${activeTab === tab ? "active" : ""}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab === "전체" ? "" : getIconForTab(tab)} {tab}
            </div>
          ))}
        </div>

        <div className="toolbar">
          <div className="filter-group">
            <button className="filter-btn">상태: 전체 ▼</button>
            <button className="filter-btn">정렬: 최근 추가순 ▼</button>
          </div>
          <div className="view-toggle">
            <div className="toggle-btn active">▦</div>
            <div className="toggle-btn">≡</div>
          </div>
        </div>
      </div>

      <div className="content-grid">
        {filteredItems.map((item) => (
          <Link href={`/archive/${item.id}`} key={item.id}>
            <ContentCard item={item} />
          </Link>
        ))}
      </div>

      <div className="fab">
        <Plus color="white" size={32} />
      </div>
    </MainLayout>
  );
}

function getIconForTab(tab: string) {
  switch (tab) {
    case "도서":
      return "📚";
    case "영화":
      return "🎬";
    case "드라마":
      return "📺";
    case "게임":
      return "🎮";
    default:
      return "";
  }
}
