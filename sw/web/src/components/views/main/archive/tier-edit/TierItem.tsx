"use client";

interface TierItemProps {
  contentId: string;
  thumbnailUrl?: string | null;
  title: string;
  isDragging: boolean;
  onDragStart: (contentId: string) => void;
  bgFallback?: string;
}

export default function TierItem({ contentId, thumbnailUrl, title, isDragging, onDragStart, bgFallback = "bg-bg-secondary" }: TierItemProps) {
  return (
    <div
      draggable
      onDragStart={() => onDragStart(contentId)}
      className={`w-14 h-14 rounded-lg overflow-hidden cursor-grab active:cursor-grabbing transition-opacity ${
        isDragging ? "opacity-50" : ""
      }`}
    >
      {thumbnailUrl ? (
        <img
          src={thumbnailUrl}
          alt={title}
          className="w-full h-full object-cover"
          title={title}
        />
      ) : (
        <div className={`w-full h-full ${bgFallback} flex items-center justify-center text-xs text-text-secondary`}>
          {title.slice(0, 2)}
        </div>
      )}
    </div>
  );
}
