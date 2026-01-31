"use client";

import Image from "next/image";
import { Gamepad2 } from "lucide-react";

interface ScriptureGameProps {
  title: string;
  imageUrl: string;
  id?: string;
}

export default function ScriptureGame({
  title,
  imageUrl,
  id = "SNES",
}: ScriptureGameProps) {
  return (
    <div className="w-full h-full flex items-center justify-center p-4 bg-slate-900/50">
      {/* Flat Cartridge-style Card */}
      <div className="relative w-full aspect-[4/3] bg-[#ccc] rounded-t-lg rounded-b-[16px] shadow-lg overflow-hidden group transition-transform duration-300">
        
        {/* Header Grip */}
        <div className="h-[20%] bg-gradient-to-b from-[#ddd] to-[#bbb] border-b border-[#999] relative">
            {/* Vents */}
            <div className="absolute top-2 inset-x-8 h-2 flex justify-center gap-1 opacity-30">
                 {[...Array(10)].map((_, i) => <div key={i} className="w-1 bg-black rounded-full" />)}
            </div>
        </div>

        {/* Label Area */}
        <div className="absolute top-[25%] left-[8%] right-[8%] bottom-[8%] bg-[#222] rounded-md overflow-hidden shadow-inner">
           {imageUrl ? (
               <div className="relative w-full h-full">
                  <Image 
                    src={imageUrl} 
                    alt={title} 
                    fill 
                    className="object-cover" 
                    unoptimized 
                    sizes="(max-width: 768px) 100vw, 300px"
                  />
                  {/* Glossy Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/20 to-transparent opacity-40 pointer-events-none" />
               </div>
           ) : (
               <div className="w-full h-full flex flex-col items-center justify-center text-white p-2">
                   <Gamepad2 className="opacity-50 mb-1" size={20} />
                   <span className="text-[10px] font-bold text-center leading-tight">{title}</span>
               </div>
           )}
        </div>
        
        {/* Side ID */}
        {id && (
            <div className="absolute bottom-2 right-2 z-10 hidden sm:block">
                <span className="text-[6px] font-mono text-gray-500 font-bold tracking-tighter">{id}</span>
            </div>
        )}

      </div>
    </div>
  );
}
