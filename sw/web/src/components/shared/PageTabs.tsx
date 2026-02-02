"use client";

import Link from "next/link";

interface TabItem {
  label: string;
  href: string;
  value: string;
  // Icon property is intentionally ignored if present
  [key: string]: any;
}

interface PageTabsProps {
  tabs: readonly TabItem[] | TabItem[];
  activeTabValue: string;
  className?: string;
}

export default function PageTabs({ tabs, activeTabValue, className = "" }: PageTabsProps) {
  return (
    <div className={`w-full mb-10 ${className}`}>
      {/* Container with bottom border */}
      <div className="relative border-b border-accent/20">
        
        {/* Scrollable Area */}
        <div className="flex items-center justify-start md:justify-center gap-1 sm:gap-4 overflow-x-auto scrollbar-hidden px-2 pb-[1px]">
          {tabs.map((tab) => {
            const isActive = activeTabValue === tab.value;
            
            return (
              <Link
                key={tab.value}
                href={tab.href}
                className={`
                  relative px-3 sm:px-6 py-3 group whitespace-nowrap select-none
                `}
              >
                {/* Text Content */}
                <span className={`
                  font-serif text-sm sm:text-base tracking-wide transition-all duration-300
                  ${isActive
                    ? "text-accent font-bold drop-shadow-[0_0_15px_rgba(212,175,55,0.4)]"
                    : "text-stone-500 font-medium group-hover:text-stone-300"
                  }
                `}>
                  {tab.label}
                </span>

                {/* Active Indicator (Glowing Line) */}
                {isActive && (
                  <>
                    <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-accent shadow-[0_0_10px_#d4af37]" />
                    {/* Active Gradient Shine */}
                    <div className="absolute inset-0 bg-gradient-to-t from-accent/5 to-transparent opacity-100" />
                  </>
                )}

                {/* Hover Indicator (Subtle Line) */}
                {!isActive && (
                  <div className="absolute bottom-0 left-1/2 right-1/2 h-[1px] bg-stone-600 opacity-0 group-hover:opacity-100 group-hover:left-4 group-hover:right-4 transition-all duration-300" />
                )}
              </Link>
            );
          })}
        </div>
        
        {/* Decorative corner accents on the border line */}
        <div className="absolute bottom-[-2px] left-0 w-1 h-1 bg-accent/40 rounded-full" />
        <div className="absolute bottom-[-2px] right-0 w-1 h-1 bg-accent/40 rounded-full" />
      </div>
    </div>
  );
}
