/*
  파일명: /components/lab/ExploreMockup.tsx
  기능: PageHeroSectionNeo를 포함한 탐색 페이지 목업
  책임: 헤더와 셀럽 카드가 어우러진 전체 페이지 레이아웃을 시뮬레이션한다.
*/ // ------------------------------

import PageHeroSectionNeo from "@/components/ui/PageHeroSectionNeo";
import { Star, Search, BarChart3 } from "lucide-react";

// #region Mock Data
const MOCK_CELEBS = [
  { id: 1, name: "Marcus Aurelius", job: "Philosopher King", image: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?fit=crop&w=400&h=600" },
  { id: 2, name: "Leonardo da Vinci", job: "Polymath", image: "https://images.unsplash.com/photo-1595268481498-8e682d28d085?fit=crop&w=400&h=600" },
  { id: 3, name: "Ada Lovelace", job: "Mathematician", image: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?fit=crop&w=400&h=600" },
  { id: 4, name: "Albert Einstein", job: "Physicist", image: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?fit=crop&w=400&h=600" },
  { id: 5, name: "Marie Curie", job: "Chemist", image: "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?fit=crop&w=400&h=600" },
  { id: 6, name: "Nikola Tesla", job: "Inventor", image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?fit=crop&w=400&h=600" },
  { id: 7, name: "Isaac Newton", job: "Physicist", image: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?fit=crop&w=400&h=600" },
  { id: 8, name: "Galileo Galilei", job: "Astronomer", image: "https://images.unsplash.com/photo-1522075469751-3a3694c2dd77?fit=crop&w=400&h=600" },
];

const MOCK_TABS = ["셀럽", "친구", "팔로잉", "팔로워", "취향 유사"];
const MOCK_COLLECTIONS = [
  { id: 1, label: "워커홀릭", count: 4, active: true },
  { id: 2, label: "자수성가", count: 2, active: false },
  { id: 3, label: "디지털 레지스탕스", count: 5, active: false },
];
// #endregion

export default function ExploreMockup() {
  return (
    <div className="w-full min-h-screen bg-[#050505] text-[#e0e0e0] font-sans selection:bg-accent/30">
      
      {/* 1. Header Section */}
      <PageHeroSectionNeo
        englishTitle="ARCHITECTS OF WISDOM"
        title="지혜의 탐구자들"
        description="당신의 여정에 영감을 불어넣을 선구자들의 기록을 탐색하세요."
      />

      {/* 2. Navigation Tabs (Centered under Header) */}
      <div className="flex justify-center border-b border-white/5 mb-8">
        <div className="flex items-center gap-8 md:gap-12 px-4 overflow-x-auto no-scrollbar">
          {MOCK_TABS.map((tab, idx) => (
            <button key={tab} className="group relative py-4">
              <span className={`text-sm md:text-base font-medium tracking-wide transition-colors ${idx === 0 ? "text-accent" : "text-text-secondary hover:text-text-primary"}`}>
                {tab}
                {idx === 0 && <Star size={8} className="inline ml-1.5 -mt-0.5 fill-accent" />}
              </span>
              {/* Active Tab Indicator */}
              {idx === 0 && (
                <div className="absolute bottom-0 left-0 w-full h-0.5 bg-accent shadow-[0_0_10px_rgba(212,175,55,0.5)]" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* 3. Main Content Container */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 pb-32">
        
        {/* Top Controls Area */}
        <div className="flex flex-col items-center gap-8 mb-16">
            
            {/* Collection Tags */}
            <div className="flex flex-col items-center gap-3 animate-fade-in-up">
                <div className="flex items-center gap-2 text-accent text-xs font-bold tracking-widest uppercase mb-1">
                    <Star size={12} className="fill-accent" />
                    <span>지금 뜨는 컬렉션</span>
                </div>
                <div className="flex flex-wrap justify-center gap-2 md:gap-3">
                    {MOCK_COLLECTIONS.map((col) => (
                        <button 
                            key={col.id} 
                            className={`
                                h-9 px-4 rounded-full flex items-center gap-2 text-sm transition-all duration-300
                                ${col.active 
                                    ? "bg-accent text-bg-main font-bold shadow-[0_0_15px_-3px_var(--color-accent)]" 
                                    : "bg-white/5 text-text-secondary border border-white/10 hover:border-accent/40 hover:text-white hover:bg-white/10"
                                }
                            `}
                        >
                            <span>{col.label}</span>
                            <span className={`text-[10px] ${col.active ? "opacity-80" : "opacity-50"}`}>{col.count}</span>
                        </button>
                    ))}
                    <button className="h-9 px-4 rounded-full bg-transparent border border-white/10 text-text-tertiary text-sm hover:text-white hover:border-white/30 transition-colors">
                        전체 +9 &gt;
                    </button>
                </div>
            </div>

            {/* Filter Rows & Search */}
            <div className="w-full max-w-4xl flex flex-col gap-4">
                
                {/* 1st Row: Dropdown Filters */}
                <div className="flex flex-wrap justify-center gap-2 md:gap-3">
                    {["직군", "국적", "콘텐츠", "정렬"].map((label, idx) => (
                        <div key={label} className="flex items-stretch group">
                             <div className="h-10 px-3 flex items-center bg-[#111] border border-r-0 border-white/10 rounded-l-md text-text-tertiary text-xs">
                                 {label}
                             </div>
                             <button className="h-10 px-4 flex items-center justify-between gap-3 bg-[#111] border border-white/10 rounded-r-md text-text-secondary text-sm hover:border-accent/50 hover:text-white transition-colors min-w-[100px]">
                                 <span>{idx === 3 ? "영향력순" : "전체"}</span>
                                 <span className="text-[10px] opacity-50 group-hover:text-accent">▼</span>
                             </button>
                        </div>
                    ))}
                </div>

                {/* 2nd Row: Search Bar */}
                <div className="flex justify-center gap-2 md:gap-3">
                    <div className="relative flex-1 max-w-md group">
                        <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                             <Search size={16} className="text-text-tertiary group-focus-within:text-accent transition-colors" />
                        </div>
                        <input 
                            type="text" 
                            placeholder="인물 검색..." 
                            className="w-full h-11 pl-10 pr-4 bg-[#111] border border-white/10 rounded-lg text-sm text-text-primary focus:outline-none focus:border-accent/50 focus:shadow-[0_0_15px_rgba(212,175,55,0.15)] transition-all placeholder:text-text-tertiary/50"
                        />
                    </div>
                    <button className="h-11 px-6 bg-accent text-bg-main font-bold text-sm rounded-lg hover:bg-accent-hover hover:scale-105 transition-all shadow-lg shadow-accent/20">
                        검색
                    </button>
                    <button className="h-11 px-4 border border-white/10 text-text-secondary text-sm rounded-lg hover:bg-white/5 hover:text-white transition-colors flex items-center gap-2">
                        <BarChart3 size={16} />
                        <span className="hidden md:inline">영향력 분포</span>
                    </button>
                </div>

            </div>
        </div>

        {/* Celeb Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-4 gap-y-8 md:gap-x-6 md:gap-y-10">
          {MOCK_CELEBS.map((celeb) => (
            <div key={celeb.id} className="group relative flex flex-col items-center">
              
              {/* Card Image Frame */}
              <div className="relative aspect-[13/19] w-full overflow-hidden rounded-sm bg-neutral-900 mb-4 transition-all duration-500 group-hover:shadow-[0_0_30px_-5px_var(--color-accent)] group-hover:shadow-accent/40">
                {/* Border Frame */}
                <div className="absolute inset-0 border border-white/10 z-20 transition-colors group-hover:border-accent/50" />
                
                {/* Image */}
                <img
                  src={celeb.image}
                  alt={celeb.name}
                  className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-700 grayscale group-hover:grayscale-0"
                />

                {/* Hover Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10" />
              </div>

              {/* Info */}
              <div className="text-center space-y-1 z-30">
                <h3 className="font-serif font-bold text-base md:text-lg text-white group-hover:text-accent transition-colors">
                  {celeb.name}
                </h3>
                <p className="font-sans text-[10px] md:text-xs text-text-tertiary uppercase tracking-widest group-hover:text-white/70 transition-colors">
                  {celeb.job}
                </p>
              </div>

            </div>
          ))}
        </div>

        {/* Bottom Decoration */}
        <div className="mt-24 flex flex-col items-center gap-4 opacity-30">
             <div className="w-1.5 h-1.5 rotate-45 bg-[#d4af37]" />
             <div className="h-12 w-px bg-gradient-to-b from-[#d4af37] to-transparent" />
             <span className="font-cinzel text-[10px] tracking-[0.5em] text-[#d4af37]">FINIS LISTAE</span>
        </div>

      </div>
    </div>
  );
}
