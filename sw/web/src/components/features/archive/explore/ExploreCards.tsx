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
      {showProfession && user.profession && (
        <span className="text-[10px] text-text-tertiary">{getCelebProfessionLabel(user.profession)}</span>
      )}
    </Button>
  );
}

export function SimilarUserCard({ user, onClick }: { user: SimilarUserInfo; onClick: () => void }) {
  return (
    <Button unstyled onClick={onClick} className="flex flex-col items-center group">
      <Avatar url={user.avatar_url} name={user.nickname} size="md" className="group-hover:ring-accent" />
      <span className="mt-2 text-xs font-medium text-text-secondary group-hover:text-accent truncate max-w-full">{user.nickname}</span>
      {user.overlap_count > 0 && <span className="text-[10px] text-accent">{user.overlap_count}개 공통</span>}
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
