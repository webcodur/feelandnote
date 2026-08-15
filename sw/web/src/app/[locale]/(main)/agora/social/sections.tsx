/*
  파일명: /app/(main)/agora/social/sections.tsx
  기능: 광장 소셜 페이지 구획 — 친구·팔로잉·팔로워·취향 유사 각각의 조회와 실패 처리
  책임: 구획 하나가 자기 조회만 기다리게 하고, 실패하면 제자리에 다시 시도 안내를 세운다.
        여기서 던지면 안 된다 — 구획 컴포넌트가 스스로 try/catch로 잡는다.
*/ // ------------------------------

import AsyncIntlProvider from "@/components/shared/AsyncIntlProvider";
import { RetryBlock } from "@/components/ui/pending";
import { getFriends, getMyFollowing, getFollowers, getSimilarUsers } from "@/actions/user";
import FriendsSectionBody from "@/components/features/user/explore/sections/FriendsSection";
import FollowingSectionBody from "@/components/features/user/explore/sections/FollowingSection";
import FollowersSectionBody from "@/components/features/user/explore/sections/FollowersSection";
import SimilarSectionBody from "@/components/features/user/explore/sections/SimilarSection";

/** 비로그인 조회 실패 — 원래도 있던 "로그인 안 함" 신호다. 진짜 실패와 구분해 조용히 빈 목록으로 넘긴다 */
function isUnauthorized(error?: string): boolean {
  return error === "UNAUTHORIZED";
}

/** 친구(맞팔) 구획 — 첫 화면이라 가장 먼저 뜬다 */
export async function FriendsSection() {
  // 조회만 try로 감싼다 — 성공 경로의 JSX 구성은 밖에서 한다(react-hooks/error-boundaries)
  let result: Awaited<ReturnType<typeof getFriends>>;
  try {
    result = await getFriends();
  } catch (error) {
    console.error("[agora/social] 친구 조회 실패:", error);
    return <RetryBlock />;
  }
  if (!result.success && !isUnauthorized(result.error)) return <RetryBlock />;

  return (
    <AsyncIntlProvider>
      <FriendsSectionBody friends={result.success ? result.data : []} />
    </AsyncIntlProvider>
  );
}

/** 팔로잉 구획 — 맞팔(친구)은 제외하고 보여준다 */
export async function FollowingSection() {
  let result: Awaited<ReturnType<typeof getMyFollowing>>;
  try {
    result = await getMyFollowing();
  } catch (error) {
    console.error("[agora/social] 팔로잉 조회 실패:", error);
    return <RetryBlock />;
  }
  if (!result.success && !isUnauthorized(result.error)) return <RetryBlock />;

  return (
    <AsyncIntlProvider>
      <FollowingSectionBody following={result.success ? result.data.filter((f) => !f.is_friend) : []} />
    </AsyncIntlProvider>
  );
}

/** 팔로워 구획 — 로그인 상태가 아니면 빈 목록을 보여준다(실패가 아니다) */
export async function FollowersSection({ profileId }: { profileId: string | null }) {
  if (!profileId) {
    return (
      <AsyncIntlProvider>
        <FollowersSectionBody followers={[]} />
      </AsyncIntlProvider>
    );
  }

  let result: Awaited<ReturnType<typeof getFollowers>>;
  try {
    result = await getFollowers(profileId);
  } catch (error) {
    console.error("[agora/social] 팔로워 조회 실패:", error);
    return <RetryBlock />;
  }
  if (!result.success) return <RetryBlock />;

  return (
    <AsyncIntlProvider>
      <FollowersSectionBody followers={result.data.filter((f) => !f.is_following)} />
    </AsyncIntlProvider>
  );
}

/** 취향 유사 유저 구획 */
export async function SimilarSection() {
  let result: Awaited<ReturnType<typeof getSimilarUsers>>;
  try {
    result = await getSimilarUsers(10);
  } catch (error) {
    console.error("[agora/social] 취향 유사 조회 실패:", error);
    return <RetryBlock />;
  }

  return (
    <AsyncIntlProvider>
      <SimilarSectionBody similarUsers={result.users} algorithm={result.algorithm} />
    </AsyncIntlProvider>
  );
}
