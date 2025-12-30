"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Archive, Users, Sparkles, ChevronRight, Star, BookOpen, Plus, X, CheckCircle, Compass } from "lucide-react";
import ArchiveView from "@/components/views/main/archive/ArchiveView";
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

interface ArchiveHubViewProps {
  myProfile: UserProfile;
  friends: Array<{ id: string; nickname: string; avatar_url: string | null; content_count: number }>;
  celebs: Array<CelebInfo>;
}

type ViewMode = "archive" | "explore";

export default function ArchiveHubView({
  myProfile,
  friends,
  celebs,
}: ArchiveHubViewProps) {
  const router = useRouter();
  const [viewMode, setViewMode] = useState<ViewMode>("archive");

  const handleProfileClick = () => {
    router.push("/profile");
  };

  return (
    <div className="space-y-4">
      {/* 상단 헤더: 프로필 + 통계 + 모드 토글 */}
      <header className="bg-surface rounded-2xl p-4">
        <div className="flex items-center gap-4">
          {/* 프로필 */}
          <button
            onClick={handleProfileClick}
            className="flex items-center gap-3 group"
          >
            {myProfile.avatar_url ? (
              <img
                src={myProfile.avatar_url}
                alt={myProfile.nickname}
                className="w-12 h-12 rounded-full object-cover ring-2 ring-accent/20 group-hover:ring-accent/40 transition-all"
              />
            ) : (
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold text-white ring-2 ring-accent/20 group-hover:ring-accent/40 transition-all"
                style={{ background: "linear-gradient(135deg, #8b5cf6, #6366f1)" }}
              >
                {myProfile.nickname.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="text-left">
              <h2 className="text-base font-bold text-text-primary group-hover:text-accent transition-colors">
                {myProfile.nickname}
              </h2>
              {myProfile.bio && (
                <p className="text-xs text-text-tertiary line-clamp-1 max-w-[150px]">
                  {myProfile.bio}
                </p>
              )}
            </div>
          </button>

          {/* 통계 */}
          <div className="hidden sm:flex items-center gap-4 ml-auto mr-4">
            <div className="flex items-center gap-1.5 text-sm">
              <BookOpen size={14} className="text-accent" />
              <span className="font-semibold text-text-primary">0</span>
              <span className="text-text-tertiary">기록</span>
            </div>
            <div className="flex items-center gap-1.5 text-sm">
              <Users size={14} className="text-green-500" />
              <span className="font-semibold text-text-primary">0</span>
              <span className="text-text-tertiary">팔로워</span>
            </div>
          </div>

          {/* 뷰 모드 토글 */}
          <div className="flex gap-1 bg-background rounded-lg p-1 ml-auto sm:ml-0">
            <button
              onClick={() => setViewMode("archive")}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                viewMode === "archive"
                  ? "bg-accent text-white"
                  : "text-text-secondary hover:text-text-primary"
              }`}
            >
              <Archive size={14} />
              <span className="hidden xs:inline">기록</span>
            </button>
            <button
              onClick={() => setViewMode("explore")}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                viewMode === "explore"
                  ? "bg-accent text-white"
                  : "text-text-secondary hover:text-text-primary"
              }`}
            >
              <Compass size={14} />
              <span className="hidden xs:inline">탐색</span>
            </button>
          </div>
        </div>
      </header>

      {/* 콘텐츠 영역 */}
      <main>
        {viewMode === "archive" ? (
          <ArchiveView />
        ) : (
          <ExploreSection friends={friends} celebs={celebs} />
        )}
      </main>
    </div>
  );
}

// 탐색 섹션
function ExploreSection({
  friends,
  celebs,
}: {
  friends: Array<{ id: string; nickname: string; avatar_url: string | null; content_count: number }>;
  celebs: Array<CelebInfo>;
}) {
  const router = useRouter();
  const [showAddCeleb, setShowAddCeleb] = useState(false);

  return (
    <div className="space-y-6">
      {/* 친구 */}
      <section className="bg-surface rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-text-primary flex items-center gap-2">
            <Users size={16} className="text-green-500" />
            친구
            {friends.length > 0 && (
              <span className="text-xs text-text-tertiary font-normal">({friends.length})</span>
            )}
          </h2>
          {friends.length > 6 && (
            <button className="text-xs text-text-secondary hover:text-accent flex items-center gap-0.5">
              더보기 <ChevronRight size={14} />
            </button>
          )}
        </div>
        {friends.length > 0 ? (
          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-3">
            {friends.slice(0, 8).map((user) => (
              <button
                key={user.id}
                onClick={() => router.push(`/user/${user.id}`)}
                className="flex flex-col items-center group"
              >
                {user.avatar_url ? (
                  <img
                    src={user.avatar_url}
                    alt={user.nickname}
                    className="w-12 h-12 rounded-full object-cover ring-2 ring-transparent group-hover:ring-accent transition-all"
                  />
                ) : (
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold text-white ring-2 ring-transparent group-hover:ring-accent transition-all"
                    style={{ background: "linear-gradient(135deg, #8b5cf6, #ec4899)" }}
                  >
                    {user.nickname.charAt(0).toUpperCase()}
                  </div>
                )}
                <span className="mt-1.5 text-xs font-medium text-text-secondary group-hover:text-accent transition-colors truncate max-w-full">
                  {user.nickname}
                </span>
              </button>
            ))}
          </div>
        ) : (
          <div className="text-center py-6">
            <Users size={28} className="mx-auto mb-2 text-text-tertiary" />
            <p className="text-sm text-text-secondary">아직 친구가 없습니다</p>
            <p className="text-xs text-text-tertiary mt-0.5">서로 팔로우하면 친구가 됩니다</p>
          </div>
        )}
      </section>

      {/* 셀럽 */}
      <section className="bg-surface rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-text-primary flex items-center gap-2">
            <Sparkles size={16} className="text-purple-500" />
            셀럽
            {celebs.length > 0 && (
              <span className="text-xs text-text-tertiary font-normal">({celebs.length})</span>
            )}
          </h2>
          <button
            onClick={() => setShowAddCeleb(true)}
            className="text-xs text-accent hover:text-accent/80 flex items-center gap-1 font-medium"
          >
            <Plus size={14} />
            추가
          </button>
        </div>
        {celebs.length > 0 ? (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
            {celebs.map((celeb) => (
              <button
                key={celeb.id}
                onClick={() => router.push(`/user/${celeb.id}`)}
                className="flex flex-col items-center group"
              >
                <div className="relative">
                  {celeb.avatar_url ? (
                    <img
                      src={celeb.avatar_url}
                      alt={celeb.nickname}
                      className="w-12 h-12 rounded-full object-cover ring-2 ring-transparent group-hover:ring-accent transition-all"
                    />
                  ) : (
                    <div
                      className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold text-white ring-2 ring-transparent group-hover:ring-accent transition-all"
                      style={{ background: "linear-gradient(135deg, #8b5cf6, #ec4899)" }}
                    >
                      {celeb.nickname.charAt(0).toUpperCase()}
                    </div>
                  )}
                  {celeb.is_verified && (
                    <CheckCircle size={14} className="absolute -bottom-0.5 -right-0.5 text-accent bg-surface rounded-full" />
                  )}
                </div>
                <span className="mt-1.5 text-xs font-medium text-text-secondary group-hover:text-accent transition-colors truncate max-w-full">
                  {celeb.nickname}
                </span>
                {celeb.category && (
                  <span className="text-[10px] text-text-tertiary">{celeb.category}</span>
                )}
              </button>
            ))}
          </div>
        ) : (
          <div className="text-center py-6">
            <Sparkles size={28} className="mx-auto mb-2 text-text-tertiary" />
            <p className="text-sm text-text-secondary">등록된 셀럽이 없습니다</p>
            <p className="text-xs text-text-tertiary mt-0.5">첫 번째 셀럽을 추가해보세요!</p>
          </div>
        )}
      </section>

      {/* 추천 유저 */}
      <section className="bg-surface rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <h2 className="text-base font-semibold text-text-primary flex items-center gap-2">
            <Star size={16} className="text-yellow-500" />
            취향이 비슷한 유저
          </h2>
        </div>
        <div className="text-center py-6">
          <Star size={28} className="mx-auto mb-2 text-text-tertiary" />
          <p className="text-sm text-text-secondary">추천 기능 준비 중</p>
          <p className="text-xs text-text-tertiary mt-0.5">취향 분석을 통해 비슷한 유저를 추천해드릴게요</p>
        </div>
      </section>

      {/* 셀럽 추가 모달 */}
      {showAddCeleb && (
        <AddCelebModal onClose={() => setShowAddCeleb(false)} />
      )}
    </div>
  );
}

// 셀럽 추가 모달
function AddCelebModal({ onClose }: { onClose: () => void }) {
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
      await createCelebProfile({
        nickname: nickname.trim(),
        category: category || undefined,
        bio: bio || undefined,
      });
      router.refresh();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "셀럽 추가에 실패했습니다");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center p-4 bg-black/50" style={{ zIndex: Z_INDEX.modal }}>
      <div className="bg-background rounded-2xl w-full max-w-md p-6 shadow-xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-text-primary">셀럽 추가</h2>
          <button onClick={onClose} className="text-text-tertiary hover:text-text-primary">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">
              이름 *
            </label>
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="셀럽 이름"
              className="w-full px-4 py-2.5 bg-surface border border-border rounded-lg text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">
              분야
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-4 py-2.5 bg-surface border border-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
            >
              <option value="">선택 안함</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">
              소개
            </label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="셀럽에 대한 간단한 소개"
              rows={3}
              className="w-full px-4 py-2.5 bg-surface border border-border rounded-lg text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent resize-none"
            />
          </div>

          {error && (
            <p className="text-sm text-red-500">{error}</p>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 bg-surface text-text-secondary rounded-lg hover:bg-surface-hover font-medium"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 px-4 py-2.5 bg-accent text-white rounded-lg hover:bg-accent/90 font-medium disabled:opacity-50"
            >
              {isLoading ? "추가 중..." : "추가"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
