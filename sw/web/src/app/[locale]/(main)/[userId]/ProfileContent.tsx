"use client";

import { useTranslations } from "next-intl";
import { type PublicUserProfile } from "@/actions/user";
import GuestbookContent from "@/components/features/profile/GuestbookContent";
import { ModerationMenu } from "@/components/features/moderation";
import ClassicalBox from "@/components/ui/ClassicalBox";
import { DecorativeLabel } from "@/components/ui";
import { ENUM_REPORT_TARGET_TYPE } from "@/constants/moderation";
import { type GuestbookEntryWithAuthor } from "@/types/database";
import UserBioSection from "./UserBioSection";

interface ProfileContentProps {
  profile: PublicUserProfile;
  userId: string;
  isOwner: boolean;
  guestbookEntries: GuestbookEntryWithAuthor[];
  guestbookTotal: number;
  guestbookCurrentUserId: string | null;
}

export default function ProfileContent({
  profile,
  userId,
  isOwner,
  guestbookEntries,
  guestbookTotal,
  guestbookCurrentUserId,
}: ProfileContentProps) {
  const t = useTranslations("profilePage");

  return (
    <div className="space-y-8 sm:space-y-12">
      {!isOwner && (
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

      <UserBioSection profile={profile} isOwner={isOwner} />

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
