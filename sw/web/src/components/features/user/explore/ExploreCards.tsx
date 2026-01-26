/*
  파일명: /components/features/explore/components/ExploreCards.tsx
  기능: 탐색 페이지용 카드 컴포넌트 모음
  책임: 아바타, 유저 카드, 유사 유저 카드, 빈 상태 UI 제공
*/ // ------------------------------
import { Button, Avatar } from "@/components/ui";
import { getCelebProfessionLabel } from "@/constants/celebProfessions";

interface UserInfo {
  id: string;
  nickname: string;
  avatar_url: string | null;
  content_count: number;
  profession?: string | null;
  title?: string | null;  // 수식어 (예: 테슬라 창립자)
  is_verified?: boolean;
}

interface SimilarUserInfo {
  id: string;
  nickname: string;
  avatar_url: string | null;
  content_count: number;
  overlap_count: number;
  similarity: number;
}

export function UserCard({ user, onClick, showProfession }: { user: UserInfo; onClick: () => void; showProfession?: boolean }) {
  return (
    <Button unstyled onClick={onClick} className="flex flex-col items-center group">
      <Avatar url={user.avatar_url} name={user.nickname} size="md" verified={user.is_verified} className="group-hover:ring-accent" />
      <span className="mt-2 text-xs font-medium text-text-secondary group-hover:text-accent truncate max-w-full">{user.nickname}</span>
      {showProfession && user.title && (
        <span className="text-[10px] text-accent truncate max-w-full">{user.title}</span>
      )}
      {showProfession && user.profession && (
        <span className="text-[9px] text-text-tertiary/70 truncate max-w-full">{getCelebProfessionLabel(user.profession)}</span>
      )}
    </Button>
  );
}

export function SimilarUserCard({ user, onClick }: { user: SimilarUserInfo; onClick: () => void }) {
  return (
    <Button unstyled onClick={onClick} className="flex flex-col items-center group">
      <Avatar url={user.avatar_url} name={user.nickname} size="md" className="group-hover:ring-accent" />
      <span className="mt-2 text-xs font-medium text-text-secondary group-hover:text-accent truncate max-w-full">{user.nickname}</span>
      {user.overlap_count > 0 && <span className="text-[10px] text-accent font-serif">{user.overlap_count} Bonds</span>}
    </Button>
  );
}

/**
 * 모바일 최적화: 유저 리스트 아이템 (컴팩트 버전)
 * 그리드가 너무 좁아지는 모바일 환경에서 가로형 리스트로 대응
 */
export function MobileUserListItem({ user, onClick, subtext }: { user: UserInfo; onClick: () => void; subtext?: string }) {
  return (
    <Button 
      unstyled 
      onClick={onClick} 
      className="w-full flex items-center justify-between px-2.5 py-3.5 sm:p-4 bg-bg-card border-2 border-accent-dim/10 rounded-sm active:bg-accent/5 transition-all shadow-md group relative overflow-hidden"
    >
      {/* Subtle background ornament for mobile list item */}
      <div className="absolute top-0 right-0 w-24 h-full bg-gradient-to-l from-accent/[0.03] to-transparent pointer-events-none" />
      
      <div className="flex items-center gap-3 text-left min-w-0 relative z-10">
        <div className="relative">
           <Avatar url={user.avatar_url} name={user.nickname} size="sm" verified={user.is_verified} />
           {/* Portico-style mini accent */}
           <div className="absolute -top-1 -left-1 w-2 h-2 border-t border-s border-accent/40 rounded-tl-sm" />
        </div>
        <div className="flex flex-col min-w-0">
          <span className="text-xs font-serif font-black text-text-primary group-hover:text-accent transition-colors truncate">{user.nickname}</span>
          {subtext ? (
            <span className="text-[10px] text-accent/60 font-serif font-black tracking-widest uppercase opacity-80 truncate">{subtext}</span>
          ) : (user.title || user.profession) ? (
            <div className="flex items-center gap-1">
              {user.title && <span className="text-[10px] text-accent font-serif truncate">{user.title}</span>}
              {user.title && user.profession && <span className="text-[9px] text-text-tertiary/40">|</span>}
              {user.profession && <span className="text-[9px] text-text-tertiary/70 font-serif truncate">{getCelebProfessionLabel(user.profession)}</span>}
            </div>
          ) : null}
        </div>
      </div>
      
      <div className="text-accent opacity-30 shrink-0 ml-3 group-hover:opacity-100 group-hover:translate-x-1 transition-all">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="square">
          <path d="M9 18l6-6-6-6" />
        </svg>
      </div>
    </Button>
  );
}

export function EmptyState({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="text-center py-8">
      <div className="text-text-tertiary mb-2 flex justify-center">{icon}</div>
      <p className="text-sm font-medium text-text-secondary">{title}</p>
      <p className="text-xs text-text-tertiary mt-0.5">{description}</p>
    </div>
  );
}
