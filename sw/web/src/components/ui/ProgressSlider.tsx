/*
  파일명: /components/ui/ProgressSlider.tsx
  기능: 진행도 슬라이더 컴포넌트
  책임: 드래그로 진행도를 조절하는 UI를 제공한다.
*/ // ------------------------------

"use client";

import { useState, useCallback, useRef, useEffect } from "react";

interface ProgressSliderProps {
  value: number;
  onChange: (value: number) => void;
  className?: string;
  height?: "sm" | "md";
  step?: number;
}

export default function ProgressSlider({
  value,
  onChange,
  className = "",
  height = "sm",
  step = 10,
}: ProgressSliderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [localValue, setLocalValue] = useState(value);
  const sliderRef = useRef<HTMLDivElement>(null);

  // step 단위로 스냅
  const snapToStep = useCallback((val: number) => {
    return Math.round(val / step) * step;
  }, [step]);

  // value prop 변경 시 localValue 동기화
  useEffect(() => {
    if (!isDragging) {
      setLocalValue(value);
    }
  }, [value, isDragging]);

  const [isHovered, setIsHovered] = useState(false);
  const heightClass = height === "sm" ? "h-1.5" : "h-2";
  const thumbSize = height === "sm" ? "w-3 h-3" : "w-4 h-4";

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      e.stopPropagation();
      const newValue = Number(e.target.value);
      setLocalValue(newValue);
    },
    []
  );

  const handleMouseDown = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleMouseUp = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    if (isDragging) {
      setIsDragging(false);
      onChange(localValue);
    }
  }, [isDragging, localValue, onChange]);

  // 드래그 중 마우스가 슬라이더 바깥으로 나가도 계속 추적
  useEffect(() => {
    if (!isDragging) return;

    const handleGlobalMouseUp = () => {
      setIsDragging(false);
      onChange(localValue);
    };

    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (!sliderRef.current) return;
      const rect = sliderRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const rawPercent = Math.max(0, Math.min(100, (x / rect.width) * 100));
      const percent = snapToStep(rawPercent);
      setLocalValue(percent);
    };

    const handleGlobalTouchMove = (e: TouchEvent) => {
      if (!sliderRef.current || !e.touches[0]) return;
      const rect = sliderRef.current.getBoundingClientRect();
      const x = e.touches[0].clientX - rect.left;
      const rawPercent = Math.max(0, Math.min(100, (x / rect.width) * 100));
      const percent = snapToStep(rawPercent);
      setLocalValue(percent);
    };

    window.addEventListener("mouseup", handleGlobalMouseUp);
    window.addEventListener("mousemove", handleGlobalMouseMove);
    window.addEventListener("touchend", handleGlobalMouseUp);
    window.addEventListener("touchmove", handleGlobalTouchMove);

    return () => {
      window.removeEventListener("mouseup", handleGlobalMouseUp);
      window.removeEventListener("mousemove", handleGlobalMouseMove);
      window.removeEventListener("touchend", handleGlobalMouseUp);
      window.removeEventListener("touchmove", handleGlobalTouchMove);
    };
  }, [isDragging, localValue, onChange, snapToStep]);

  // 클릭 시 바로 반영
  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      e.stopPropagation();
      if (!sliderRef.current) return;
      const rect = sliderRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const rawPercent = Math.max(0, Math.min(100, (x / rect.width) * 100));
      const percent = snapToStep(rawPercent);
      setLocalValue(percent);
      onChange(percent);
    },
    [onChange, snapToStep]
  );

  const displayValue = localValue;

  const isActive = isHovered || isDragging;

  return (
    <div
      className={`relative ${className}`}
      ref={sliderRef}
      onClick={handleClick}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onTouchStart={handleMouseDown}
      onTouchEnd={handleMouseUp}
      style={{ cursor: isDragging ? "grabbing" : "pointer", padding: "10px 0" }}
    >
      {/* Background track */}
      <div
        className={`w-full rounded-full overflow-hidden ${heightClass} ${
          isActive ? "bg-white/20" : "bg-white/10"
        }`}
      >
        <div
          className={`h-full bg-accent ${
            isDragging ? "brightness-125" : isHovered ? "brightness-110" : ""
          }`}
          style={{ width: `${displayValue}%` }}
        />
      </div>

      {/* Custom thumb - 항상 표시, hover/drag시 강조 */}
      <div
        className={`absolute top-1/2 -translate-y-1/2 rounded-full pointer-events-none ${thumbSize} ${
          isDragging
            ? "bg-white border-2 border-accent shadow-[0_0_8px_rgba(124,77,255,0.6)]"
            : isHovered
            ? "bg-accent border-2 border-white/50"
            : "bg-accent border-0"
        }`}
        style={{
          left: `calc(${displayValue}% - ${height === "sm" ? "6px" : "8px"})`,
        }}
      />

      {/* Value tooltip - hover/drag 시 표시 */}
      {isActive && (
        <div
          className={`absolute px-2 py-1 rounded text-xs font-bold pointer-events-none transform -translate-x-1/2 ${
            isDragging
              ? "-top-8 bg-accent text-white shadow-lg scale-110"
              : "-top-7 bg-bg-card border border-border text-text-primary"
          }`}
          style={{ left: `${displayValue}%` }}
        >
          {displayValue}%
        </div>
      )}
    </div>
  );
}
