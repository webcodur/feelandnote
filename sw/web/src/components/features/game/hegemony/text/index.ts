/*
  파일명: components/features/game/hegemony/text/index.ts
  기능: 패권 문구 고르기
  책임: 현재 언어의 문구 묶음을 돌려준다.
*/
"use client";

import { useLocale } from "next-intl";
import { resolveLocale, type Locale } from "@/types/locale";
import { en } from "./en";
import { ko, type HegemonyText } from "./ko";

const TEXT: Record<Locale, HegemonyText> = { ko, en };

export function useHegemonyText(): HegemonyText {
  return TEXT[resolveLocale(useLocale())];
}

export type { HegemonyText };
