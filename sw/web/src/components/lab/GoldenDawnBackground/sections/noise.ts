// --- 1D value noise + fbm ---
export const hashNoise = (x: number): number => {
  const xi = Math.floor(x);
  const frac = x - xi;
  const smooth = frac * frac * (3 - 2 * frac);
  const a = Math.sin(xi * 127.1 + xi * 311.7) * 43758.5453;
  const b = Math.sin((xi + 1) * 127.1 + (xi + 1) * 311.7) * 43758.5453;
  const va = a - Math.floor(a);
  const vb = b - Math.floor(b);
  return (va + (vb - va) * smooth) * 2 - 1;
};

export const fbm = (x: number, octaves: number, lac: number, gain: number): number => {
  let sum = 0, amp = 1, freq = 1, max = 0;
  for (let i = 0; i < octaves; i++) {
    sum += hashNoise(x * freq) * amp;
    max += amp;
    amp *= gain;
    freq *= lac;
  }
  return sum / max;
};

// --- 2D noise (밴드별 독립 곡선용) ---
const hash2D = (x: number, seed: number): number => {
  const xi = Math.floor(x);
  const frac = x - xi;
  const smooth = frac * frac * (3 - 2 * frac);
  const a = Math.sin(xi * 127.1 + seed * 311.7) * 43758.5453;
  const b = Math.sin((xi + 1) * 127.1 + seed * 311.7) * 43758.5453;
  const va = a - Math.floor(a);
  const vb = b - Math.floor(b);
  return (va + (vb - va) * smooth) * 2 - 1;
};

export const fbm2D = (x: number, seed: number, octaves: number, lac: number, gain: number): number => {
  let sum = 0, amp = 1, freq = 1, max = 0;
  for (let i = 0; i < octaves; i++) {
    sum += hash2D(x * freq, seed + i * 73.1) * amp;
    max += amp;
    amp *= gain;
    freq *= lac;
  }
  return sum / max;
};

export const wave = (x: number, t: number, amp: number): number =>
  Math.sin(x + t) * amp +
  Math.sin(x * 1.7 + t * 0.8) * amp * 0.5 +
  Math.sin(x * 0.4 + t * 1.3) * amp * 0.3;
