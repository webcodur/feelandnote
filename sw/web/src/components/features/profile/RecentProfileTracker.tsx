/*
  파일명: /components/features/profile/RecentProfileTracker.tsx
  기능: 프로필 방문 기록 저장 전용
  책임: 마운트 시 현재 프로필을 localStorage에 저장한다. UI 없음.
*/ // ------------------------------
"use client";

import { useEffect } from "react";
import { useRecentProfiles } from "@/hooks/useRecentProfiles";

interface RecentProfileTrackerProps {
  profile: {
    id: string;
    nickname: string;
    avatarUrl: string | null;
    title: string | null;
    profileType: "USER" | "CELEB";
  };
}

export default function RecentProfileTracker({ profile }: RecentProfileTrackerProps) {
  const { addItem } = useRecentProfiles();

  useEffect(() => {
    addItem(profile);
  }, [profile.id]); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}
