"use client";

import { useState, useEffect } from "react";
import StatsCard from "@/components/features/dashboard/StatsCard";
import ContinueReading from "@/components/features/dashboard/ContinueReading";
import FeedSection from "@/components/features/dashboard/FeedSection";
import { SectionHeader } from "@/components/ui";
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
      <SectionHeader
        title={`${displayName}님, 환영합니다!`}
        description="오늘도 즐거운 문화생활 되세요."
        action={<StatsCard />}
        className="mb-10"
      />

      <ContinueReading />
      <FeedSection />
    </>
  );
}
