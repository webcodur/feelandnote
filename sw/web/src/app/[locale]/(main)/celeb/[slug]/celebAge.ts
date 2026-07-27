interface ParsedCelebDate {
  year: number;
  month: number | null;
  day: number | null;
}

export interface CelebAgeInfo {
  age: number;
  approximate: boolean;
  deceased: boolean;
}

function parseCelebDate(value: string): ParsedCelebDate | null {
  const match = /^(-?\d{1,6})(?:-(\d{1,2})(?:-(\d{1,2}))?)?/.exec(
    value.trim(),
  );
  if (!match) return null;

  const year = Number(match[1]);
  const rawMonth = match[2] ? Number(match[2]) : null;
  const rawDay = match[3] ? Number(match[3]) : null;
  const month =
    rawMonth !== null && rawMonth >= 1 && rawMonth <= 12
      ? rawMonth
      : null;
  const day =
    rawDay !== null && rawDay >= 1 && rawDay <= 31
      ? rawDay
      : null;

  if (!Number.isFinite(year)) return null;
  return { year, month, day };
}

export function getCelebAge(
  birthDate: string | null | undefined,
  deathDate: string | null | undefined,
  now = new Date(),
): CelebAgeInfo | null {
  if (!birthDate) return null;

  const birth = parseCelebDate(birthDate);
  if (!birth) return null;

  const deceased = Boolean(deathDate);
  const end = deathDate
    ? parseCelebDate(deathDate)
    : {
        year: now.getUTCFullYear(),
        month: now.getUTCMonth() + 1,
        day: now.getUTCDate(),
      };
  if (!end) return null;

  // 기원전에서 서기로 넘어갈 때는 0년이 없으므로 한 해를 뺀다.
  let age = end.year - birth.year;
  if (birth.year < 0 && end.year > 0) age -= 1;

  const hasExactDates =
    birth.month !== null
    && birth.day !== null
    && end.month !== null
    && end.day !== null;
  if (
    hasExactDates
    && (
      end.month! < birth.month!
      || (end.month === birth.month && end.day! < birth.day!)
    )
  ) {
    age -= 1;
  }

  if (age < 0) return null;
  // 사망일이 빠진 옛 인물을 생존 인물로 오인해 수백 살로 표시하지 않는다.
  if (!deceased && age > 125) return null;

  return {
    age,
    approximate: !hasExactDates,
    deceased,
  };
}
