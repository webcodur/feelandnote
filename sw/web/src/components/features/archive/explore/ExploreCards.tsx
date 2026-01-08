/*
  파일명: /components/features/explore/components/ExploreCards.tsx
  기능: 탐색 페이지용 카드 컴포넌트 모음
  책임: 아바타, 유저 카드, 유사 유저 카드, 빈 상태 UI 제공
*/ // ------------------------------
import { CheckCircle } from "lucide-react";
import Button from "@/components/ui/Button";

interface UserInfo {
  id: string;
  nickname: string;
  avatar_url: string | null;
  content_count: number;
  category?: string | null;
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

export function Avatar({ url, name, size = "md", verified, className = "" }: {
  url: string | null; name: string; size?: "sm" | "md" | "lg" | "xl"; verified?: boolean; className?: string
}) {
  const sizeClasses = { sm: "w-10 h-10 text-sm", md: "w-12 h-12 text-lg", lg: "w-14 h-14 text-xl", xl: "w-16 h-16 text-2xl" };

  return (
    <div className="relative">
      {url ? (
        <img src={url} alt={name} className={`${sizeClasses[size]} rounded-full object-cover ring-2 ring-accent/20 ${className}`} />
      ) : (
        <div className={`${sizeClasses[size]} rounded-full flex items-center justify-center font-bold text-white ring-2 ring-accent/20 ${className}`} style={{ background: "linear-gradient(135deg, #8b5cf6, #ec4899)" }}>
          {name.charAt(0).toUpperCase()}
        </div>
      )}
      {verified && <CheckCircle size={size === "xl" ? 20 : size === "lg" ? 18 : 14} className="absolute -bottom-0.5 -end-0.5 text-accent bg-surface rounded-full" />}
    </div>
  );
}

export function UserCard({ user, onClick, showCategory }: { user: UserInfo; onClick: () => void; showCategory?: boolean }) {
  return (
    <Button unstyled onClick={onClick} className="flex flex-col items-center group">
      <Avatar url={user.avatar_url} name={user.nickname} size="md" verified={user.is_verified} className="group-hover:ring-accent" />
      <span className="mt-2 text-xs font-medium text-text-secondary group-hover:text-accent truncate max-w-full">{user.nickname}</span>
      {showCategory && user.category && <span className="text-[10px] text-text-tertiary">{user.category}</span>}
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
