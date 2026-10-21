import { flushSync } from "react-dom";

type ModalLayer = { element: HTMLElement; close: () => void; canClose: () => boolean };
const layers = new Set<ModalLayer>();
const STATE_KEY = "__feelandnoteModal";
let token = "";
let sequence = 0;
let returnUrl = "";
let returnState: object | null = null;
let hasEntry = false;
let traversing = false;
let navigating = false;
let timer: ReturnType<typeof setTimeout> | undefined;
let detach: (() => void) | undefined;
let pendingNavigation: (() => void) | undefined;

// 열린 창 전체가 기록 한 칸을 공유한다. 중첩 창은 맨 위부터 닫고 같은 칸을 다시 사용한다.
function topLayer() {
  return [...layers].sort((a, b) => {
    const aOverlay = a.element.closest("[data-modal-history-layer]") ?? a.element;
    const bOverlay = b.element.closest("[data-modal-history-layer]") ?? b.element;
    const difference = (Number(getComputedStyle(aOverlay).zIndex) || 0) - (Number(getComputedStyle(bOverlay).zIndex) || 0);
    if (difference) return difference;
    return a.element.compareDocumentPosition(b.element) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1;
  }).at(-1);
}

function ownsEntry() {
  return hasEntry && window.history.state?.[STATE_KEY] === token;
}

function rememberEntry() {
  const state = { ...window.history.state };
  delete state[STATE_KEY];
  returnState = state;
}

function scheduleSync() {
  clearTimeout(timer);
  // StrictMode 재실행·모달 교체·닫기와 페이지 이동을 한 번에 반영한다.
  timer = setTimeout(syncHistory, 0);
}

function syncHistory() {
  if (traversing) return;
  if (navigating && layers.size) {
    [...layers].forEach(layer => layer.close());
    return;
  }
  if (layers.size && !navigating) {
    if (!detach) installHistory();
    if (ownsEntry()) return;
    token = String(++sequence);
    returnUrl = window.location.href;
    rememberEntry();
    window.history.pushState({ ...window.history.state, [STATE_KEY]: token }, "");
    hasEntry = true;
    return;
  }
  if (ownsEntry()) {
    traversing = true;
    window.history.back();
    return;
  }
  if (!layers.size) {
    detach?.();
    detach = undefined;
    hasEntry = false;
    navigating = false;
  }
}

function installHistory() {
  const history = window.history;
  const push = history.pushState;
  const replace = history.replaceState;
  const restoreCurrentRoute = () => {
    // 이미 페이지 전환이 시작된 뒤 모달 기록이 빠졌다면 최신 트리로 라우터도 다시 맞춘다.
    const state = { ...history.state };
    delete state.__NA;
    delete state._N;
    replace.call(history, state, "", window.location.href);
  };
  const pushState: History["pushState"] = (data, unused, url) => {
    if (traversing) {
      pendingNavigation = () => push.call(history, data, unused, url);
      navigating = true;
      return;
    }
    if (!ownsEntry()) return push.call(history, data, unused, url);
    const destination = new URL(url ?? window.location.href, window.location.href);
    if (destination.href === window.location.href) {
      replace.call(history, { ...data, [STATE_KEY]: token }, unused, url);
      rememberEntry();
      return;
    }
    // 상세 페이지로 이동할 때 모달의 한 칸을 새 페이지로 바꾼다.
    // Next.js의 라우트 복원용 state는 그대로 전달한다.
    replace.call(history, data, unused, url);
    hasEntry = false;
    navigating = true;
    scheduleSync();
  };
  const replaceState: History["replaceState"] = (data, unused, url) => {
    if (traversing) {
      const destination = new URL(url ?? window.location.href, window.location.href);
      // Next의 이전 canonical 동기화가 모달에서 확정한 검색 조건을 덮어쓰지 않게 한다.
      // 다른 페이지로 향하는 실제 이동은 아래 대기열에 그대로 남긴다.
      if ((data?.__NA || data?._N) && destination.pathname === new URL(returnUrl).pathname && destination.href !== returnUrl) return;
      pendingNavigation = () => replace.call(history, data, unused, url);
      navigating = true;
      return;
    }
    if (!ownsEntry()) return replace.call(history, data, unused, url);
    const destination = new URL(url ?? window.location.href, window.location.href);
    if (destination.pathname === new URL(returnUrl).pathname) {
      returnUrl = destination.href;
      // 외부 호출에 __NA를 덧붙이면 Next.js가 검색어·앵커 동기화를 생략한다.
      replace.call(history, { ...data, [STATE_KEY]: token }, unused, url);
      rememberEntry();
      return;
    }
    replace.call(history, data, unused, url);
    hasEntry = false;
    navigating = true;
    scheduleSync();
  };
  const onPopState = () => {
    if (ownsEntry() || (!hasEntry && !traversing)) return;
    const closing = traversing;
    traversing = false;
    hasEntry = false;
    const samePage = new URL(returnUrl).pathname === window.location.pathname;
    if (samePage) {
      // 필터·앵커 변경은 모달을 닫은 뒤에도 남긴다.
      const urlChanged = window.location.href !== returnUrl;
      replace.call(history, returnState, "", returnUrl);
      if (urlChanged) restoreCurrentRoute();
      if (!closing) {
        const top = topLayer();
        if (top?.canClose()) flushSync(top.close);
      }
    } else {
      // 여러 단계 돌아가기나 다른 페이지로 이동하는 동작은 막지 않는다.
      navigating = true;
      flushSync(() => [...layers].forEach(layer => layer.close()));
    }
    const navigate = pendingNavigation;
    pendingNavigation = undefined;
    navigate?.();
    if (navigate) restoreCurrentRoute();
    syncHistory();
  };
  history.pushState = pushState;
  history.replaceState = replaceState;
  window.addEventListener("popstate", onPopState);
  detach = () => {
    if (history.pushState === pushState) history.pushState = push;
    if (history.replaceState === replaceState) history.replaceState = replace;
    window.removeEventListener("popstate", onPopState);
  };
}

export function registerModalHistory(layer: ModalLayer) {
  layers.add(layer);
  scheduleSync();
  return () => {
    layers.delete(layer);
    scheduleSync();
  };
}
