export type GlobalErrorLocale = "ko" | "en";

const COPY = {
  ko: {
    title: "예기치 않은 오류가 발생했습니다",
    description: "잠시 후 다시 시도해 주세요. 문제가 지속되면 새로고침을 시도해 주세요.",
    retry: "다시 시도",
    home: "홈으로",
  },
  en: {
    title: "Something went wrong",
    description: "Please try again shortly. If the problem continues, refresh the page.",
    retry: "Try Again",
    home: "Go Home",
  },
} satisfies Record<GlobalErrorLocale, {
  title: string;
  description: string;
  retry: string;
  home: string;
}>;

export function getGlobalErrorCopy(locale: GlobalErrorLocale) {
  return COPY[locale];
}
