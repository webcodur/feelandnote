"use client";

import { useState, useCallback, useRef } from "react";

interface ProgressSliderProps {
  value: number;
  onChange: (value: number) => void;
  className?: string;
  height?: "sm" | "md";
}

export default function ProgressSlider({
  value,
  onChange,
  className = "",
  height = "sm",
}: ProgressSliderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [localValue, setLocalValue] = useState(value);
  const sliderRef = useRef<HTMLDivElement>(null);

  const heightClass = height === "sm" ? "h-1" : "h-1.5";
  const thumbSize = height === "sm" ? "w-3 h-3" : "w-4 h-4";

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = Number(e.target.value);
      setLocalValue(newValue);
    },
    []
  );

  const handleMouseUp = useCallback(() => {
    if (isDragging) {
      setIsDragging(false);
      onChange(localValue);
    }
  }, [isDragging, localValue, onChange]);

  const handleMouseDown = useCallback(() => {
    setIsDragging(true);
  }, []);

  // 클릭 시 바로 반영
  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLInputElement>) => {
      const input = e.target as HTMLInputElement;
      const newValue = Number(input.value);
      setLocalValue(newValue);
      onChange(newValue);
    },
    [onChange]
  );

  const displayValue = isDragging ? localValue : value;

  return (
    <div
      className={`relative group ${className}`}
      ref={sliderRef}
      onClick={(e) => e.preventDefault()}
    >
      {/* Background track */}
      <div className={`w-full ${heightClass} bg-white/10 rounded-full overflow-hidden`}>
        <div
          className="h-full bg-accent transition-all duration-75"
          style={{ width: `${displayValue}%` }}
        />
      </div>

      {/* Range input (invisible but interactive) */}
      <input
        type="range"
        min={0}
        max={100}
        value={displayValue}
        onChange={handleChange}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onTouchStart={handleMouseDown}
        onTouchEnd={handleMouseUp}
        onClick={handleClick}
        className="absolute inset-0 w-full opacity-0 cursor-pointer"
        style={{ height: "100%" }}
      />

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
          className="absolute -top-8 px-2 py-1 bg-bg-card border border-border rounded text-xs text-text-primary pointer-events-none transform -translate-x-1/2"
          style={{ left: `${displayValue}%` }}
        >
          {displayValue}%
        </div>
      )}
    </div>
  );
}
