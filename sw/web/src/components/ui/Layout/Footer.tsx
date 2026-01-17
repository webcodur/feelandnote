"use client";

import Link from "next/link";
import { FlaskConical } from "lucide-react";

export default function Footer() {
  return (
    <footer className="w-full py-6 mt-20 border-t border-[#d4af37]/20 bg-[#050505] text-[#808080] text-sm">
      <div className="container mx-auto px-6 flex justify-between items-center">
        <div className="font-serif opacity-60">
          &copy; {new Date().getFullYear()} Feel&Note. All rights reserved.
        </div>
        
        {/* Lab Link (Right Corner) */}
        <Link 
          href="/lab" 
          className="flex items-center gap-2 opacity-30 hover:opacity-100 transition-opacity duration-200"
          title="Component Lab"
        >
          <FlaskConical size={14} />
          <span className="text-xs font-cinzel">RAD LAB</span>
        </Link>
      </div>
    </footer>
  );
}
