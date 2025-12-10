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

  const heightClass = height === "sm" ? "h-1" : "h-1.5";
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

  return (
    <div
      className={`relative group ${className}`}
      ref={sliderRef}
      onClick={handleClick}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onTouchStart={handleMouseDown}
      onTouchEnd={handleMouseUp}
      style={{ cursor: "pointer", padding: "8px 0" }}
    >
      {/* Background track */}
      <div className={`w-full ${heightClass} bg-white/10 rounded-full overflow-hidden`}>
        <div
          className="h-full bg-accent transition-all duration-75"
          style={{ width: `${displayValue}%` }}
        />
      </div>

      {/* Custom thumb (visible on hover/drag) */}
      <div
        className={`absolute top-1/2 -translate-y-1/2 ${thumbSize} bg-accent rounded-full shadow-lg transition-opacity duration-200 pointer-events-none ${
          isDragging ? "opacity-100 scale-110" : "opacity-0 group-hover:opacity-100"
        }`}
        style={{ left: `calc(${displayValue}% - ${height === "sm" ? "6px" : "8px"})` }}
      />

      {/* Value tooltip on drag */}
      {isDragging && (
        <div
          className="absolute -top-6 px-2 py-0.5 bg-bg-card border border-border rounded text-xs text-text-primary pointer-events-none transform -translate-x-1/2"
          style={{ left: `${displayValue}%` }}
        >
          {displayValue}%
        </div>
      )}
    </div>
  );
}
