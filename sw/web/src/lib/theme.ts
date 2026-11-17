import { DEFAULT_THEME, THEME_BROWSER_COLOR, THEME_STORAGE_KEY, isTheme, type Theme } from "@/constants/theme";

const THEME_CHANGE_EVENT = "fn-theme-change";

export function readStoredTheme(): Theme {
  try {
    const value = localStorage.getItem(THEME_STORAGE_KEY);
    return isTheme(value) ? value : DEFAULT_THEME;
  } catch {
    return DEFAULT_THEME;
  }
}

/** 고른 테마가 바뀌면(이 탭의 전환·다른 탭의 저장) 알린다 — useSyncExternalStore 구독용 */
export function subscribeTheme(onChange: () => void) {
  window.addEventListener(THEME_CHANGE_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(THEME_CHANGE_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

/** html[data-theme]와 주소창 색을 맞춘다. save면 선택을 기억하고 구독자에게 알린다. */
export function applyTheme(theme: Theme, { save = false } = {}) {
  const root = document.documentElement;
  if (theme === DEFAULT_THEME) root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", theme);
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", THEME_BROWSER_COLOR[theme]);
  if (!save) return;
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {}
  window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
}

/**
 * 축·매체마다 정한 강조색(다크 바탕용 밝은 색)을 글자로 쓸 때 라이트에서는 같은 색상을 어둡게 내린다.
 * 금색 #d4af37 기준으로 한지 바탕 대비 약 6:1이 된다.
 */
export const readableAccent = (color: string) => `light-dark(color-mix(in oklab, ${color} 55%, #000), ${color})`;
