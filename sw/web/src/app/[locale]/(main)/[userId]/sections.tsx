/*
  파일명: /app/(main)/[userId]/sections.tsx
  기능: 회원 프로필 방명록 구획 — 목록 조회와 본인 열람 시 읽음 처리를 함께 맡는다
  책임: 첫 화면(프로필 소개)을 붙잡지 않도록 방명록 조회만 따로 기다린다.
        본인이 자기 방명록을 열람할 때의 읽음 처리 쓰기도 여기서 한다.
*/ // ------------------------------

import AsyncIntlProvider from "@/components/shared/AsyncIntlProvider";
import { RetryBlock } from "@/components/ui/pending";
import { getGuestbookEntries, markGuestbookAsRead } from "@/actions/guestbook";
import GuestbookContent from "@/components/features/profile/GuestbookContent";

interface Props {
  userId: string;
  isOwner: boolean;
  currentUserId: string | null;
}

export async function GuestbookSection({ userId, isOwner, currentUserId }: Props) {
  // 조회만 try로 감싼다 — 성공 경로의 JSX 구성은 밖에서 한다(react-hooks/error-boundaries)
  let result: Awaited<ReturnType<typeof getGuestbookEntries>>;
  try {
    result = await getGuestbookEntries({ profileId: userId, subjectKind: "member" });
  } catch (error) {
    console.error("[userId] 방명록 조회 실패:", error);
    return <RetryBlock />;
  }

  // 본인이 자기 방명록을 열람하는 순간에만 읽음 처리한다 — 첫 화면을 붙잡지 않도록 이 구획 안에서 한다
  if (isOwner) {
    await markGuestbookAsRead();
  }

  return (
    <AsyncIntlProvider>
      <GuestbookContent
        profileId={userId}
        currentUserId={currentUserId}
        isOwner={isOwner}
        initialEntries={result.entries}
        initialTotal={result.total}
      />
    </AsyncIntlProvider>
  );
}
