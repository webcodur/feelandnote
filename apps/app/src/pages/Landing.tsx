import React, { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Film, Music, Palette, ChevronLeft, ChevronRight } from 'lucide-react';

export const Landing: React.FC = () => {
  const navigate = useNavigate();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  
  // Drag state
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [hasDragged, setHasDragged] = useState(false);

  const contentTypes = [
    {
      id: 'books',
      title: 'Books',
      titleKo: '도서',
      description: '읽은 책과 읽고 싶은 책을 기록하고 관리하세요',
      icon: BookOpen,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      hoverBorder: 'hover:border-blue-300',
      path: '/books',
      active: true,
    },
    {
      id: 'movies',
      title: 'Movies',
      titleKo: '영화',
      description: '본 영화와 보고 싶은 영화를 기록하고 관리하세요',
      icon: Film,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-200',
      hoverBorder: 'hover:border-purple-300',
      path: '/movies',
      active: false,
    },
    {
      id: 'performances',
      title: 'Performances',
      titleKo: '공연',
      description: '본 공연과 보고 싶은 공연을 기록하고 관리하세요',
      icon: Music,
      color: 'text-pink-600',
      bgColor: 'bg-pink-50',
      borderColor: 'border-pink-200',
      hoverBorder: 'hover:border-pink-300',
      path: '/performances',
      active: false,
    },
    {
      id: 'art',
      title: 'Art',
      titleKo: '미술',
      description: '본 전시와 보고 싶은 전시를 기록하고 관리하세요',
      icon: Palette,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      borderColor: 'border-orange-200',
      hoverBorder: 'hover:border-orange-300',
      path: '/art',
      active: false,
    },
  ];

  const scroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = 320; // card width + gap
      const newScrollLeft = direction === 'left' 
        ? scrollContainerRef.current.scrollLeft - scrollAmount
        : scrollContainerRef.current.scrollLeft + scrollAmount;
      
      scrollContainerRef.current.scrollTo({
        left: newScrollLeft,
        behavior: 'smooth'
      });
    }
  };

  const handleCardClick = (type: typeof contentTypes[0]) => {
    // 드래그 중이었다면 클릭 이벤트를 무시
    if (hasDragged) {
      return;
    }
    
    if (type.active) {
      navigate(type.path);
    }
  };

  // 드래그 시작
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!scrollContainerRef.current) return;
    
    setIsDragging(true);
    setHasDragged(false);
    setStartX(e.pageX - scrollContainerRef.current.offsetLeft);
    setScrollLeft(scrollContainerRef.current.scrollLeft);
    
    // 드래그 중에는 snap 비활성화하고 커서 변경
    scrollContainerRef.current.style.scrollSnapType = 'none';
    scrollContainerRef.current.style.cursor = 'grabbing';
  };

  // 드래그 중
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !scrollContainerRef.current) return;
    
    e.preventDefault();
    const x = e.pageX - scrollContainerRef.current.offsetLeft;
    const walk = (x - startX) * 2; // 스크롤 속도를 2로 증가
    
    // 일정 거리 이상 드래그했다면 hasDragged를 true로 설정
    if (Math.abs(walk) > 5) {
      setHasDragged(true);
    }
    
    scrollContainerRef.current.scrollLeft = scrollLeft - walk;
  };

  // 드래그 종료
  const handleMouseUp = () => {
    setIsDragging(false);
    
    if (scrollContainerRef.current) {
      // snap 다시 활성화
      scrollContainerRef.current.style.scrollSnapType = 'x mandatory';
      scrollContainerRef.current.style.cursor = 'grab';
    }
    
    // hasDragged 상태는 즉시 리셋하지 않고 약간의 딜레이 후 리셋
    setTimeout(() => {
      setHasDragged(false);
    }, 100);
  };

  // 마우스가 컨테이너를 벗어났을 때
  const handleMouseLeave = () => {
    if (isDragging) {
      setIsDragging(false);
      if (scrollContainerRef.current) {
        scrollContainerRef.current.style.scrollSnapType = 'x mandatory';
        scrollContainerRef.current.style.cursor = 'grab';
      }
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="max-w-7xl mx-auto px-6 pt-20 pb-32">
        {/* Title Section */}
        <div className="text-center mb-20">
          <h1 className="text-6xl md:text-7xl font-bold text-gray-900 mb-6 tracking-tight">
            FeelNNote
          </h1>
          <p className="text-xl md:text-2xl text-gray-600 mb-3 font-light">
            당신의 문화 생활을 기록하고 공유하세요
          </p>
          <p className="text-base text-gray-500 max-w-xl mx-auto">
            다양한 문화 콘텐츠에 대한 감상을 기록하고, 나만의 아카이브를 만들어보세요
          </p>
        </div>

        {/* Content Categories Slider */}
        <div className="relative mb-24">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">콘텐츠 카테고리</h2>
            <p className="text-sm text-gray-500">관심있는 카테고리를 선택하세요</p>
          </div>

          {/* Scroll Buttons */}
          <button
            onClick={() => scroll('left')}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-white border border-gray-200 rounded-full shadow-lg flex items-center justify-center hover:bg-gray-50 transition-colors"
            aria-label="Scroll left"
          >
            <ChevronLeft className="w-5 h-5 text-gray-600" />
          </button>

          <button
            onClick={() => scroll('right')}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-white border border-gray-200 rounded-full shadow-lg flex items-center justify-center hover:bg-gray-50 transition-colors"
            aria-label="Scroll right"
          >
            <ChevronRight className="w-5 h-5 text-gray-600" />
          </button>

          {/* Slider Container */}
          <div 
            ref={scrollContainerRef}
            className="flex gap-6 overflow-x-auto scrollbar-hide px-12 py-4 snap-x snap-mandatory select-none"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', cursor: 'grab' }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseLeave}
          >
            {contentTypes.map((type) => {
              const Icon = type.icon;
              return (
                <div
                  key={type.id}
                  onClick={() => handleCardClick(type)}
                  className={`flex-shrink-0 w-[300px] snap-center ${
                    type.active 
                      ? 'cursor-pointer' 
                      : 'cursor-not-allowed opacity-60'
                  }`}
                >
                  <div className={`relative bg-white border ${type.borderColor} rounded-2xl p-8 h-full transition-all duration-200 ${
                    type.active 
                      ? `hover:shadow-xl ${type.hoverBorder}` 
                      : ''
                  }`}>
                    {/* Coming Soon Badge */}
                    {!type.active && (
                      <div className="absolute top-4 right-4">
                        <span className="px-3 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded-full">
                          Coming Soon
                        </span>
                      </div>
                    )}

                    {/* Icon */}
                    <div className={`mb-6 w-14 h-14 ${type.bgColor} rounded-xl flex items-center justify-center`}>
                      <Icon className={`w-7 h-7 ${type.color}`} strokeWidth={1.5} />
                    </div>

                    {/* Content */}
                    <div className="mb-6">
                      <h3 className="text-2xl font-semibold text-gray-900 mb-1">
                        {type.titleKo}
                      </h3>
                      <p className="text-sm text-gray-500 mb-3">
                        {type.title}
                      </p>
                      <p className="text-gray-600 text-sm leading-relaxed">
                        {type.description}
                      </p>
                    </div>

                    {/* Action Indicator */}
                    {type.active && (
                      <div className="flex items-center text-sm font-medium text-gray-500">
                        시작하기
                        <ChevronRight className="w-4 h-4 ml-1" />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Scroll Hint */}
          <div className="text-center mt-6">
            <p className="text-xs text-gray-400">← 좌우로 드래그하거나 스크롤하여 더 많은 카테고리를 확인하세요 →</p>
          </div>
        </div>

        {/* Feature Highlights */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto border-t border-gray-200 pt-16">
          <div className="text-center">
            <div className="w-12 h-12 bg-gray-100 rounded-xl mx-auto mb-4 flex items-center justify-center">
              <span className="text-2xl">📝</span>
            </div>
            <h4 className="text-gray-900 font-semibold mb-2 text-sm">감상 기록</h4>
            <p className="text-gray-500 text-sm leading-relaxed">
              다양한 문화 콘텐츠에 대한<br />생각을 자유롭게 기록하세요
            </p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 bg-gray-100 rounded-xl mx-auto mb-4 flex items-center justify-center">
              <span className="text-2xl">📚</span>
            </div>
            <h4 className="text-gray-900 font-semibold mb-2 text-sm">나만의 아카이브</h4>
            <p className="text-gray-500 text-sm leading-relaxed">
              나만의 문화 생활 히스토리를<br />한 곳에서 관리하세요
            </p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 bg-gray-100 rounded-xl mx-auto mb-4 flex items-center justify-center">
              <span className="text-2xl">📊</span>
            </div>
            <h4 className="text-gray-900 font-semibold mb-2 text-sm">진행 상황 추적</h4>
            <p className="text-gray-500 text-sm leading-relaxed">
              경험한 콘텐츠와 위시리스트를<br />체계적으로 관리하세요
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-gray-200 bg-gray-50">
        <div className="max-w-6xl mx-auto px-6 py-8 text-center">
          <p className="text-sm text-gray-500">
            © 2024 FeelNNote. All rights reserved.
          </p>
        </div>
      </div>

      {/* Hide scrollbar and optimize scrolling */}
      <style>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          scroll-behavior: smooth;
          -webkit-overflow-scrolling: touch;
        }
      `}</style>
    </div>
  );
};
