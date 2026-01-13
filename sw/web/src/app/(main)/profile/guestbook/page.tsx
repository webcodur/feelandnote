/*
  파일명: /app/(main)/profile/guestbook/page.tsx
  기능: 방명록 페이지
  책임: 사용자의 방명록을 표시하고 관리한다.
*/ // ------------------------------

"use client";

import { useState, useEffect } from "react";
import { BookOpen, Loader2 } from "lucide-react";
import { SectionHeader } from "@/components/ui";
import { getProfile } from "@/actions/user";
import { getGuestbookEntries, markGuestbookAsRead } from "@/actions/guestbook";
import GuestbookContent from "@/components/features/profile/GuestbookContent";
import type { GuestbookEntryWithAuthor, Profile } from "@/types/database";

export default function Page() {
  const [currentUser, setCurrentUser] = useState<Profile | null>(null);
  const [entries, setEntries] = useState<GuestbookEntryWithAuthor[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      try {
        const profile = await getProfile();
        if (profile) {
          const user: Profile = {
            id: profile.id,
            email: profile.email,
            nickname: profile.nickname,
            avatar_url: profile.avatar_url,
            gemini_api_key: profile.gemini_api_key,
            profile_type: "USER",
            claimed_by: null,
            is_verified: false,
            bio: profile.bio ?? null,
            profession: null,
            created_at: new Date().toISOString(),
          };
          setCurrentUser(user);

          const result = await getGuestbookEntries({ profileId: profile.id });
          setEntries(result.entries);
          setTotal(result.total);

          // 방명록 읽음 처리
          await markGuestbookAsRead();
        }
      } catch (error) {
        console.error("Failed to load guestbook:", error);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  return (
    <>
      <SectionHeader
        title="방명록"
        description="방문자들의 메시지를 확인하세요"
        icon={<BookOpen size={20} />}
        className="mb-4"
      />

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 size={28} className="animate-spin text-accent" />
        </div>
      ) : currentUser ? (
        <GuestbookContent
          profileId={currentUser.id}
          currentUser={currentUser}
          isOwner={true}
          initialEntries={entries}
          initialTotal={total}
        />
      ) : (
        <div className="text-center py-12 text-text-secondary text-sm">
          로그인이 필요합니다.
        </div>
      )}
    </>
  );
}
