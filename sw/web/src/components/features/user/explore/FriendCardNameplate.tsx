/*
  친구용 명판 카드
  - 가로형 레이아웃
  - 좌측에 원형 아바타
  - 중앙에 명판 스타일 정보 (닉네임)
  - 우측에 기록 수 세로 배치
*/
"use client";

interface FriendInfo {
  id: string;
  nickname: string;
  avatar_url: string | null;
  content_count: number;
}

interface FriendCardNameplateProps {
  friend: FriendInfo;
  onClick: () => void;
}

export default function FriendCardNameplate({ friend, onClick }: FriendCardNameplateProps) {
  return (
    <button
      onClick={onClick}
      className="group relative w-full bg-gradient-to-r from-neutral-900 via-neutral-800 to-neutral-900 border border-accent-dim/30 hover:border-accent/50 transition-colors duration-300 cursor-pointer overflow-hidden"
    >
      {/* 배경 장식 - 미묘한 패턴 */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-accent to-transparent" />
        <div className="absolute bottom-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-accent to-transparent" />
      </div>

      <div className="relative flex items-center gap-4 p-4">
        {/* 좌측 아바타 */}
        <div className="relative shrink-0">
          <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-accent-dim/50 group-hover:border-accent transition-colors">
            {friend.avatar_url ? (
              <img
                src={friend.avatar_url}
                alt={friend.nickname}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-neutral-800">
                <span className="text-lg text-white/30 font-serif">{friend.nickname[0]}</span>
              </div>
            )}
          </div>
          {/* 아바타 장식 링 */}
          <div className="absolute -inset-1 rounded-full border border-accent/20 group-hover:border-accent/40 transition-colors" />
        </div>

        {/* 중앙 정보 - 명판 스타일 */}
        <div className="flex-1 min-w-0 text-left">
          <h3 className="font-serif font-bold text-white text-base leading-tight truncate group-hover:text-accent transition-colors">
            {friend.nickname}
          </h3>
          <p className="text-[10px] text-text-tertiary mt-0.5">
            친구
          </p>
        </div>

        {/* 우측 기록 수 - 세로 배치 */}
        <div className="shrink-0 flex flex-col items-center justify-center px-3 border-l border-accent-dim/30">
          <span className="text-xl font-serif font-bold text-accent leading-none">
            {friend.content_count || 0}
          </span>
          <span className="text-[8px] text-text-tertiary uppercase tracking-wider mt-1">
            기록
          </span>
        </div>
      </div>

      {/* 호버 시 글로우 효과 */}
      <div className="absolute inset-0 bg-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
    </button>
  );
}
