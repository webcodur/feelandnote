/*
  파일명: /components/features/faction/quote/factionQuotePaging.ts
  기능: 화보 위에 띄우는 인물 대사의 장 나누기와 생김새
  책임: 세력도감 쇼케이스와 신화 아틀라스가 같은 규칙으로 대사를 나누고 같은 모양으로 띄우게 한다.
*/ // ------------------------------

import type { CSSProperties } from "react";

/** 화보 위에 뜨는 대사의 생김새 — 저절로 흐르는 쪽과 손으로 넘기는 쪽이 함께 쓴다 */
export const QUOTE_TEXT_CLASS =
  "col-start-1 row-start-1 break-keep font-serif font-bold leading-[1.48] text-[#f2ebe0]";
/** 짧은 장은 크게 박고, 긴 장은 한 단계 줄여 사진 밖으로 넘치지 않게 한다 */
export const QUOTE_SIZE_LARGE = "text-[clamp(1.35rem,4.8vw,1.75rem)] md:text-[clamp(1.65rem,2.5vw,2.25rem)]";
export const QUOTE_SIZE_SMALL = "text-[clamp(1.05rem,3.7vw,1.35rem)] md:text-[clamp(1.25rem,1.9vw,1.7rem)]";
export const QUOTE_TEXT_STYLE: CSSProperties = {
  textShadow: "0 2px 8px rgba(0,0,0,.98), 0 0 24px rgba(0,0,0,.9)",
};

/*
  한 장은 문장 하나다. 다만 이 길이에 못 미치는 토막은 다음 문장과 함께 띄운다.

  토막을 합치지 않으면 "빠르게 생각하고, 공간을 찾습니다. 하루 종일 찾습니다. 여기? 아니야.
  저기? 아니야. 공간, 공간, 공간."이 열 번을 눌러야 하는 말이 된다. 말 1,050건을 재 보니
  문장 평균이 28자인데 20자도 안 되는 것이 3분의 1이었다(26.08.08 실측).
  이 기준이면 71%가 한 장에 끝나고 저 말은 세 장이 된다.
*/
const QUOTE_PAGE_MIN = 25;
/** 이 길이를 넘는 장은 글자를 한 단계 줄여야 세로 화면에서 잘리지 않는다 */
export const QUOTE_LONG_PAGE = 60;

export const CAPTION_TRANSITION_SEC = 0.42;
// 전환을 발화 시점에 시작하면 fade-in만큼 늦게 읽힌다. 새 문장이 거의 완성된 상태로 발화에 닿게 앞당긴다.
export const CAPTION_TRANSITION_LEAD_SEC = 0.2;
export const PORTRAIT_TRANSITION_LEAD_SEC = 0.4;

/** 마침표·물음표·느낌표·말줄임에서 끊는다. 끊을 자리가 없으면 통째로 하나다. */
function splitIntoSentences(text: string): string[] {
  const parts = text
    .split(/(?<=[.!?…。？！])\s+/)
    .map((part) => part.trim())
    .filter(Boolean);
  return parts.length ? parts : [text];
}

/**
 * 목소리가 없는 인물의 말을 손으로 넘길 장으로 나눈다 — 문장 하나가 한 장이다.
 *
 * 빈 줄은 쓴 사람이 일부러 끊은 자리라 그대로 장을 가르고, 한 줄 바꿈은 이어 붙인다.
 * 문장이 기준 길이에 못 미치면 다음 문장까지 담아야 장이 넘어간다.
 */
export function buildQuotePages(quote: string): string[] {
  const blocks = quote.split(/\n{2,}/).map((b) => b.trim()).filter(Boolean);
  const pages: string[] = [];

  for (const block of blocks.length ? blocks : [quote]) {
    let buffer = '';
    for (const sentence of splitIntoSentences(block.replace(/\s*\n\s*/g, ' '))) {
      buffer = buffer ? buffer + ' ' + sentence : sentence;
      if (buffer.length >= QUOTE_PAGE_MIN) {
        pages.push(buffer);
        buffer = '';
      }
    }
    // 끝에 토막이 남으면 앞 장에 붙인다 — 한 줄짜리 장을 위해 한 번 더 누르게 하지 않는다
    if (buffer) {
      if (pages.length) pages[pages.length - 1] += ' ' + buffer;
      else pages.push(buffer);
    }
  }
  return pages.length ? pages : [quote];
}
