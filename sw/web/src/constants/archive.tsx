/*
  파일명: /constants/archive.tsx
  기능: 기록관 탭 상수 Single Source of Truth
  책임: 플랫 탭 네비게이션 구조를 단일 원천으로 관리한다.
*/

// 표시 문구는 messages/{locale}/profile.json의 archiveTabs.<value> 에 있다.
// value가 곧 메시지 키다.
export interface ArchiveTab {
  value: string;
  href: string;
  ownerOnly?: boolean;
  nonCeleb?: boolean;
  englishLabel: string; // 장식용 로케일 무관 표기
}

const ARCHIVE_TABS: ArchiveTab[] = [
  { value: "intro", href: "", englishLabel: "PROFILE" },
  { value: "records", href: "/reading", englishLabel: "LIBRARY" },
  { value: "collections", href: "/reading/collections", englishLabel: "COLLECTIONS" },
  { value: "merits", href: "/merits", englishLabel: "MERITS" },
  { value: "chamber", href: "/chamber", ownerOnly: true, englishLabel: "SETTINGS" },
];

// 탭 빌드 (ownerOnly/nonCeleb 필터 + href 생성)
export function buildArchiveTabs(userId: string, isOwner: boolean, isCeleb = false): (ArchiveTab & { fullHref: string })[] {
  return ARCHIVE_TABS
    .filter((tab) => !tab.ownerOnly || isOwner)
    .filter((tab) => !tab.nonCeleb || !isCeleb)
    .map((tab) => ({ ...tab, fullHref: `/${userId}${tab.href}` }));
}
