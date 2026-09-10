export type ReadingSegment = { start: number; end: number; textStart: number; textEnd: number };
export type ReadingTiming = {
  version: 1;
  sourceHash: string;
  audioHash: string;
  audioEtag: string;
  duration: number;
  segments: ReadingSegment[];
};

export function isReadingTiming(value: unknown): value is ReadingTiming {
  if (!value || typeof value !== "object") return false;
  const data = value as ReadingTiming;
  const hash = (v: unknown) => typeof v === "string" && /^[a-f0-9]{64}$/.test(v);
  if (data.version !== 1 || !hash(data.sourceHash) || !hash(data.audioHash)
    || typeof data.audioEtag !== "string" || !data.audioEtag || data.audioEtag.length > 150
    || !Number.isFinite(data.duration) || data.duration <= 0 || data.duration > 3600
    || !Array.isArray(data.segments) || !data.segments.length || data.segments.length > 500) return false;
  let time = 0;
  let offset = 0;
  return data.segments.every((segment) => {
    if (!segment || typeof segment !== "object") return false;
    const { start, end, textStart, textEnd } = segment;
    if (!Number.isFinite(start) || !Number.isFinite(end) || start < time || end <= start || end > data.duration + 0.1
      || !Number.isInteger(textStart) || !Number.isInteger(textEnd) || textStart < offset || textEnd <= textStart) return false;
    time = end;
    offset = textEnd;
    return true;
  });
}

export function activeReadingSegment(timing: ReadingTiming | null, time: number, status: string) {
  if (!timing || status === "idle") return null;
  return timing.segments.find((segment) => time >= segment.start && time < segment.end) ?? null;
}
