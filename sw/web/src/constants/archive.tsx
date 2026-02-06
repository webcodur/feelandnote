/*
  파일명: /constants/archive.tsx
  기능: 기록관(유저 페이지) 탭 상수 Single Source of Truth
  책임: 기록관 1단 탭과 열람실 2단 탭을 단일 원천으로 관리한다.
*/

export interface ArchiveTab {
  value: string;
  label: string;
  href: string;
  ownerOnly?: boolean;
  title: string;
  englishLabel: string;
  description: string;
  subDescription: string;
  ownerDescription: string;
  ownerSubDescription: string;
}

export interface ReadingSubTab {
  value: string;
  label: string;
  href: string;
  nonCeleb?: boolean; // true면 셀럽에게 미노출
  ownerOnly?: boolean; // true면 본인에게만 노출
}

export const ARCHIVE_TABS: ArchiveTab[] = [
  { value: "reception", label: "응접실", href: "", title: "응접실", englishLabel: "RECEPTION", description: "이 기록관의 주인을 소개합니다.", subDescription: "방명록에 당신의 발걸음을 한 줄 남겨보세요.", ownerDescription: "방문자가 가장 먼저 보게 되는 공간입니다.", ownerSubDescription: "프로필과 방명록을 확인하세요." },
  { value: "reading", label: "열람실", href: "/reading", title: "열람실", englishLabel: "READING ROOM", description: "읽고, 보고, 듣고, 몰입한 기록.", subDescription: "한 사람의 서재를 들여다보세요. 그가 어떤 사람인지 보이기 시작합니다.", ownerDescription: "당신이 읽고, 보고, 듣고, 몰입한 기록.", ownerSubDescription: "기록은 쌓일수록 당신을 말해줍니다." },
  { value: "merits", label: "공적비", href: "/merits", title: "공적비", englishLabel: "MERITS", description: "쌓아올린 여정의 이정표.", subDescription: "꾸준히 기록한 사람만이 남길 수 있는 흔적입니다.", ownerDescription: "당신이 걸어온 여정의 이정표.", ownerSubDescription: "새로운 칭호가 기다리고 있을지도 모릅니다." },
  { value: "chamber", label: "내실", href: "/chamber", ownerOnly: true, title: "내실", englishLabel: "CHAMBER", description: "당신만을 위한 공간.", subDescription: "계정과 개인 설정을 관리합니다.", ownerDescription: "당신만을 위한 공간.", ownerSubDescription: "계정과 개인 설정을 관리합니다." },
];

const READING_SUB_TABS: ReadingSubTab[] = [
  { value: "records", label: "기록", href: "" },
  { value: "interests", label: "관심", href: "/interests", nonCeleb: true },
  { value: "collections", label: "컬렉션", href: "/collections" },
  { value: "stats", label: "통계", href: "/stats" },
];

// 1단 탭 빌드 (ownerOnly 필터 + href 생성)
export function buildArchiveTabs(userId: string, isOwner: boolean): (ArchiveTab & { fullHref: string })[] {
  return ARCHIVE_TABS
    .filter((tab) => !tab.ownerOnly || isOwner)
    .map((tab) => ({ ...tab, fullHref: `/${userId}${tab.href}` }));
}

// 2단 탭 빌드 (nonCeleb/ownerOnly 필터 + href 생성)
export function buildReadingSubTabs(userId: string, isCeleb: boolean, isOwner: boolean): (ReadingSubTab & { fullHref: string })[] {
  return READING_SUB_TABS
    .filter((tab) => !tab.nonCeleb || !isCeleb)
    .filter((tab) => !tab.ownerOnly || isOwner)
    .map((tab) => ({ ...tab, fullHref: `/${userId}/reading${tab.href}` }));
}
