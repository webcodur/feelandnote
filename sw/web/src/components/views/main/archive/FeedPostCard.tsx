"use client";

import { Heart, MessageCircle } from "lucide-react";
import { Card } from "@/components/ui";

interface FeedPostCardProps {
  user: string;
  avatar: string;
  time: string;
  content: string;
  likes: number;
  comments: number;
  rating?: string;
  progress?: string;
  type?: string;
  typeClass?: string;
  title?: string;
}

export default function FeedPostCard({
  user,
  avatar,
  time,
  content,
  likes,
  comments,
  rating,
  progress,
  type,
  typeClass,
  title,
}: FeedPostCardProps) {
  return (
    <Card className="p-0">
      <div className="p-2.5 flex items-center gap-2 border-b border-white/5">
        <div className="w-8 h-8 rounded-full text-lg flex items-center justify-center bg-bg-secondary">
          {avatar}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-medium text-xs">{user}</div>
          <div className="text-[10px] text-text-secondary flex gap-1.5 items-center">
            {type && typeClass && (
              <span className={`py-0.5 px-1.5 rounded text-[9px] font-medium ${typeClass}`}>
                {type}
              </span>
            )}
            <span>{time}</span>
          </div>
        </div>
        {rating && <div className="text-yellow-400 text-xs">{rating}</div>}
        {progress && <span className="text-[10px] text-accent font-medium">{progress}</span>}
      </div>
      <div className="p-2.5">
        {title && <h4 className="font-medium text-xs mb-1">{title}</h4>}
        <div className="text-xs leading-relaxed text-text-secondary line-clamp-2">{content}</div>
      </div>
      <div className="px-2.5 py-2 border-t border-white/5 flex gap-3 text-[10px] text-text-secondary">
        <span className="flex items-center gap-1">
          <Heart size={12} /> {likes}
        </span>
        <span className="flex items-center gap-1">
          <MessageCircle size={12} /> {comments}
        </span>
      </div>
    </Card>
  );
}
