import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/actions/user";
import ArchiveHubView from "@/components/views/main/ArchiveHubView";

export default async function Page() {
  const supabase = await createClient();

  // 미들웨어에서 이미 인증 확인됨
  const { data: { user } } = await supabase.auth.getUser();

  // 내 프로필 조회
  const myProfile = await getProfile();

  // 프로필이 없으면 기본값 사용
  const profile = myProfile || {
    id: user?.id || "",
    email: user?.email || null,
    nickname: "User",
    avatar_url: null,
    gemini_api_key: null,
  };

  // 친구 목록 조회 (상호 팔로우)
  // TODO: 소셜 기능 구현 후 실제 데이터로 교체
  const friends: Array<{ id: string; nickname: string; avatar_url: string | null; content_count: number }> = [];

  // 셀럽 목록 조회 (팔로우 중인 인플루언서)
  // TODO: 소셜 기능 구현 후 실제 데이터로 교체
  const celebs: Array<{ id: string; nickname: string; avatar_url: string | null; content_count: number }> = [];

  return (
    <ArchiveHubView
      myProfile={profile}
      friends={friends}
      celebs={celebs}
    />
  );
}
