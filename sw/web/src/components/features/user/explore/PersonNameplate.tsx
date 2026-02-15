/*
  파일명: /components/features/user/explore/PersonNameplate.tsx
  기능: 인물용 명판 카드 (프리미엄 ID 카드 스타일)
  책임: 유저 정보를 현대적이고 세련된 방식으로 보여준다.
*/
"use client";

import { User, BookOpen, Star } from "lucide-react";

interface PersonInfo {
  id: string;
  nickname: string;
  avatar_url: string | null;
  content_count: number;
  description?: string; // 한줄 소개가 있다면 표시
}

interface Props {
  person: PersonInfo;
  onClick: () => void;
  rank?: number; // 랭킹이나 순서가 있다면 사용
}

export default function PersonNameplate({ person, onClick, rank }: Props) {
  return (
    <button
      onClick={onClick}
      className="group relative w-full aspect-[1.8/1] perspective-1000 outline-none"
    >
      {/* 카드 컨테이너 - 3D 효과 및 호버 인터랙션 */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-md rounded-xl border border-white/10 overflow-hidden transition-all duration-500 ease-out group-hover:scale-[1.02] group-hover:rotate-x-2 shadow-lg group-hover:shadow-xl group-hover:shadow-primary/20">
        
        {/* 배경 장식 요소 */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:bg-primary/30 transition-colors" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-accent/10 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2 group-hover:bg-accent/20 transition-colors" />
        
        {/* 글래스 텍스처 오버레이 */}
        <div className="absolute inset-0 bg-[url('/textures/noise.png')] opacity-[0.03] mix-blend-overlay" />
        
        {/* Shine 효과 */}
        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 ease-in-out z-10" />

        <div className="relative h-full flex flex-col justify-between p-5 z-20">
          
          {/* 상단: 랭크/뱃지 및 아바타 */}
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-2">
              {/* 랭크 표시 (옵션) */}
              {rank && (
                <div className="flex items-center justify-center w-6 h-6 rounded-full bg-accent/10 border border-accent/20 text-[10px] font-bold text-accent">
                  {rank}
                </div>
              )}
              {/* 등급/역할 뱃지 (예시) */}
              <div className="px-2 py-0.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-sm text-[10px] text-white/60">
                MEMBER
              </div>
            </div>

            {/* 아바타 */}
            <div className="relative group-hover:scale-105 transition-transform duration-300">
              <div className="w-12 h-12 rounded-full p-[2px] bg-gradient-to-br from-white/20 to-transparent">
                <div className="w-full h-full rounded-full overflow-hidden bg-black/50">
                   {person.avatar_url ? (
                    <img 
                      src={person.avatar_url} 
                      alt={person.nickname} 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-zinc-800 text-zinc-400">
                      <User size={20} />
                    </div>
                  )}
                </div>
              </div>
              {/* 온라인/상태 표시 (예시) */}
              <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-zinc-900 rounded-full" />
            </div>
          </div>

          {/* 하단: 정보 */}
          <div className="space-y-1 text-left">
            <h3 className="text-lg font-bold text-white tracking-tight group-hover:text-primary transition-colors">
              {person.nickname}
            </h3>
            
            <div className="flex items-center gap-4 text-xs text-white/50">
              <div className="flex items-center gap-1.5 overflow-hidden">
                <BookOpen size={12} className="shrink-0" />
                <span className="truncate">기록 {person.content_count ?? 0}</span>
              </div>
              {/* 추가 정보 (예: 팔로워) */}
              {/* <div className="flex items-center gap-1.5">
                <Users size={12} />
                <span>팔로워 128</span>
              </div> */}
            </div>
          </div>
        </div>
        
        {/* 하단 데코레이션 라인 */}
        <div className="absolute bottom-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-primary/50 to-transparent opacity-50" />
      </div>
    </button>
  );
}
