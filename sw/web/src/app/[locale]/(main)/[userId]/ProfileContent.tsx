"use client";

import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { type PublicUserProfile } from "@/actions/user";
import { ModerationMenu } from "@/components/features/moderation";
import ClassicalBox from "@/components/ui/ClassicalBox";
import { DecorativeLabel } from "@/components/ui";
import { ENUM_REPORT_TARGET_TYPE } from "@/constants/moderation";
import UserBioSection from "./UserBioSection";

interface ProfileContentProps {
  profile: PublicUserProfile;
  userId: string;
  isOwner: boolean;
  guestbookCurrentUserId: string | null;
  /** 방명록 구획 — 서버가 Suspense로 감싸 넘겨준다. 조회를 여기서 기다리지 않는다 */
  guestbookSlot: ReactNode;
}

export default function ProfileContent({
  profile,
  userId,
  isOwner,
  guestbookCurrentUserId,
  guestbookSlot,
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
          {guestbookSlot}
        </ClassicalBox>
      </section>
    </div>
  );
}
