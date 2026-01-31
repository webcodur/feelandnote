"use client";

import { useState } from "react";
import { BookOpen, Bookmark, Share2 } from "lucide-react";
import Button from "@/components/ui/Button";
import Book3D, { type ViewAngle } from "@/components/features/book/Book3D";

type BookType = "dante" | "homer";

// 책 데이터 정의
const BOOKS = {
  dante: {
    title: "THE DIVINE COMEDY",
    author: "Dante Alighieri",
    spineText: "THE DIVINE COMEDY",
    coverColor: "from-[#8b0000] to-[#2a0000]", // 붉은 계열 (지옥 느낌)
    accentColor: "#d4af37", // Gold
    imageUrl: "https://shopping-phinf.pstatic.net/main_4819145/48191456619.20240606071013.jpg",
  },
  homer: {
    title: "일리아스",
    author: "호메로스",
    spineText: "일리아스",
    coverColor: "from-[#1a2a3a] to-[#0f1520]", // 짙은 네이비
    accentColor: "#c0c0c0", // Silver
    imageUrl: "https://shopping-phinf.pstatic.net/main_5747234/57472346773.20251101083750.jpg",
  }
};

export default function BookDesignPreview() {
  const [activeBook, setActiveBook] = useState<BookType>("dante");
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [angle, setAngle] = useState<ViewAngle>("isometric");

  const book = BOOKS[activeBook];

  return (
    <div className="w-full flex flex-col items-center gap-12 py-12">
      
      {/* 책 선택 탭 */}
      <div className="flex gap-4 mb-4">
        <button
          onClick={() => { setActiveBook("dante"); setIsBookmarked(false); }}
          className={`flex flex-col items-center gap-2 p-3 rounded-xl border transition-all ${
            activeBook === "dante"
              ? "bg-white/10 border-accent/50 text-accent"
              : "bg-transparent border-transparent text-text-tertiary hover:bg-white/5"
          }`}
        >
          <span className="font-serif font-bold">Divine Comedy</span>
          <span className="text-xs opacity-60">English Spine</span>
        </button>
        <button
          onClick={() => { setActiveBook("homer"); setIsBookmarked(false); }}
          className={`flex flex-col items-center gap-2 p-3 rounded-xl border transition-all ${
            activeBook === "homer"
              ? "bg-white/10 border-accent/50 text-accent"
              : "bg-transparent border-transparent text-text-tertiary hover:bg-white/5"
          }`}
        >
          <span className="font-serif font-bold">The Iliad</span>
          <span className="text-xs opacity-60">Korean Spine</span>
        </button>
      </div>

      {/* 뷰 컨트롤러 */}
      <div className="flex gap-2 p-1 bg-white/5 rounded-full">
        {(["isometric", "front", "side"] as const).map((view) => (
          <button
            key={view}
            onClick={() => setAngle(view)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              angle === view 
                ? "bg-accent text-bg-main font-bold" 
                : "text-text-secondary hover:text-text-primary hover:bg-white/10"
            }`}
          >
            {view === "isometric" && "쿼터뷰"}
            {view === "front" && "정면"}
            {view === "side" && "측면"}
          </button>
        ))}
      </div>

      {/* 3D Book Component */}
      <Book3D 
        title={book.title}
        author={book.author}
        spineText={book.spineText}
        coverColor={book.coverColor}
        accentColor={book.accentColor}
        imageUrl={book.imageUrl}
        angle={angle}
      />

      {/* 액션 버튼 그룹 */}
      <div className="flex items-center gap-3 w-full justify-center max-w-[240px]">
        <Button 
          className="flex-1 bg-accent hover:bg-accent/90 text-bg-main font-bold py-3 shadow-[0_0_20px_-5px_rgba(212,175,55,0.3)]"
        >
          <BookOpen size={18} className="mr-2" />
          펼쳐보기
        </Button>
        <button 
          onClick={() => setIsBookmarked(!isBookmarked)}
          className={`p-3 rounded-lg border transition-all duration-300 ${
            isBookmarked 
              ? "bg-accent/10 border-accent text-accent shadow-[0_0_15px_-5px_rgba(212,175,55,0.3)]" 
              : "bg-white/5 border-white/10 text-text-secondary hover:text-text-primary hover:bg-white/10"
          }`}
        >
          <Bookmark size={20} fill={isBookmarked ? "currentColor" : "none"} />
        </button>
        <button className="p-3 rounded-lg bg-white/5 border border-white/10 text-text-secondary hover:text-text-primary hover:bg-white/10 transition-colors">
          <Share2 size={20} />
        </button>
      </div>
    </div>
  );
}
