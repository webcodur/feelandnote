"use client";

import Link from "next/link";
import { ArrowRight, Megaphone, MessageSquare } from "lucide-react";

const BOARD_PREVIEWS = [
  {
    id: "notice",
    title: "공지사항",
    description: "Feelnnote의 새로운 소식과 업데이트",
    icon: <Megaphone className="text-accent" width={24} height={24} />,
    link: "/board/notice",
  },
  {
    id: "feedback",
    title: "피드백",
    description: "서비스 발전을 위한 여러분의 의견",
    icon: <MessageSquare className="text-blue-400" width={24} height={24} />,
    link: "/board/feedback",
  }
];

export default function BoardPreview() {
  return (
    <div className="w-full">
      <div className="grid grid-cols-2 gap-4 md:gap-6">
        {BOARD_PREVIEWS.map((board) => (
          <Link
            key={board.id}
            href={board.link}
            className="group relative overflow-hidden rounded-xl bg-white/5 border border-white/10 p-4 md:p-6 text-left transition-all duration-300 hover:border-accent hover:bg-white/10 hover:-translate-y-1"
          >
            <div className="flex items-center justify-between mb-3 md:mb-4">
              <div className="p-2 md:p-3 rounded-full bg-white/5 group-hover:bg-accent/10 transition-colors">
                {board.icon}
              </div>
              <ArrowRight size={16} className="text-text-secondary group-hover:text-accent opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0" />
            </div>

            <h3 className="text-base md:text-xl font-serif font-bold text-text-primary mb-1 md:mb-2 group-hover:text-amber-100 transition-colors">
              {board.title}
            </h3>

            <p className="text-xs md:text-sm text-text-secondary line-clamp-2">
              {board.description}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
