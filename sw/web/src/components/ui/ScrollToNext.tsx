"use client";

import { ChevronDown } from "lucide-react";

interface ScrollToNextProps {
  targetId: string;
  className?: string; 
}

export default function ScrollToNext({ targetId, className = "" }: ScrollToNextProps) {
  // react-scroll is not installed per my knowledge, using native scroll for now.
  // Actually, standard anchor link with smooth scroll behavior in CSS (scroll-behavior: smooth) is easiest.
  // But Next.js Link doesn't support hash scroll smoothly by default without config.
  // Let's use a simple onClick handler.

  const scrollToTarget = () => {
    const element = document.getElementById(targetId);
    if (element) {
      const headerOffset = 80; // Approximate header height
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

      window.scrollTo({
        top: offsetPosition,
        behavior: "smooth"
      });
    }
  };

  return (
    <button 
      onClick={scrollToTarget}
      className={`absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-text-tertiary/50 hover:text-accent transition-colors z-20 cursor-pointer animate-bounce-slow ${className}`}
      aria-label="Scroll to next section"
    >
      <span className="text-[10px] font-cinzel tracking-widest uppercase">Scroll</span>
      <ChevronDown size={24} />
    </button>
  );
}
