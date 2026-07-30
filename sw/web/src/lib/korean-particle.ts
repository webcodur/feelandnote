/*
  파일명: /lib/korean-particle.ts
  기능: 한국어 조사 자동 선택
  책임: 앞 낱말의 받침 유무를 보고 이/가·을/를·은/는·와/과·으로/로를 골라 붙인다.
        화면 문구에 "이(가)" 같은 괄호 표기가 남지 않게 한다.
*/ // ------------------------------

const HANGUL_START = 0xac00;
const HANGUL_END = 0xd7a3;

/** 마지막 글자에 받침이 있는지. 한글이 아니면 null(판정 불가) */
function hasFinalConsonant(word: string): boolean | null {
  const last = word.trimEnd().charCodeAt(word.trimEnd().length - 1);
  if (Number.isNaN(last) || last < HANGUL_START || last > HANGUL_END) return null;
  return (last - HANGUL_START) % 28 !== 0;
}

/** 받침 있음 / 없음 순서로 짝지은 조사 */
const PARTICLE_PAIRS = {
  subject: ["이", "가"],
  object: ["을", "를"],
  topic: ["은", "는"],
  with: ["과", "와"],
  direction: ["으로", "로"],
} as const;

export type ParticleKind = keyof typeof PARTICLE_PAIRS;

/**
 * 낱말에 맞는 조사를 고른다.
 * 한글이 아닌 낱말(로마자·숫자)은 받침을 알 수 없으므로 받침 있는 쪽으로 둔다.
 */
export function particleFor(word: string, kind: ParticleKind): string {
  const [withFinal, withoutFinal] = PARTICLE_PAIRS[kind];
  const final = hasFinalConsonant(word);
  return final === false ? withoutFinal : withFinal;
}

/** 낱말 뒤에 알맞은 조사를 붙여 돌려준다. 예: withParticle("러더퍼드", "subject") → "러더퍼드가" */
export function withParticle(word: string, kind: ParticleKind): string {
  return `${word}${particleFor(word, kind)}`;
}
