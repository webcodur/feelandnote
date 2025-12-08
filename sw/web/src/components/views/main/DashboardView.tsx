"use client";

import { useState, useEffect } from "react";
import StatsCard from "@/components/features/dashboard/StatsCard";
import ContinueReading from "@/components/features/dashboard/ContinueReading";
import FeedSection from "@/components/features/dashboard/FeedSection";
import CreationSection from "@/components/features/dashboard/CreationSection";
import { getProfile, type UserProfile } from "@/actions/user";

export default function DashboardView() {
  const [profile, setProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    async function loadProfile() {
      const data = await getProfile();
      setProfile(data);
    }
    loadProfile();
  }, []);

  const displayName = profile?.nickname || "사용자";

  return (
    <>
      <div className="mb-10 flex items-center justify-between">
        <div>
          <h1 className="text-[28px] font-bold mb-1">{displayName}님, 환영합니다!</h1>
          <p className="text-text-secondary text-[15px]">오늘도 즐거운 문화생활 되세요.</p>
        </div>
        <StatsCard />
      </div>

      <ContinueReading />
      <CreationSection />
      <FeedSection />
    </>
  );
}
