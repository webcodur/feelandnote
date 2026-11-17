/*
  화면 테마 단일원천. 색 값은 globals.css의 light-dark() 토큰이 쥐고,
  여기서는 어느 쪽을 고를지(html[data-theme])와 그 선택을 기억하는 규약만 둔다.
*/

export const THEMES = ["dark", "light"] as const;
export type Theme = (typeof THEMES)[number];

/** 서비스는 다크로 설계되어 있어 처음 온 사람은 다크로 본다. 라이트는 고른 사람만 본다. */
export const DEFAULT_THEME: Theme = "dark";

export const THEME_STORAGE_KEY = "fn-theme";

/** 브라우저 주소창 색 — 각 테마의 헤더 바탕과 같다(라이트는 짙은 크래프트 틀, globals.css .theme-frame) */
export const THEME_BROWSER_COLOR: Readonly<Record<Theme, string>> = {
  dark: "#0b0a09",
  light: "#fffefb",
};

export function isTheme(value: unknown): value is Theme {
  return THEMES.includes(value as Theme);
}

/**
 * head 맨 앞에서 첫 그림 전에 html[data-theme]를 붙인다. 하이드레이션을 기다리면
 * 라이트를 고른 사람에게 다크 화면이 한 번 번쩍인다. 다크는 속성 없이 기본값이다.
 */
export const THEME_BOOT_SCRIPT = `(function(){try{if(localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)})==="light")document.documentElement.setAttribute("data-theme","light");}catch(e){}})();`;
