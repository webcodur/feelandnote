"use client";

import { useState, useEffect } from "react";
import { SectionHeader, FilterChips, type ChipOption } from "@/components/ui";
import { User, BarChart2, Trophy, Settings, Loader2 } from "lucide-react";
import { getDetailedStats, type DetailedStats, getProfile, updateApiKey, updateProfile, type UserProfile } from "@/actions/user";
import { getAchievementData, type AchievementData } from "@/actions/achievements";
import StatsContent from "@/components/features/profile/StatsContent";
import AchievementsContent from "@/components/features/profile/AchievementsContent";
import SettingsContent from "@/components/features/profile/SettingsContent";

type ProfileTab = "stats" | "achievements" | "settings";

const TAB_OPTIONS: ChipOption<ProfileTab>[] = [
  { value: "stats", label: "통계", icon: BarChart2 },
  { value: "achievements", label: "업적", icon: Trophy },
  { value: "settings", label: "설정", icon: Settings },
];

export default function Page() {
  const [activeTab, setActiveTab] = useState<ProfileTab>("stats");
  const [stats, setStats] = useState<DetailedStats | null>(null);
  const [achievements, setAchievements] = useState<AchievementData | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingApiKey, setIsSavingApiKey] = useState(false);
  const [achievementSubTab, setAchievementSubTab] = useState<"history" | "titles">("history");

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      try {
        const [statsData, achievementsData, profileData] = await Promise.all([
          getDetailedStats(),
          getAchievementData(),
          getProfile(),
        ]);
        setStats(statsData);
        setAchievements(achievementsData);
        setProfile(profileData);
      } catch (error) {
        console.error("Failed to load profile data:", error);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  const handleSaveApiKey = async (key: string) => {
    setIsSavingApiKey(true);
    try {
      await updateApiKey({ geminiApiKey: key });
      setProfile(prev => prev ? { ...prev, gemini_api_key: key || null } : null);
    } finally {
      setIsSavingApiKey(false);
    }
  };

  const handleProfileUpdate = async (data: { nickname?: string; bio?: string | null; avatar_url?: string | null }) => {
    const result = await updateProfile({
      nickname: data.nickname,
      bio: data.bio ?? undefined,
      avatar_url: data.avatar_url ?? undefined,
    });
    if (result.success) {
      setProfile(prev => prev ? {
        ...prev,
        nickname: data.nickname ?? prev.nickname,
        bio: data.bio ?? prev.bio,
        avatar_url: data.avatar_url !== undefined ? data.avatar_url : prev.avatar_url,
      } : null);
    }
    return result;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "방금 전";
    if (diffMins < 60) return `${diffMins}분 전`;
    if (diffHours < 24) return `${diffHours}시간 전`;
    if (diffDays < 7) return `${diffDays}일 전`;
    return date.toLocaleDateString("ko-KR");
  };

  return (
    <>
      <SectionHeader
        title="마이페이지"
        description="나의 문화생활 통계와 업적을 확인하세요"
        icon={<User size={20} />}
        className="mb-4"
      />

      <div className="border-b border-border pb-3 mb-4">
        <FilterChips options={TAB_OPTIONS} value={activeTab} onChange={setActiveTab} variant="filled" showIcon />
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 size={28} className="animate-spin text-accent" />
        </div>
      )}

      {!isLoading && activeTab === "stats" && <StatsContent stats={stats} />}

      {!isLoading && activeTab === "achievements" && (
        <AchievementsContent
          data={achievements}
          subTab={achievementSubTab}
          setSubTab={setAchievementSubTab}
          formatDate={formatDate}
        />
      )}

      {!isLoading && activeTab === "settings" && (
        <SettingsContent
          apiKey={profile?.gemini_api_key || null}
          onSave={handleSaveApiKey}
          isSaving={isSavingApiKey}
          profile={profile ? { nickname: profile.nickname, avatar_url: profile.avatar_url, bio: profile.bio || null } : null}
          onProfileUpdate={handleProfileUpdate}
        />
      )}
    </>
  );
}
