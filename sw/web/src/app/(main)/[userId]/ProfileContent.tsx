"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { type PublicUserProfile } from "@/actions/user";
import { type UserContentPublic } from "@/actions/contents/getUserContents";
import { type GuestbookEntryWithAuthor } from "@/types/database";
import RecentRecords from "@/components/features/user/profile/RecentRecords";
import GuestbookContent from "@/components/features/profile/GuestbookContent";
import ClassicalBox from "@/components/ui/ClassicalBox";
import { DecorativeLabel, FormattedText } from "@/components/ui";
import ProfileBioSection from "./ProfileBioSection";
import UserBioSection from "./UserBioSection";

interface ProfileContentProps {
  profile: PublicUserProfile;
  userId: string;
  isOwner: boolean;
  recentContents: UserContentPublic[];
  recentTotalPages: number;
  savedContentIds?: string[]; // 타인 프로필: 뷰어의 보유 콘텐츠 ID 목록
  guestbookEntries: GuestbookEntryWithAuthor[];
  guestbookTotal: number;
  guestbookCurrentUser: { id: string; nickname: string | null; avatar_url: string | null } | null;
}

export default function ProfileContent({
  profile,
  userId,
  isOwner,
  recentContents,
  recentTotalPages,
  savedContentIds,
  guestbookEntries,
  guestbookTotal,
  guestbookCurrentUser,
}: ProfileContentProps) {
  return (
    <div className="space-y-8 sm:space-y-12">
      {/* 1. Bio & Profile Info */}
      {profile.profile_type === "CELEB" ? (
        <ProfileBioSection profile={profile} isOwner={isOwner} />
      ) : (
        <UserBioSection profile={profile} isOwner={isOwner} />
      )}

      {/* 1.5. Consumption Philosophy (셀럽 전용) */}
      {profile.profile_type === "CELEB" && profile.consumption_philosophy && (
        <section className="animate-fade-in" style={{ animationDelay: "0.05s" }}>
          <ClassicalBox className="p-4 sm:p-6 md:p-8 bg-bg-card/40 shadow-2xl border-accent-dim/20">
            <div className="flex justify-center mb-6 sm:mb-8">
              <DecorativeLabel label="감상 철학" />
            </div>
            <div className="max-w-3xl mx-auto">
              <p className="text-sm md:text-base text-stone-300 font-serif leading-relaxed md:leading-loose whitespace-pre-line text-center">
                <FormattedText text={profile.consumption_philosophy} />
              </p>
            </div>
          </ClassicalBox>
        </section>
      )}

      {/* 2. Recent Records */}
      <section className="animate-fade-in" style={{ animationDelay: "0.1s" }}>
        <ClassicalBox className="p-4 sm:p-6 md:p-8 bg-bg-card/50 shadow-2xl border-accent-dim/20 relative">
          <div className="flex justify-center mb-6 sm:mb-8">
            <DecorativeLabel label="최근 기록" />
            <Link
              href={`/${userId}/records`}
              className="absolute right-4 md:right-8 top-4 md:top-8 text-[9px] sm:text-[10px] md:text-sm font-serif text-accent hover:text-white flex items-center gap-1 md:gap-2 group font-black bg-accent/10 px-2.5 sm:px-3 md:px-4 py-1.5 md:py-2 rounded-sm border border-accent/20 hover:bg-accent shadow-sm whitespace-nowrap transition-colors"
            >
              기록 보기
              <ChevronRight size={12} className="md:size-[18px] group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
          <RecentRecords items={recentContents} initialTotalPages={recentTotalPages} userId={userId} isOwner={isOwner} savedContentIds={savedContentIds} />
        </ClassicalBox>
      </section>

      {/* 3. Guestbook */}
      <section className="animate-fade-in" style={{ animationDelay: "0.2s" }}>
        <ClassicalBox className="p-4 sm:p-6 md:p-8 bg-bg-card/40 shadow-2xl border-accent-dim/20">
          <div className="flex justify-center mb-6 sm:mb-8">
            <DecorativeLabel label="방명록" />
          </div>
          <GuestbookContent
            profileId={userId}
            currentUser={guestbookCurrentUser}
            isOwner={isOwner}
            initialEntries={guestbookEntries}
            initialTotal={guestbookTotal}
          />
        </ClassicalBox>
      </section>
    </div>
  );
}
