"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { type PublicUserProfile } from "@/actions/user";
import { type UserContentPublic } from "@/actions/contents/getUserContents";
import { type ActivityLogWithContent } from "@/types/database";
import ActivityTimeline from "@/components/features/archive/ActivityTimeline";
import RecentRecords from "@/components/features/archive/user/RecentRecords";
import ClassicalBox from "@/components/ui/ClassicalBox";
import ProfileBioSection from "./ProfileBioSection";
import ProfileSettingsSection from "./ProfileSettingsSection";

interface ProfileContentProps {
  profile: PublicUserProfile;
  userId: string;
  isOwner: boolean;
  recentContents: UserContentPublic[];
  activityLogs: ActivityLogWithContent[];
  initialApiKey?: string | null;
}

export default function ProfileContent({
  profile,
  userId,
  isOwner,
  recentContents,
  activityLogs,
  initialApiKey,
}: ProfileContentProps) {
  return (
    <div className="space-y-8 sm:space-y-12">
      {/* 1. Bio & Profile Info */}
      <ProfileBioSection profile={profile} isOwner={isOwner} />

      {/* 2. Recent Records */}
      <section className="animate-fade-in" style={{ animationDelay: "0.1s" }}>
        <div className="flex items-center justify-between mb-6 sm:mb-8 px-2">
          <h2 className="text-lg sm:text-xl md:text-3xl font-serif text-text-primary tracking-tight font-black drop-shadow-xl flex items-center gap-2 md:gap-3">
            <span className="w-1.5 md:w-2 h-6 md:h-8 bg-accent rounded-full shadow-glow" />
            최근 기록
          </h2>
          <Link
            href={`/${userId}/records`}
            className="text-[9px] sm:text-[10px] md:text-sm font-serif text-accent hover:text-white flex items-center gap-1 md:gap-2 group font-black bg-accent/10 px-2.5 sm:px-3 md:px-4 py-1.5 md:py-2 rounded-sm border border-accent/20 hover:bg-accent shadow-sm whitespace-nowrap"
          >
            기록 전당
            <ChevronRight size={12} className="md:size-[18px] group-hover:translate-x-1" />
          </Link>
        </div>
        <ClassicalBox className="p-4 sm:p-6 md:p-8 bg-bg-card/50 shadow-2xl border-accent-dim/20">
          <RecentRecords items={recentContents} userId={userId} />
        </ClassicalBox>
      </section>

      {/* 3. Highlights */}
      {activityLogs.length > 0 && (
        <section className="animate-fade-in" style={{ animationDelay: "0.2s" }}>
          <div className="flex items-center gap-3 mb-6 sm:mb-8 px-2">
            <span className="w-2 h-6 sm:h-8 bg-accent rounded-full shadow-glow" />
            <h2 className="text-lg sm:text-xl md:text-3xl font-serif text-text-primary tracking-tight font-black drop-shadow-xl">
              하이라이트
            </h2>
          </div>
          <ClassicalBox className="p-4 sm:p-8 md:p-12 bg-bg-card/30 shadow-2xl border-accent-dim/10">
            <ActivityTimeline logs={activityLogs} />
          </ClassicalBox>
        </section>
      )}

      {/* 4. Settings (Owner only) */}
      {isOwner && <ProfileSettingsSection profile={profile} initialApiKey={initialApiKey} />}
    </div>
  );
}
