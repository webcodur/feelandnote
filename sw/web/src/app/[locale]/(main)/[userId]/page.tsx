import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getGuestbookEntries, markGuestbookAsRead } from "@/actions/guestbook";
import { getUserProfile } from "@/actions/user";
import { getLocalizedAlternates } from "@/lib/seo";
import { createClient } from "@/lib/supabase/server";
import ProfileContent from "./ProfileContent";

interface PageProps {
  params: Promise<{ userId: string; locale: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { userId } = await params;
  const t = await getTranslations("profilePage");
  const result = await getUserProfile(userId);

  if (!result.success || !result.data) {
    return { title: t("userNotFound") };
  }

  const profile = result.data;
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
  const { userId } = await params;
  const supabase = await createClient();
  const [authResult, profileResult, guestbookResult] = await Promise.all([
    supabase.auth.getUser(),
    getUserProfile(userId),
    getGuestbookEntries({ profileId: userId, subjectKind: "member" }),
  ]);

  if (!profileResult.success || !profileResult.data) {
    notFound();
  }

  const currentUser = authResult.data.user;
  const isOwner = currentUser?.id === userId;

  if (isOwner) {
    await markGuestbookAsRead();
  }

  return (
    <ProfileContent
      profile={profileResult.data}
      userId={userId}
      isOwner={isOwner}
      guestbookEntries={guestbookResult.entries}
      guestbookTotal={guestbookResult.total}
      guestbookCurrentUserId={currentUser?.id ?? null}
    />
  );
}
