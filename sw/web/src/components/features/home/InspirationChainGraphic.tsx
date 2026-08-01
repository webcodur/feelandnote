"use client";

import { ArrowDown, ArrowRight } from "lucide-react";
import Avatar from "@/components/ui/Avatar";
import { renderHighlighted } from "./IntroFrame";

interface ProfileInfo {
  name: string;
  avatar_url: string | null;
}

interface ChainStep {
  text: string;
  reader: ProfileInfo | null;
  author: ProfileInfo | null;
}

interface InspirationChainGraphicProps {
  chains: ChainStep[][];
  conclusion: string;
}

export default function InspirationChainGraphic({ chains, conclusion }: InspirationChainGraphicProps) {
  return (
    <div className="w-full flex flex-col gap-6 md:gap-8">
      {/* Chains container - side-by-side on md, stacked on mobile */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
        {chains.map((chain, chainIdx) => (
          <div key={chainIdx} className="flex flex-col items-center">
            {chain.map((step, stepIdx) => {
              const isLast = stepIdx === chain.length - 1;
              return (
                <div key={stepIdx} className="flex flex-col items-center w-full group">
                  {/* Card */}
                  <div className="w-full relative px-4 py-3 bg-white/5 border border-white/10 rounded-xl shadow-lg transition-all duration-200 text-center flex flex-col items-center gap-2 group-hover:bg-white/10 group-hover:border-accent/30">
                    
                    {/* Avatars */}
                    {(step.reader || step.author) && (
                      <div className="flex items-center gap-1.5 sm:gap-2 bg-black/20 px-3 py-1.5 rounded-full border border-white/5">
                        {step.reader && (
                          <div className="flex items-center gap-1.5">
                            <Avatar url={step.reader.avatar_url} name={step.reader.name} size="sm" />
                          </div>
                        )}
                        
                        {(step.reader && step.author) && (
                          <ArrowRight size={14} className="text-accent/60 flex-shrink-0" />
                        )}

                        {step.author && (
                          <div className="flex items-center gap-1.5">
                            <Avatar url={step.author.avatar_url} name={step.author.name} size="sm" />
                          </div>
                        )}
                      </div>
                    )}

                    {/* Text */}
                    <div className="leading-relaxed text-[14.5px] md:text-[15px] font-light break-keep text-text-primary/90 mt-1">
                      {renderHighlighted(step.text)}
                    </div>
                  </div>
                  
                  {/* Connector (Arrow) */}
                  {!isLast && (
                    <div className="flex flex-col items-center h-6 md:h-8 w-full relative">
                      <div className="w-[1px] h-full bg-gradient-to-b from-accent/50 to-transparent" />
                      <ArrowDown size={14} className="text-accent/60 absolute bottom-0 translate-y-1/2" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Conclusion box */}
      <div className="w-full flex justify-center">
        <div className="px-5 py-3 md:py-4 bg-accent/10 border border-accent/20 rounded-xl text-center shadow-[0_0_20px_rgba(212,175,55,0.1)] max-w-2xl w-full">
          <p className="text-[15px] md:text-[15.5px] text-text-primary leading-relaxed font-medium tracking-wide">
            {conclusion}
          </p>
        </div>
      </div>
    </div>
  );
}
