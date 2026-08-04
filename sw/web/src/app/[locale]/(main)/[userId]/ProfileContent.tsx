"use client";

import { type PublicUserProfile } from "@/actions/user";
import { type CelebInfluenceDetail } from "@/actions/home/getCelebInfluence";
import { type SimilarByCelebResult } from "@/actions/persona/getSimilarByCelebId";
import { type GuestbookEntryWithAuthor } from "@/types/database";
import { useTranslations } from "next-intl";
import GuestbookContent from "@/components/features/profile/GuestbookContent";
import ClassicalBox from "@/components/ui/ClassicalBox";
import { DecorativeLabel } from "@/components/ui";
import ProfileBioSection from "./ProfileBioSection";
import UserBioSection from "./UserBioSection";
import ProfileInfluenceSection from "./ProfileInfluenceSection";
import ProfilePersonaSection from "./ProfilePersonaSection";
import ImageGallery from "@/components/features/profile/ImageGallery";
import { ModerationMenu } from "@/components/features/moderation";
import { ENUM_REPORT_TARGET_TYPE } from "@/constants/moderation";

interface ProfileContentProps {
  profile: PublicUserProfile;
  userId: string;
  isOwner: boolean;
  guestbookEntries: GuestbookEntryWithAuthor[];
  guestbookTotal: number;
  guestbookCurrentUserId: string | null;
  influenceData: CelebInfluenceDetail | null;
  personaData: SimilarByCelebResult | null;
}

export default function ProfileContent({
  profile,
  userId,
  isOwner,
  guestbookEntries,
  guestbookTotal,
  guestbookCurrentUserId,
  influenceData,
  personaData,
}: ProfileContentProps) {
  const t = useTranslations("profilePage");

  return (
    <div className="space-y-8 sm:space-y-12">
      {/* 신고·차단 — 남의 일반 사용자 프로필에만 뜬다. 인물(셀럽)은 운영이 만든 자료라 대상이 아니다 */}
      {profile.profile_type !== "CELEB" && !isOwner && (
        <div className="flex justify-end">
          <ModerationMenu
            targetType={ENUM_REPORT_TARGET_TYPE.USER}
            targetId={userId}
            authorId={userId}
            authorNickname={profile.nickname}
            viewerId={guestbookCurrentUserId}
            targetLabel={profile.nickname}
          />
        </div>
      )}

      {/* 1. Bio & Profile Info */}
      {profile.profile_type === "CELEB" ? (
        <ProfileBioSection profile={profile} isOwner={isOwner} />
      ) : (
        <UserBioSection profile={profile} isOwner={isOwner} />
      )}

      {/* 2. Influence (셀럽 전용) */}
      {profile.profile_type === "CELEB" && influenceData && (
        <section className="animate-fade-in" style={{ animationDelay: "0.075s" }}>
          <ProfileInfluenceSection data={influenceData} />
        </section>
      )}

      {/* 3. 16축 스펙트럼 + 유사 인물 (셀럽 전용) */}
      {profile.profile_type === "CELEB" && personaData?.targetPersona && (
        <section className="animate-fade-in" style={{ animationDelay: "0.088s" }}>
          <ProfilePersonaSection
            nickname={profile.nickname}
            targetPersona={personaData.targetPersona}
            similarCelebs={personaData.similarCelebs}
          />
        </section>
      )}

      {/* 4. Image Gallery (셀럽 전용) */}
      {profile.profile_type === "CELEB" && (
        <section className="animate-fade-in" style={{ animationDelay: "0.1s" }}>
          <ClassicalBox className="p-0 md:p-8 bg-bg-card/40 shadow-2xl border-accent-dim/20">
            <div className="flex justify-center mb-6 sm:mb-8">
              <DecorativeLabel label={t("imageSearch")} />
            </div>
            <ImageGallery nickname={profile.nickname} />
          </ClassicalBox>
        </section>
      )}

      {/* 5. Guestbook */}
      <section className="animate-fade-in" style={{ animationDelay: "0.125s" }}>
        <ClassicalBox className="p-0 md:p-8 bg-bg-card/40 shadow-2xl border-accent-dim/20">
          <div className="flex justify-center mb-6 sm:mb-8">
            <DecorativeLabel label={t("guestbook")} />
          </div>
          <GuestbookContent
            profileId={userId}
            currentUserId={guestbookCurrentUserId}
            isOwner={isOwner}
            initialEntries={guestbookEntries}
            initialTotal={guestbookTotal}
          />
        </ClassicalBox>
      </section>
    </div>
  );
}
