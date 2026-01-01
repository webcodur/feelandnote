"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Users,
  Sparkles,
  ChevronRight,
  Star,
  BookOpen,
  Plus,
  CheckCircle,
  Compass,
  UserPlus
} from "lucide-react";
import ContentLibrary from "@/components/features/archive/ContentLibrary";
import AddContentModal from "@/components/features/archive/AddContentModal";
import { PlaylistDropdown, PlaylistEditMode } from "@/components/features/playlist";
import UserContentGrid from "@/components/features/user/UserContentGrid";
import Button from "@/components/ui/Button";
import { Modal, ModalBody, ModalFooter } from "@/components/ui";
import { createCelebProfile } from "@/actions/celebs";
import type { UserProfile } from "@/actions/user";
import { Z_INDEX } from "@/constants/zIndex";

interface CelebInfo {
  id: string;
  nickname: string;
  avatar_url: string | null;
  content_count: number;
  category?: string | null;
  bio?: string | null;
  is_verified?: boolean;
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

interface MyStats {
  contentCount: number;
  followerCount: number;
  followingCount: number;
}

interface ArchiveHubViewProps {
  myProfile: UserProfile;
  stats: MyStats;
  friends: Array<{ id: string; nickname: string; avatar_url: string | null; content_count: number }>;
  celebs: Array<CelebInfo>;
}

type ViewState = "my" | "explore" | "user";

export default function ArchiveHubView({
  myProfile,
  stats,
  friends,
  celebs,
}: ArchiveHubViewProps) {
  const router = useRouter();
  const [view, setView] = useState<ViewState>("my");
  const [selectedUser, setSelectedUser] = useState<UserInfo | null>(null);

  const handleSelectUser = (user: UserInfo) => {
    setSelectedUser(user);
    setView("user");
  };

  const handleBack = () => {
    if (view === "user") {
      setView("explore");
      setSelectedUser(null);
    } else if (view === "explore") {
      setView("my");
    }
  };

  return (
    <div className="space-y-4">
      {view === "my" && (
        <MyArchiveView
          profile={myProfile}
          stats={stats}
          onExplore={() => setView("explore")}
          onProfileClick={() => router.push("/profile")}
        />
      )}

      {view === "explore" && (
        <ExploreView
          friends={friends}
          celebs={celebs}
          onBack={handleBack}
          onSelectUser={handleSelectUser}
        />
      )}

      {view === "user" && selectedUser && (
        <UserArchiveView
          user={selectedUser}
          onBack={handleBack}
        />
      )}
    </div>
  );
}

// region 내 기록관 뷰
type EditMode = { type: "create" } | { type: "edit"; playlistId: string } | null;

function MyArchiveView({
  profile,
  stats,
  onExplore,
  onProfileClick,
}: {
  profile: UserProfile;
  stats: MyStats;
  onExplore: () => void;
  onProfileClick: () => void;
}) {
  const router = useRouter();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [editMode, setEditMode] = useState<EditMode>(null);

  const handleSuccess = () => setRefreshKey((prev) => prev + 1);
  const handleCreatePlaylist = () => setEditMode({ type: "create" });
  const handleSelectPlaylist = (playlistId: string) => router.push(`/archive/playlists/${playlistId}`);
  const handleCloseEditMode = () => setEditMode(null);

  if (editMode) {
    return (
      <PlaylistEditMode
        mode={editMode.type}
        playlistId={editMode.type === "edit" ? editMode.playlistId : undefined}
        onClose={handleCloseEditMode}
        onSuccess={() => {
          handleCloseEditMode();
          handleSuccess();
        }}
      />
    );
  }

  return (
    <>
      <div className="bg-surface rounded-2xl overflow-hidden">
        <header className="p-5 border-b border-border">
          <div className="flex items-center gap-4">
            <Button unstyled onClick={onProfileClick} className="flex-shrink-0 group">
              <Avatar url={profile.avatar_url} name={profile.nickname} size="xl" className="group-hover:ring-accent/40 ring-4 ring-accent/20" />
            </Button>

            <div className="flex-1 min-w-0">
              <Button unstyled onClick={onProfileClick} className="group">
                <h1 className="text-lg font-bold text-text-primary group-hover:text-accent transition-colors text-left">{profile.nickname}</h1>
              </Button>

              <div className="flex items-center gap-4 mt-1.5">
                <div className="flex items-center gap-1 text-sm">
                  <BookOpen size={14} className="text-accent" />
                  <span className="font-semibold text-text-primary">{stats.contentCount}</span>
                  <span className="text-text-tertiary">기록</span>
                </div>
                <div className="flex items-center gap-1 text-sm">
                  <Users size={14} className="text-green-500" />
                  <span className="font-semibold text-text-primary">{stats.followerCount}</span>
                  <span className="text-text-tertiary">팔로워</span>
                </div>
                <div className="hidden sm:flex items-center gap-1 text-sm">
                  <span className="font-semibold text-text-primary">{stats.followingCount}</span>
                  <span className="text-text-tertiary">팔로잉</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5 flex-shrink-0">
              <PlaylistDropdown onCreateNew={handleCreatePlaylist} onSelectPlaylist={handleSelectPlaylist} />
              <Button unstyled onClick={() => setIsAddModalOpen(true)} className="flex items-center gap-1 px-2.5 py-1.5 bg-accent hover:bg-accent-hover text-white text-xs font-medium rounded-lg">
                <Plus size={14} />
                <span className="hidden sm:inline">직접 등록</span>
              </Button>
              <Button unstyled onClick={onExplore} className="flex items-center gap-1.5 px-2.5 py-1.5 text-sm font-medium text-text-secondary hover:text-accent transition-colors rounded-lg hover:bg-background">
                <Compass size={14} />
                <span className="hidden sm:inline">둘러보기</span>
              </Button>
            </div>
          </div>
        </header>

        <div className="p-4">
          <ContentLibrary key={refreshKey} showTabs showFilters showViewToggle emptyMessage="아직 기록한 콘텐츠가 없습니다. 위 버튼을 눌러 첫 번째 콘텐츠를 추가해보세요!" />
        </div>
      </div>

      <Button unstyled onClick={() => setIsAddModalOpen(true)} className="fixed bottom-20 right-4 w-14 h-14 rounded-full bg-accent flex items-center justify-center shadow-lg hover:scale-110 hover:bg-accent-hover sm:hidden" style={{ zIndex: Z_INDEX.fab }}>
        <Plus color="white" size={24} />
      </Button>

      <AddContentModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} onSuccess={handleSuccess} />
    </>
  );
}
// endregion

// region 둘러보기 뷰
function ExploreView({
  friends,
  celebs,
  onBack,
  onSelectUser,
}: {
  friends: Array<{ id: string; nickname: string; avatar_url: string | null; content_count: number }>;
  celebs: Array<CelebInfo>;
  onBack: () => void;
  onSelectUser: (user: UserInfo) => void;
}) {
  const [showAddCeleb, setShowAddCeleb] = useState(false);

  return (
    <>
      <header className="bg-surface rounded-2xl p-4">
        <div className="flex items-center h-12">
          <Button unstyled onClick={onBack} className="w-12 h-12 flex items-center justify-center -ml-2 rounded-lg hover:bg-background transition-colors text-text-secondary hover:text-text-primary">
            <ArrowLeft size={20} />
          </Button>
          <div>
            <h1 className="text-base font-bold text-text-primary">둘러보기</h1>
            <p className="text-xs text-text-tertiary">친구와 셀럽의 기록을 탐색하세요</p>
          </div>
        </div>
      </header>

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
              <UserCard key={friend.id} user={{ ...friend, type: "friend" }} onClick={() => onSelectUser({ ...friend, type: "friend" })} />
            ))}
          </div>
        ) : (
          <EmptyState icon={<Users size={32} />} title="아직 친구가 없어요" description="서로 팔로우하면 친구가 됩니다" />
        )}
      </section>

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
              <UserCard key={celeb.id} user={{ ...celeb, type: "celeb" }} onClick={() => onSelectUser({ ...celeb, type: "celeb" })} showCategory />
            ))}
          </div>
        ) : (
          <EmptyState icon={<Sparkles size={32} />} title="등록된 셀럽이 없어요" description="좋아하는 셀럽을 추가해보세요" />
        )}
      </section>

      <section className="bg-surface rounded-2xl p-5">
        <h2 className="text-base font-semibold text-text-primary flex items-center gap-2 mb-4">
          <Star size={16} className="text-yellow-500" />
          취향이 비슷한 유저
        </h2>
        <EmptyState icon={<Star size={32} />} title="추천 기능 준비 중" description="취향 분석을 통해 비슷한 유저를 추천해드릴게요" />
      </section>

      <AddCelebModal isOpen={showAddCeleb} onClose={() => setShowAddCeleb(false)} />
    </>
  );
}
// endregion

// region 타인 기록관 뷰
function UserArchiveView({ user, onBack }: { user: UserInfo; onBack: () => void }) {
  const [isFollowing, setIsFollowing] = useState(false);

  const handleFollow = () => {
    setIsFollowing(!isFollowing);
  };

  return (
    <>
      <header className="bg-surface rounded-2xl p-4">
        <div className="flex items-center justify-between h-12">
          <div className="flex items-center gap-2">
            <Button unstyled onClick={onBack} className="w-12 h-12 flex items-center justify-center -ml-2 rounded-lg hover:bg-background transition-colors text-text-secondary hover:text-text-primary">
              <ArrowLeft size={20} />
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
            className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
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
      <Avatar url={user.avatar_url} name={user.nickname} size="md" verified={user.is_verified} className="group-hover:ring-accent transition-all" />
      <span className="mt-2 text-xs font-medium text-text-secondary group-hover:text-accent transition-colors truncate max-w-full">{user.nickname}</span>
      {showCategory && user.category && <span className="text-[10px] text-text-tertiary">{user.category}</span>}
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
