"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Users,
  Sparkles,
  ChevronRight,
  Star,
  BookOpen,
  Plus,
  CheckCircle,
  UserPlus,
  Info,
} from "lucide-react";
import UserContentGrid from "@/components/features/user/UserContentGrid";
import Button from "@/components/ui/Button";
import { Modal, ModalBody, ModalFooter } from "@/components/ui";
import { createCelebProfile } from "@/actions/celebs";

interface CelebInfo {
  id: string;
  nickname: string;
  avatar_url: string | null;
  content_count: number;
  category?: string | null;
  bio?: string | null;
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

interface UserInfo {
  id: string;
  nickname: string;
  avatar_url: string | null;
  content_count: number;
  type: "friend" | "celeb";
  category?: string | null;
  is_verified?: boolean;
}

interface ExploreViewProps {
  friends: Array<{ id: string; nickname: string; avatar_url: string | null; content_count: number }>;
  celebs: Array<CelebInfo>;
  similarUsers: Array<SimilarUserInfo>;
  similarUsersAlgorithm: "content_overlap" | "recent_activity";
}

export default function ExploreView({
  friends,
  celebs,
  similarUsers,
  similarUsersAlgorithm,
}: ExploreViewProps) {
  const [selectedUser, setSelectedUser] = useState<UserInfo | null>(null);
  const [showAddCeleb, setShowAddCeleb] = useState(false);
  const [showAlgorithmInfo, setShowAlgorithmInfo] = useState(false);

  const handleSelectUser = (user: UserInfo) => {
    setSelectedUser(user);
  };

  const handleBack = () => {
    setSelectedUser(null);
  };

  if (selectedUser) {
    return <UserArchiveView user={selectedUser} onBack={handleBack} />;
  }

  return (
    <>
      <div className="space-y-4">
        {/* 친구 섹션 */}
        <section className="bg-surface rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-text-primary flex items-center gap-2">
              <Users size={16} className="text-green-500" />
              친구
              {friends.length > 0 && <span className="text-xs text-text-tertiary font-normal">({friends.length})</span>}
            </h2>
            {friends.length > 8 && (
              <Button unstyled className="text-xs text-text-secondary hover:text-accent flex items-center gap-0.5">
                전체보기 <ChevronRight size={14} />
              </Button>
            )}
          </div>

          {friends.length > 0 ? (
            <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 gap-4">
              {friends.slice(0, 8).map((friend) => (
                <UserCard key={friend.id} user={{ ...friend, type: "friend" }} onClick={() => handleSelectUser({ ...friend, type: "friend" })} />
              ))}
            </div>
          ) : (
            <EmptyState icon={<Users size={32} />} title="아직 친구가 없어요" description="서로 팔로우하면 친구가 됩니다" />
          )}
        </section>

        {/* 셀럽 섹션 */}
        <section className="bg-surface rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-text-primary flex items-center gap-2">
              <Sparkles size={16} className="text-purple-500" />
              셀럽
              {celebs.length > 0 && <span className="text-xs text-text-tertiary font-normal">({celebs.length})</span>}
            </h2>
            <Button unstyled onClick={() => setShowAddCeleb(true)} className="text-xs text-accent hover:text-accent/80 flex items-center gap-1 font-medium">
              <Plus size={14} />
              추가
            </Button>
          </div>

          {celebs.length > 0 ? (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4">
              {celebs.map((celeb) => (
                <UserCard key={celeb.id} user={{ ...celeb, type: "celeb" }} onClick={() => handleSelectUser({ ...celeb, type: "celeb" })} showCategory />
              ))}
            </div>
          ) : (
            <EmptyState icon={<Sparkles size={32} />} title="등록된 셀럽이 없어요" description="좋아하는 셀럽을 추가해보세요" />
          )}
        </section>

        {/* 취향 유사 유저 섹션 */}
        <section className="bg-surface rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-text-primary flex items-center gap-2">
              <Star size={16} className="text-yellow-500" />
              취향이 비슷한 유저
              {similarUsers.length > 0 && <span className="text-xs text-text-tertiary font-normal">({similarUsers.length})</span>}
              <Button unstyled onClick={() => setShowAlgorithmInfo(true)} className="text-text-tertiary hover:text-text-secondary">
                <Info size={14} />
              </Button>
            </h2>
            {similarUsersAlgorithm === "content_overlap" && similarUsers.length > 0 && (
              <span className="text-[10px] text-text-tertiary bg-background px-2 py-0.5 rounded-full">공통 콘텐츠 기반</span>
            )}
          </div>

          {similarUsers.length > 0 ? (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4">
              {similarUsers.map((user) => (
                <SimilarUserCard
                  key={user.id}
                  user={user}
                  onClick={() => handleSelectUser({ ...user, type: "friend" })}
                />
              ))}
            </div>
          ) : (
            <EmptyState icon={<Star size={32} />} title="아직 유사한 유저가 없어요" description="콘텐츠를 기록하면 취향이 비슷한 유저를 추천해드릴게요" />
          )}
        </section>
      </div>

      <AlgorithmInfoModal isOpen={showAlgorithmInfo} onClose={() => setShowAlgorithmInfo(false)} />
      <AddCelebModal isOpen={showAddCeleb} onClose={() => setShowAddCeleb(false)} />
    </>
  );
}

// region 타인 기록관 뷰
function UserArchiveView({ user, onBack }: { user: UserInfo; onBack: () => void }) {
  const [isFollowing, setIsFollowing] = useState(false);

  const handleFollow = () => {
    setIsFollowing(!isFollowing);
  };

  return (
    <>
      <header className="bg-surface rounded-2xl p-4 mb-4">
        <div className="flex items-center justify-between h-12">
          <div className="flex items-center gap-2">
            <Button unstyled onClick={onBack} className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-background text-text-secondary hover:text-text-primary">
              ←
            </Button>
            <Avatar url={user.avatar_url} name={user.nickname} size="md" verified={user.is_verified} />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold text-text-primary">{user.nickname}의 기록관</h1>
                {user.type === "celeb" && (
                  <span className="px-1.5 py-0.5 bg-purple-500/20 text-purple-500 text-[10px] rounded-full flex items-center gap-0.5">
                    <Sparkles size={8} />
                    셀럽
                  </span>
                )}
              </div>
              <p className="text-xs text-text-secondary flex items-center gap-1">
                <BookOpen size={12} className="text-accent" />
                <span>{user.content_count}개 기록</span>
                {user.category && (
                  <>
                    <span className="text-text-tertiary">·</span>
                    <span className="text-text-tertiary">{user.category}</span>
                  </>
                )}
              </p>
            </div>
          </div>

          <Button
            unstyled
            onClick={handleFollow}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg ${
              isFollowing ? "bg-background text-text-secondary hover:bg-surface-hover" : "bg-accent text-white hover:bg-accent/90"
            }`}
          >
            {isFollowing ? (
              <>
                <CheckCircle size={14} />
                팔로잉
              </>
            ) : (
              <>
                <UserPlus size={14} />
                팔로우
              </>
            )}
          </Button>
        </div>
      </header>

      <main>
        {user.content_count > 0 ? (
          <UserContentGrid userId={user.id} />
        ) : (
          <div className="bg-surface rounded-2xl p-12">
            <EmptyState icon={<BookOpen size={40} />} title="공개된 기록이 없어요" description="아직 공개된 기록이 없습니다" />
          </div>
        )}
      </main>
    </>
  );
}
// endregion

// region 공통 컴포넌트
function Avatar({ url, name, size = "md", verified, className = "" }: { url: string | null; name: string; size?: "sm" | "md" | "lg" | "xl"; verified?: boolean; className?: string }) {
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
      {verified && <CheckCircle size={size === "xl" ? 20 : size === "lg" ? 18 : 14} className="absolute -bottom-0.5 -right-0.5 text-accent bg-surface rounded-full" />}
    </div>
  );
}

function UserCard({ user, onClick, showCategory }: { user: UserInfo; onClick: () => void; showCategory?: boolean }) {
  return (
    <Button unstyled onClick={onClick} className="flex flex-col items-center group">
      <Avatar url={user.avatar_url} name={user.nickname} size="md" verified={user.is_verified} className="group-hover:ring-accent" />
      <span className="mt-2 text-xs font-medium text-text-secondary group-hover:text-accent truncate max-w-full">{user.nickname}</span>
      {showCategory && user.category && <span className="text-[10px] text-text-tertiary">{user.category}</span>}
    </Button>
  );
}

function SimilarUserCard({ user, onClick }: { user: SimilarUserInfo; onClick: () => void }) {
  return (
    <Button unstyled onClick={onClick} className="flex flex-col items-center group">
      <Avatar url={user.avatar_url} name={user.nickname} size="md" className="group-hover:ring-accent" />
      <span className="mt-2 text-xs font-medium text-text-secondary group-hover:text-accent truncate max-w-full">{user.nickname}</span>
      {user.overlap_count > 0 && (
        <span className="text-[10px] text-accent">{user.overlap_count}개 공통</span>
      )}
    </Button>
  );
}

function EmptyState({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="text-center py-8">
      <div className="text-text-tertiary mb-2 flex justify-center">{icon}</div>
      <p className="text-sm font-medium text-text-secondary">{title}</p>
      <p className="text-xs text-text-tertiary mt-0.5">{description}</p>
    </div>
  );
}
// endregion

// region 셀럽 추가 모달
function AddCelebModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const router = useRouter();
  const [nickname, setNickname] = useState("");
  const [category, setCategory] = useState("");
  const [bio, setBio] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const categories = ["연예인", "작가", "유튜버", "운동선수", "음악가", "감독", "기타"];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nickname.trim()) {
      setError("이름을 입력해주세요");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      await createCelebProfile({ nickname: nickname.trim(), category: category || undefined, bio: bio || undefined });
      router.refresh();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "셀럽 추가에 실패했습니다");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="셀럽 추가" size="md">
      <form onSubmit={handleSubmit}>
        <ModalBody className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">이름 *</label>
            <input type="text" value={nickname} onChange={(e) => setNickname(e.target.value)} placeholder="셀럽 이름" className="w-full px-4 py-2.5 bg-surface border border-border rounded-lg text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent" />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">분야</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full px-4 py-2.5 bg-surface border border-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-accent">
              <option value="">선택 안함</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">소개</label>
            <textarea value={bio} onChange={(e) => setBio(e.target.value)} placeholder="셀럽에 대한 간단한 소개" rows={3} className="w-full px-4 py-2.5 bg-surface border border-border rounded-lg text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent resize-none" />
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}
        </ModalBody>

        <ModalFooter>
          <Button unstyled type="button" onClick={onClose} className="flex-1 px-4 py-2.5 bg-surface text-text-secondary rounded-lg hover:bg-surface-hover font-medium">취소</Button>
          <Button unstyled type="submit" disabled={isLoading} className="flex-1 px-4 py-2.5 bg-accent text-white rounded-lg hover:bg-accent/90 font-medium disabled:opacity-50">{isLoading ? "추가 중..." : "추가"}</Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
// endregion

// region 알고리즘 안내 모달
function AlgorithmInfoModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="추천 알고리즘 안내" size="md">
      <ModalBody className="space-y-4">
        <div className="space-y-3">
          <div className="flex items-start gap-3 p-3 bg-background rounded-lg">
            <div className="w-8 h-8 rounded-full bg-yellow-500/20 flex items-center justify-center flex-shrink-0">
              <Star size={16} className="text-yellow-500" />
            </div>
            <div>
              <h3 className="font-medium text-text-primary text-sm">공통 콘텐츠 기반 매칭</h3>
              <p className="text-xs text-text-secondary mt-1">나와 같은 콘텐츠를 기록한 유저를 찾아 추천해요</p>
            </div>
          </div>

          <div className="bg-background rounded-lg p-4">
            <h4 className="text-xs font-medium text-text-secondary mb-3">이렇게 계산해요</h4>
            <div className="space-y-2 text-xs text-text-tertiary">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded bg-accent/20 text-accent flex items-center justify-center text-[10px] font-bold">1</span>
                <span>나와 상대방이 공통으로 기록한 콘텐츠 수를 파악</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded bg-accent/20 text-accent flex items-center justify-center text-[10px] font-bold">2</span>
                <span>각자의 전체 콘텐츠 수로 정규화하여 공정하게 비교</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded bg-accent/20 text-accent flex items-center justify-center text-[10px] font-bold">3</span>
                <span>유사도가 높은 순으로 추천</span>
              </div>
            </div>
          </div>

          <div className="text-xs text-text-tertiary bg-background/50 rounded-lg p-3">
            <p className="flex items-start gap-2">
              <Info size={12} className="flex-shrink-0 mt-0.5" />
              <span>콘텐츠를 많이 기록할수록 취향이 맞는 유저를 더 정확하게 찾아드릴 수 있어요</span>
            </p>
          </div>
        </div>
      </ModalBody>

      <ModalFooter>
        <Button unstyled onClick={onClose} className="flex-1 px-4 py-2.5 bg-accent text-white rounded-lg hover:bg-accent/90 font-medium">확인</Button>
      </ModalFooter>
    </Modal>
  );
}
// endregion
