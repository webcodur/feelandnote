const KO_SPECTRUM_AXIS_LABELS = {
  command: "통솔",
  martial: "무력",
  intellect: "지력",
  charm: "매력",
  temperance: "절제",
  diligence: "근면",
  reflection: "성찰",
  courage: "용기",
  loyalty: "충의",
  benevolence: "인애",
  fairness: "공정",
  humility: "겸양",
  pessimism_optimism: "비관–낙관 성향",
  conservative_progressive: "보수–진보 성향",
  individual_social: "개인–사회 성향",
  cautious_bold: "신중–과감 성향",
} as const;

type SpectrumAxisKey = keyof typeof KO_SPECTRUM_AXIS_LABELS;

const AXIS_TOKEN_PATTERN = new RegExp(
  `\\b(${Object.keys(KO_SPECTRUM_AXIS_LABELS).join("|")})\\b(은|는|이|가|을|를|과|와)?`,
  "g",
);

const PARTICLE_PAIRS: Record<string, readonly [string, string]> = {
  은: ["은", "는"],
  는: ["은", "는"],
  이: ["이", "가"],
  가: ["이", "가"],
  을: ["을", "를"],
  를: ["을", "를"],
  과: ["과", "와"],
  와: ["과", "와"],
};

function hasFinalConsonant(text: string): boolean {
  const last = text.at(-1);
  if (!last) return false;

  const code = last.charCodeAt(0);
  if (code < 0xac00 || code > 0xd7a3) return false;
  return (code - 0xac00) % 28 !== 0;
}

function correctParticle(label: string, particle?: string): string {
  if (!particle) return "";
  const pair = PARTICLE_PAIRS[particle];
  if (!pair) return particle;
  return hasFinalConsonant(label) ? pair[0] : pair[1];
}

/**
 * 한국어 설명문에 남은 spectrum 내부 축 식별자를 사용자용 축명으로 바꾼다.
 * 원본 데이터 정비 전에도 내부 스키마 이름이 화면에 노출되지 않게 하는 방어선이다.
 */
export function localizeSpectrumText(
  text: string | undefined,
  locale: string,
): string | undefined {
  if (!text || locale !== "ko") return text;

  return text.replace(
    AXIS_TOKEN_PATTERN,
    (_match, rawKey: SpectrumAxisKey, particle?: string) => {
      const label = KO_SPECTRUM_AXIS_LABELS[rawKey];
      return `${label}${correctParticle(label, particle)}`;
    },
  );
}
