"use client";

import { useState, useRef, useEffect, MouseEvent, TouchEvent } from "react";
import { Star } from "lucide-react";

interface StarRatingInputProps {
  value: number;
  onChange?: (value: number) => void;
  max?: number;
  size?: number;
  readOnly?: boolean;
  className?: string;
  disabled?: boolean;
}

// 별 하나의 채움 상태 계산
function getStarFill(starIndex: number, value: number): "full" | "half" | "empty" {
  const starValue = starIndex + 1;
  if (value >= starValue) return "full";
  if (value >= starValue - 0.5) return "half";
  return "empty";
}

export default function StarRatingInput({
  value,
  onChange,
  max = 5,
  size = 24,
  readOnly = false,
  disabled = false,
  className = "",
}: StarRatingInputProps) {
  const [hoverValue, setHoverValue] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // 현재 표시할 값 (호버 중이면 호버 값, 아니면 실제 값)
  const displayValue = hoverValue !== null ? hoverValue : value;
  const isInteractive = !readOnly && !disabled;

  const calculateRating = (clientX: number) => {
    if (!containerRef.current) return 0;
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    
    // 전체 너비 대비 비율
    let ratio = x / rect.width;
    ratio = Math.max(0, Math.min(1, ratio));
    
    // 0.5 단위로 계산 (Ceil 사용: 해당 영역 터치시 바로 그 값)
    // 예: 0.1(첫 별의 절반) -> 0.5
    // 예: 0.2(첫 별의 끝) -> 1.0
    const rating = Math.ceil(ratio * max * 2) / 2;
    
    return Math.max(0.5, rating); // 최소 0.5점 보장
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isInteractive) return;
    const newValue = calculateRating(e.clientX);
    setHoverValue(newValue);
  };

  const handleMouseLeave = () => {
    if (!isInteractive) return;
    setHoverValue(null);
  };

  const handleClick = (e: MouseEvent) => {
    if (!isInteractive) return;
    const newValue = calculateRating(e.clientX);
    onChange?.(newValue);
  };
  
  // 터치 지원
  const handleTouchMove = (e: TouchEvent) => {
    if (!isInteractive) return;
    const newValue = calculateRating(e.touches[0].clientX);
    setHoverValue(newValue);
  };

  const handleTouchEnd = (e: TouchEvent) => {
    if (!isInteractive) return;
    // 터치 끝났을 때 마지막 위치 기준으로 값 설정
    // 주의: touchend에는 touches가 없음. changedTouches 사용
    const newValue = calculateRating(e.changedTouches[0].clientX);
    setHoverValue(null);
    onChange?.(newValue);
  };

  return (
    <div 
      ref={containerRef}
      className={`flex items-center gap-1 select-none ${isInteractive ? 'cursor-pointer' : 'cursor-default'} ${disabled ? 'opacity-50' : ''} ${className}`}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {Array.from({ length: max }).map((_, i) => {
        const fill = getStarFill(i, displayValue);
        
        return (
          <div key={i} className="relative" style={{ width: size, height: size }}>
            {/* 배경 별 (빈 별) */}
            <Star 
              size={size} 
              className="absolute inset-0 text-text-tertiary/20" 
              strokeWidth={1.5} 
            />
            
            {/* 채워진 별 / 반 별 */}
            {fill !== 'empty' && (
              <div 
                className="absolute inset-0 overflow-hidden"
                style={{ width: fill === 'full' ? '100%' : '50%' }}
              >
                <Star 
                  size={size} 
                  className={`fill-accent text-accent ${fill === 'full' ? 'shadow-[0_0_12px_rgba(212,175,55,0.4)]' : ''}`}
                  strokeWidth={1.5} 
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
