/*
  파일명: /i18n/message-scope.ts
  기능: 브라우저로 내려보낼 번역 문구를 화면별로 골라낸다
  책임: 번역 사전 전체는 187KB다. ISR로 굳는 인물·작품 상세는 이 덩어리가 HTML과
        RSC 양쪽에 실려 한 장당 약 370KB를 차지했다(2026-08-16 실측).
        공통 뼈대만 최상위 레이아웃에서 내리고, 나머지는 화면별로 덧댄다.
*/ // ------------------------------

import type { AbstractIntlMessages } from "next-intl";

type MessageNode = AbstractIntlMessages | string;

/**
 * 모든 화면이 쓰는 공통 뼈대. 머리말·발바닥·검색창·음악 재생기·빠른 기록처럼
 * 어느 주소에서나 떠 있는 요소가 여기에 기댄다.
 * 점(.)이 들어간 항목은 그 가지만 골라 담는다.
 */
export const BASE_MESSAGE_PATHS = [
  "site",
  "layout",
  "shared",
  "common",
  "nav",
  "pending",
  "actionErrors",
  "status",
  "notFound",
  "share",
  "title",
  "pages",
  "notifications",
  "notificationMessages",
  "profession",
  "moreMenu",
  "contextHeader",
  "factionMedia",
  "popularBooks",
  "musicPlayer",
  "content",
  "profileSection",
  "searchResult",
  "quickRecord",
  "note",
  "recommendation",
  "recordInteraction",
  "recordInfo",
  "creation",
  "customContent",
  "banner",
  "actionModal",
  "agora.section",
  "agoraGame",
  "export",
  "userBio",
  "todayFigure",
  "explore.ui",
  "celebPage.showDetail",
  "celebPage.hideDetail",
] as const;

/** 인물 상세가 공통 뼈대에 더해 필요로 하는 문구 */
export const CELEB_MESSAGE_PATHS = [
  "celebPage",
  "contentDetail",
  "archiveSearch",
  "moderation",
  "home.ui",
  "profilePage.influence",
  // 세력도감(FactionShowcase)과 게임 갈무리 화면이 통째로 기댄다. 빠지면 화면에
  // LANDING.FACTIONROSTER 같은 키 이름이 그대로 뜬다.
  "landing",
] as const;

/** 작품 상세가 공통 뼈대에 더해 필요로 하는 문구 */
export const CONTENT_MESSAGE_PATHS = [
  "contentDetail",
  "library.curated",
  // 감상 카드의 인물 얼굴을 누르면 CelebDetailModal이 열린다. 이 모달과 그 안의
  // 감상 카드·키워드 모달이 통째로 기댄다. 빠지면 버튼에 home.ui.followLabel
  // 같은 키 이름이 그대로 뜬다.
  "home.ui",
  "celebPage.personGuide",
] as const;

const isPlainObject = (value: unknown): value is AbstractIntlMessages =>
  typeof value === "object" && value !== null && !Array.isArray(value);

function readPath(source: AbstractIntlMessages, path: string): MessageNode | undefined {
  return path.split(".").reduce<MessageNode | undefined>(
    (node, key) => (isPlainObject(node) ? node[key] : undefined),
    source,
  );
}

function writePath(target: AbstractIntlMessages, path: string, value: MessageNode) {
  const keys = path.split(".");
  const last = keys.pop()!;
  const parent = keys.reduce<AbstractIntlMessages>((node, key) => {
    if (!isPlainObject(node[key])) node[key] = {};
    return node[key] as AbstractIntlMessages;
  }, target);
  parent[last] = value;
}

/** 지정한 경로만 담은 새 사전을 만든다. 없는 경로는 조용히 건너뛴다. */
export function pickMessages(
  source: AbstractIntlMessages,
  paths: readonly string[],
): AbstractIntlMessages {
  const picked: AbstractIntlMessages = {};
  for (const path of paths) {
    const value = readPath(source, path);
    if (value !== undefined) writePath(picked, path, value);
  }
  return picked;
}

/**
 * 공통 뼈대에 통째로 들어가지 않은 나머지 묶음. 새 번역 파일이 늘어도
 * 자동으로 여기에 포함돼 문구가 사라지지 않는다.
 */
export function restMessagePaths(source: AbstractIntlMessages): string[] {
  const whole = new Set(
    BASE_MESSAGE_PATHS.filter((path) => !path.includes(".")) as readonly string[],
  );
  return Object.keys(source).filter((key) => !whole.has(key));
}

/** 두 사전을 합친다. 나중 값이 이긴다. */
export function mergeMessages(
  base: AbstractIntlMessages,
  extra: AbstractIntlMessages,
): AbstractIntlMessages {
  const merged: AbstractIntlMessages = { ...base };
  for (const [key, value] of Object.entries(extra)) {
    const current = merged[key];
    merged[key] =
      isPlainObject(current) && isPlainObject(value)
        ? mergeMessages(current, value)
        : value;
  }
  return merged;
}
