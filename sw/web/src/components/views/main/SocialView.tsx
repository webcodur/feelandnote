"use client";

import { useState, useEffect } from "react";
import { Card, Avatar, Badge, Tabs, Tab } from "@/components/ui";
import { Users, TrendingUp, Loader2, UserPlus } from "lucide-react";
import { getProfile, type UserProfile } from "@/actions/user";

export default function SocialView() {
  const [activeTab, setActiveTab] = useState("followers");
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadProfile() {
      try {
        const data = await getProfile();
        setProfile(data);
      } catch (error) {
        console.error("Failed to load profile:", error);
      } finally {
        setIsLoading(false);
      }
    }
    loadProfile();
  }, []);

  // 현재 소셜 기능이 구현되지 않아 빈 배열 사용
  const followers: { id: number; name: string; avatar: string; influence: string }[] = [];
  const following: { id: number; name: string; avatar: string; influence: string }[] = [];
  const friends: { id: number; name: string; avatar: string; influence: string }[] = [];

  const renderUserList = (users: typeof followers) => (
    <div className="flex flex-col gap-3">
      {users.map((user) => (
        <div
          key={user.id}
          className="flex items-center gap-4 p-4 bg-white/[0.02] rounded-xl transition-all duration-200 hover:bg-white/[0.05] border border-transparent hover:border-border"
        >
          <Avatar size="md" gradient={user.avatar} />
          <div className="flex-1">
            <div className="font-semibold text-base mb-1">{user.name}</div>
            <div className="text-sm text-text-secondary flex items-center gap-1">
              <TrendingUp size={14} /> {user.influence}
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  if (isLoading) {
    return (
      <>
        <h1 className="text-[28px] font-bold mb-6 flex items-center gap-2">
          <Users size={24} className="text-accent" /> 소셜
        </h1>
        <div className="flex items-center justify-center py-20">
          <Loader2 size={32} className="animate-spin text-accent" />
        </div>
      </>
    );
  }

  return (
    <>
      <h1 className="text-[28px] font-bold mb-6 flex items-center gap-2">
        <Users size={24} className="text-accent" /> 소셜
      </h1>
      <p className="text-text-secondary mb-6">친구들과 함께 문화생활을 공유하세요</p>

      {/* Profile Card */}
      <Card className="p-12 text-center mt-8">
        {profile?.avatar_url ? (
          <img
            src={profile.avatar_url}
            alt={profile.nickname}
            className="w-[120px] h-[120px] rounded-full mx-auto mb-6 object-cover"
          />
        ) : (
          <Avatar
            size="lg"
            gradient="linear-gradient(135deg, #7c4dff, #ff4d4d)"
            className="w-[120px] h-[120px] mx-auto mb-6"
          />
        )}
        <h2 className="text-2xl font-bold mb-2">{profile?.nickname || "사용자"}</h2>
        <Badge variant="primary">🌱 새싹</Badge>
        <div className="flex justify-center gap-12 mt-8">
          <div className="text-center">
            <div className="text-3xl font-bold mb-1">{followers.length}</div>
            <div className="text-sm text-text-secondary">팔로워</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold mb-1">{following.length}</div>
            <div className="text-sm text-text-secondary">팔로잉</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold mb-1">{friends.length}</div>
            <div className="text-sm text-text-secondary">친구</div>
          </div>
        </div>
      </Card>

      {/* Coming Soon Notice */}
      <Card className="mt-6 bg-gradient-to-r from-accent/10 to-transparent border-accent/30">
        <div className="text-center py-4">
          <UserPlus size={32} className="mx-auto mb-3 text-accent" />
          <h3 className="text-lg font-bold mb-2">소셜 기능 준비 중</h3>
          <p className="text-text-secondary text-sm">
            친구를 찾고, 팔로우하고, 함께 문화생활을 공유하는 기능이 곧 제공됩니다.
          </p>
        </div>
      </Card>

      {/* Tabs */}
      <div className="mt-8">
        <Tabs className="mb-6">
          <Tab
            label={`팔로워 (${followers.length})`}
            active={activeTab === "followers"}
            onClick={() => setActiveTab("followers")}
          />
          <Tab
            label={`팔로잉 (${following.length})`}
            active={activeTab === "following"}
            onClick={() => setActiveTab("following")}
          />
          <Tab
            label={`친구 (${friends.length})`}
            active={activeTab === "friends"}
            onClick={() => setActiveTab("friends")}
          />
        </Tabs>

        <Card>
          {activeTab === "followers" && (followers.length > 0 ? renderUserList(followers) : null)}
          {activeTab === "following" && (following.length > 0 ? renderUserList(following) : null)}
          {activeTab === "friends" && (friends.length > 0 ? renderUserList(friends) : null)}

          <div className="py-12 text-center text-text-secondary">
            {activeTab === "friends"
              ? "아직 친구가 없습니다"
              : `아직 ${activeTab === "followers" ? "팔로워" : "팔로잉"}가 없습니다`}
          </div>
        </Card>
      </div>
    </>
  );
}
