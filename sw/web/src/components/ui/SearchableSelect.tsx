"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { ChevronDown, X } from "lucide-react";
import { Z_INDEX } from "@/constants/zIndex";

export interface SelectOption {
  value: string;
  label: string;
}

interface SearchableSelectProps {
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export default function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = "선택",
  disabled = false,
  className = "",
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  const filteredOptions = useMemo(() => {
    if (!search.trim()) return options;
    const query = search.toLowerCase();
    return options.filter((opt) => opt.label.toLowerCase().includes(query));
  }, [options, search]);

  // 외부 클릭 시 닫기
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setSearch("");
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (optionValue: string) => {
    onChange(optionValue);
    setIsOpen(false);
    setSearch("");
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange("");
    setSearch("");
  };

  const handleInputClick = () => {
    if (disabled) return;
    setIsOpen(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* 트리거 */}
      <div
        onClick={handleInputClick}
        className={`
          flex items-center gap-2 w-full h-10 bg-black/30 border border-accent/20 rounded-sm px-3 cursor-pointer
          ${disabled ? "opacity-50 cursor-not-allowed" : "hover:border-accent/40"}
          ${isOpen ? "border-accent/50" : ""}
        `}
      >
        {isOpen ? (
          <input
            ref={inputRef}
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={selectedOption?.label || placeholder}
            className="flex-1 bg-transparent text-sm text-text-primary outline-none placeholder:text-text-secondary/50"
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span className={`flex-1 text-sm ${selectedOption ? "text-text-primary" : "text-text-secondary/50"}`}>
            {selectedOption?.label || placeholder}
          </span>
        )}
        {value && !disabled ? (
          <button type="button" onClick={handleClear} className="p-0.5 text-text-secondary hover:text-text-primary">
            <X size={14} />
          </button>
        ) : (
          <ChevronDown size={14} className={`text-text-secondary ${isOpen ? "rotate-180" : ""}`} />
        )}
      </div>

      {/* 드롭다운 */}
      {isOpen && (
        <div
          className="absolute top-full left-0 right-0 mt-1 bg-bg-secondary border border-accent/20 rounded-sm shadow-xl max-h-60 overflow-y-auto py-1 animate-fade-in"
          style={{ zIndex: Z_INDEX.dropdown }}
        >
          {filteredOptions.length === 0 ? (
            <div className="px-3 py-2 text-sm text-text-secondary">검색 결과 없음</div>
          ) : (
            filteredOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => handleSelect(option.value)}
                className={`
                  w-full text-left px-3 py-2 text-sm transition-colors
                  ${value === option.value ? "bg-accent/10 text-accent" : "text-text-secondary hover:bg-white/5 hover:text-text-primary"}
                `}
              >
                {option.label}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
