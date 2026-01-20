/*
  파일명: /app/(main)/archive/playlists/page.tsx
  기능: 재생목록 페이지
  책임: Playlists 컴포넌트를 렌더링한다.
*/ // ------------------------------

import Playlists from "@/components/features/user/playlists/Playlists";

export const metadata = { title: "컬렉션" };

export default function Page() {
  return <Playlists />;
}
