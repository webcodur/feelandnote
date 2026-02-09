/*
  파일명: /constants/archive.tsx
  기능: 기록관 탭 상수 Single Source of Truth
  책임: 플랫 탭 네비게이션 구조를 단일 원천으로 관리한다.
*/

export interface ArchiveTab {
  value: string;
  label: string;
  href: string;
  ownerOnly?: boolean;
  nonCeleb?: boolean;
  title: string;
  englishLabel: string;
  description: string;
  subDescription: string;
  ownerDescription: string;
  ownerSubDescription: string;
}

export const ARCHIVE_TABS: ArchiveTab[] = [
  {
    value: "intro",
    label: "소개",
    href: "",
    title: "소개",
    englishLabel: "PROFILE",
    description: "이 기록관의 주인을 소개합니다.",
    subDescription: "방명록에 당신의 발걸음을 한 줄 남겨보세요.",
    ownerDescription: "방문자가 가장 먼저 보게 되는 공간입니다.",
    ownerSubDescription: "프로필과 방명록을 확인하세요.",
  },
  {
    value: "records",
    label: "서재",
    href: "/reading",
    title: "서재",
    englishLabel: "LIBRARY",
    description: "당신의 취향과 경험이 머무는 공간.",
    subDescription: "한 사람의 서재를 들여다보세요. 그가 어떤 사람인지 보이기 시작합니다.",
    ownerDescription: "취향과 경험이 머무는 당신만의 공간.",
    ownerSubDescription: "서재는 채워질수록 당신을 닮아갑니다.",
  },

  {
    value: "collections",
    label: "묶음",
    href: "/reading/collections",
    title: "묶음",
    englishLabel: "COLLECTIONS",
    description: "직접 엮은 콘텐츠 묶음.",
    subDescription: "취향이 큐레이션이 될 때, 기록은 작품이 됩니다.",
    ownerDescription: "당신만의 기준으로 엮은 콘텐츠 묶음.",
    ownerSubDescription: "흩어진 기록에 맥락을 부여하세요.",
  },
  {
    value: "merits",
    label: "업적",
    href: "/merits",
    title: "업적",
    englishLabel: "MERITS",
    description: "쌓아올린 여정의 이정표.",
    subDescription: "꾸준히 기록한 사람만이 남길 수 있는 흔적입니다.",
    ownerDescription: "당신이 걸어온 여정의 이정표.",
    ownerSubDescription: "새로운 칭호가 기다리고 있을지도 모릅니다.",
  },
  {
    value: "chamber",
    label: "관리",
    href: "/chamber",
    ownerOnly: true,
    title: "관리",
    englishLabel: "SETTINGS",
    description: "당신만을 위한 공간.",
    subDescription: "통계와 설정을 관리합니다.",
    ownerDescription: "당신만을 위한 공간.",
    ownerSubDescription: "통계 확인과 계정 설정을 관리합니다.",
  },
];

// 탭 빌드 (ownerOnly/nonCeleb 필터 + href 생성)
export function buildArchiveTabs(userId: string, isOwner: boolean, isCeleb = false): (ArchiveTab & { fullHref: string })[] {
  return ARCHIVE_TABS
    .filter((tab) => !tab.ownerOnly || isOwner)
    .filter((tab) => !tab.nonCeleb || !isCeleb)
    .map((tab) => ({ ...tab, fullHref: `/${userId}${tab.href}` }));
}
