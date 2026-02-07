"use client";

import { type PublicUserProfile } from "@/actions/user";
import { type CelebInfluenceDetail } from "@/actions/home/getCelebInfluence";
import { type GuestbookEntryWithAuthor } from "@/types/database";
import GuestbookContent from "@/components/features/profile/GuestbookContent";
import ClassicalBox from "@/components/ui/ClassicalBox";
import { DecorativeLabel, FormattedText } from "@/components/ui";
import ProfileBioSection from "./ProfileBioSection";
import UserBioSection from "./UserBioSection";
import ProfileInfluenceSection from "./ProfileInfluenceSection";
import ImageGallery from "@/components/features/profile/ImageGallery";

interface ProfileContentProps {
  profile: PublicUserProfile;
  userId: string;
  isOwner: boolean;
  guestbookEntries: GuestbookEntryWithAuthor[];
  guestbookTotal: number;
  guestbookCurrentUser: { id: string; nickname: string | null; avatar_url: string | null } | null;
  influenceData: CelebInfluenceDetail | null;
}

export default function ProfileContent({
  profile,
  userId,
  isOwner,
  guestbookEntries,
  guestbookTotal,
  guestbookCurrentUser,
  influenceData,
}: ProfileContentProps) {
  return (
    <div className="space-y-8 sm:space-y-12">
      {/* 1. Bio & Profile Info */}
      {profile.profile_type === "CELEB" ? (
        <ProfileBioSection profile={profile} isOwner={isOwner} />
      ) : (
        <UserBioSection profile={profile} isOwner={isOwner} />
      )}

      {/* 2. Consumption Philosophy (셀럽 전용) */}
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

      {/* 3. Influence (셀럽 전용) */}
      {profile.profile_type === "CELEB" && influenceData && (
        <section className="animate-fade-in" style={{ animationDelay: "0.075s" }}>
          <ProfileInfluenceSection data={influenceData} />
        </section>
      )}

      {/* 4. Image Gallery (셀럽 전용) */}
      {profile.profile_type === "CELEB" && (
        <section className="animate-fade-in" style={{ animationDelay: "0.1s" }}>
          <ClassicalBox className="p-4 sm:p-6 md:p-8 bg-bg-card/40 shadow-2xl border-accent-dim/20">
            <div className="flex justify-center mb-6 sm:mb-8">
              <DecorativeLabel label="갤러리" />
            </div>
            <ImageGallery nickname={profile.nickname} />
          </ClassicalBox>
        </section>
      )}

      {/* 5. Guestbook */}
      <section className="animate-fade-in" style={{ animationDelay: "0.125s" }}>
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
