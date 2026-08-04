'use client';

import { memo } from 'react';
import type { RedactToken } from './types';

interface Props {
  tokens: RedactToken[];
  ariaLabel?: string;
}

/**
 * 가려진 본문 표시 영역
 * - 공개된 어절: 그대로 표시
 * - 숨겨진 어절: 글자 수에 비례하는 가림 블록
 * - 영구 가림(이름): ■■■ 그대로
 *
 * 접근성: 숨겨진 블록에 aria-hidden, 전체 영역에 role="text" + aria-label
 */
function RedactTextDisplay({ tokens, ariaLabel }: Props) {
  return (
    <div
      className="rounded-lg border border-white/10 bg-white/[0.02] p-4 sm:p-6"
      role="region"
      aria-label={ariaLabel}
    >
      <p className="flex flex-wrap gap-x-1.5 gap-y-1 text-sm leading-relaxed sm:text-base sm:leading-loose">
        {tokens.map((token, i) => (
          <TokenSpan key={i} token={token} />
        ))}
      </p>
    </div>
  );
}

const TokenSpan = memo(function TokenSpan({ token }: { token: RedactToken }) {
  if (token.censored) {
    // 영구 가림 (이름) — 무채색 블록
    return (
      <span
        className="inline-block rounded bg-zinc-700/50 px-1 text-zinc-500"
        aria-hidden="true"
      >
        {'■'.repeat(Math.max(2, Math.ceil(token.text.length * 0.6)))}
      </span>
    );
  }

  if (token.revealed) {
    // 공개된 어절
    const isFreebie = token.freebie;
    return (
      <span
        className={
          isFreebie
            ? 'text-text-secondary/60'
            : 'text-emerald-300 font-medium'
        }
      >
        {token.text}
      </span>
    );
  }

  // 숨겨진 어절 — 길이에 비례하는 가림 바
  const width = Math.max(1.5, token.text.length * 0.7);
  return (
    <span
      className="inline-block rounded bg-text-primary/20 align-middle"
      style={{ width: `${width}em`, height: '1.2em' }}
      aria-hidden="true"
    />
  );
});

export default memo(RedactTextDisplay);
