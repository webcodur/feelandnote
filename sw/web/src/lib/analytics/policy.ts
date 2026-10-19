/** 운영 분석에 로컬 빌드와 상주 점검을 섞지 않는다. 브라우저별 선택이다. */
export const ANALYTICS_STORAGE_KEY = "feelandnote:analytics:disabled";
const PRODUCTION_HOST = "feelandnote.com";
let disabledForPage = false;

export function isProductionAnalyticsLocation(location: Pick<Location, "hostname" | "protocol">) {
  return location.hostname === PRODUCTION_HOST && location.protocol === "https:";
}

export function readAnalyticsDisabled(search: string, storage: Pick<Storage, "getItem" | "setItem" | "removeItem">) {
  const choice = new URLSearchParams(search).get("analytics");
  if (choice === "off") {
    disabledForPage = true;
    try { storage.setItem(ANALYTICS_STORAGE_KEY, "1"); } catch { /* 현재 페이지에서는 계속 제외 */ }
    return true;
  }
  if (choice === "on") {
    try { storage.removeItem(ANALYTICS_STORAGE_KEY); } catch { return true; }
    disabledForPage = false;
    return false;
  }
  try { return disabledForPage || storage.getItem(ANALYTICS_STORAGE_KEY) === "1"; }
  catch { return true; }
}

export function canTrackAnalytics() {
  if (typeof window === "undefined" || process.env.NODE_ENV !== "production"
    || !isProductionAnalyticsLocation(window.location)) return false;
  try { return !readAnalyticsDisabled(window.location.search, window.localStorage); }
  catch { return false; }
}
