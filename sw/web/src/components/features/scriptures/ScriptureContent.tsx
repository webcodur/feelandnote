"use client";

import Image from "next/image";
import ScriptureBook from "@/components/features/book/ScriptureBook";
import ScriptureGame from "@/components/features/game/ScriptureGame";

type ScriptureType = "BOOK" | "VIDEO" | "GAME" | "MUSIC" | "CERTIFICATE";

interface ScriptureContentProps {
  type: ScriptureType | string;
  title: string;
  imageUrl: string;
  // Optional extra data that might be needed
  author?: string;
  rating?: number;
}

export default function ScriptureContent({
  type,
  title,
  imageUrl,
  author = "",
}: ScriptureContentProps) {
  switch (type) {
    case "BOOK":
      return (
        <ScriptureBook
          title={title}
          author={author}
          imageUrl={imageUrl}
        />
      );
    case "VIDEO":
    case "MUSIC":
      return (
        <div className="w-full h-full relative">
          <Image
            src={imageUrl}
            alt={title}
            fill
            className="object-cover"
            unoptimized
          />
        </div>
      );
    case "GAME":
      return (
         <ScriptureGame
            title={title}
            imageUrl={imageUrl}
         />
      );
    case "CERTIFICATE":
    default:
      // Fallback or Cert logic
      // For now just image
      return (
        <div className="w-full h-full relative">
           {/* eslint-disable-next-line @next/next/no-img-element */}
           <img src={imageUrl} alt={title} className="w-full h-full object-cover" />
        </div>
      );
  }
}
