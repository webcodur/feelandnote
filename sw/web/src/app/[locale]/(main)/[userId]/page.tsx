import type { Metadata } from "next";
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { getMemberRouteProfile } from "@/lib/profile-route";
import { getLocalizedAlternates } from "@/lib/seo";
import { createClient } from "@/lib/db/server";
import { PendingBlock } from "@/components/ui/pending";
import ProfileContent from "./ProfileContent";
import { GuestbookSection } from "./sections";

interface PageProps {
  params: Promise<{ userId: string; locale: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { userId, locale } = await params;
  const t = await getTranslations("profilePage");
  const profile = await getMemberRouteProfile(userId, locale);
  const description = t("metaDescription", { nickname: profile.nickname });

  return {
    title: profile.nickname,
    description,
    openGraph: {
      title: profile.nickname,
      description,
      images: profile.avatar_url ? [profile.avatar_url] : [],
      type: "profile",
    },
    twitter: {
      card: "summary",
      title: profile.nickname,
      description,
      images: profile.avatar_url ? [profile.avatar_url] : [],
    },
    alternates: await getLocalizedAlternates(`/${userId}`),
  };
}

export default async function OverviewPage({ params }: PageProps) {
  const { userId, locale } = await params;
  const db = await createClient();
  // 프로필 소개는 즉시 그린다. 방명록은 조회·읽음 처리가 붙어 있어 별도 구획(Suspense)으로 뗀다
  const [authResult, profile] = await Promise.all([
    db.auth.getUser(),
    getMemberRouteProfile(userId, locale),
  ]);

  const currentUser = authResult.data.user;
  const isOwner = currentUser?.id === userId;

  return (
    <ProfileContent
      profile={profile}
      userId={userId}
      isOwner={isOwner}
      guestbookCurrentUserId={currentUser?.id ?? null}
      guestbookSlot={
        <Suspense fallback={<PendingBlock variant="rows" count={3} />}>
          <GuestbookSection userId={userId} isOwner={isOwner} currentUserId={currentUser?.id ?? null} />
        </Suspense>
      }
    />
  );
}
