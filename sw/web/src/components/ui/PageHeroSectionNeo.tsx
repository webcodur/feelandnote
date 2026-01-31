/*
  파일명: /components/ui/PageHeroSectionNeo.tsx
  기능: Neo-Pantheon 스타일의 웅장한 페이지 헤더
  책임: 신전의 권위와 현대적인 세련미를 결합한 헤더를 렌더링한다.
*/ // ------------------------------

import { cn } from "@/lib/utils";
import { Crown } from "lucide-react";

interface PageHeroSectionNeoProps {
  englishTitle: string;
  title: string;
  description?: string;
  className?: string;
}

export default function PageHeroSectionNeo({
  englishTitle,
  title,
  description,
  className,
}: PageHeroSectionNeoProps) {
  return (
    <div className={cn("relative flex flex-col items-center justify-center py-20 md:py-32 px-4 overflow-hidden", className)}>
      {/* Background Ambience */}
      <div className="absolute inset-0 pointer-events-none select-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-accent/5 blur-[100px] rounded-full" />
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,transparent_0%,#050505_100%)] opacity-80" />
      </div>

      <div className="relative z-10 flex flex-col items-center text-center space-y-6 md:space-y-8">
        
        {/* Top Ornament */}
        <div className="flex flex-col items-center gap-2 opacity-80">
           <Crown size={16} className="text-accent/60" strokeWidth={1.5} />
           <div className="h-8 w-px bg-gradient-to-b from-accent/0 via-accent/50 to-accent/0" />
        </div>

        {/* Titles */}
        <div className="flex flex-col items-center gap-2 md:gap-4">
          <span className="font-cinzel text-xs md:text-sm text-accent tracking-[0.6em] md:tracking-[0.8em] uppercase ml-1 animate-fade-in">
            {englishTitle}
          </span>
          
          <h1 className="relative font-serif font-black text-4xl md:text-6xl lg:text-7xl text-text-primary tracking-tight leading-tight">
            <span className="absolute -inset-1 blur-2xl bg-accent/10 rounded-full opacity-50" />
            <span className="relative bg-gradient-to-b from-[#fff] via-[#e0e0e0] to-[#999] bg-clip-text text-transparent drop-shadow-2xl">
              {title}
            </span>
          </h1>
        </div>

        {/* Divider & Description */}
        <div className="flex flex-col items-center gap-6 max-w-2xl">
          {/* Stylized Divider (Meander-like abstract) */}
          <div className="flex items-center gap-4 w-full justify-center opacity-40">
            <div className="h-px w-16 md:w-32 bg-gradient-to-r from-transparent via-accent to-transparent" />
            <div className="w-1.5 h-1.5 rotate-45 border border-accent" />
            <div className="h-px w-16 md:w-32 bg-gradient-to-r from-transparent via-accent to-transparent" />
          </div>

          {description && (
             <p className="font-sans text-sm md:text-base text-text-secondary/80 leading-relaxed max-w-lg break-keep keep-all">
               {description}
             </p>
          )}
        </div>
      </div>
    </div>
  );
}
