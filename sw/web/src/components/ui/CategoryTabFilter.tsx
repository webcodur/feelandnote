/*
  파일명: /components/ui/CategoryTabFilter.tsx
  기능: 카테고리 선택 탭 필터
  책임: ChosenSection 스타일의 카테고리 선택 UI를 제공한다.
*/ // ------------------------------

"use client";

import React from "react";

interface CategoryOption<T> {
  value: T;
  label: string;
}

interface CategoryTabFilterProps<T extends string> {
  options: CategoryOption<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}

export function CategoryTabFilter<T extends string>({
  options,
  value,
  onChange,
  className = "",
}: CategoryTabFilterProps<T>) {
  return (
    <div className={`flex justify-center overflow-x-auto pb-4 scrollbar-hidden ${className}`}>
      <div className="inline-flex min-w-max p-1 bg-neutral-900/80 backdrop-blur-md rounded-xl border border-white/10 shadow-inner">
        {options.map((option) => {
          const isActive = value === option.value;
          return (
            <button
              key={option.value}
              onClick={() => onChange(option.value)}
              className={`
                relative px-4 py-2 rounded-lg text-sm font-bold transition-all
                ${isActive
                  ? "text-neutral-900 bg-gradient-to-br from-accent via-yellow-200 to-accent shadow-[0_0_15px_rgba(212,175,55,0.4)]"
                  : "text-text-secondary hover:text-white hover:bg-white/5"
                }
              `}
            >
              <span className={isActive ? "font-serif text-black" : "font-sans"}>
                {option.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
