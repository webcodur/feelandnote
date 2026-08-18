/*
  인물의 생몰 해석 단일 출처.
  생사 판정과 생애 종료 연도를 여기서만 정한다. 화면·서버 액션이 각자
  "몰년이 없으면 지금까지 산 것"으로 계산하던 탓에 옛 인물이 현대인과
  동시대로 잡히거나 수백 살로 표시됐다.
*/

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

// 몰년이 없다고 살아 있는 것은 아니다. 사서가 몰년을 전하지 않는 인물이 많고
// 생년도 추정치다. 태어난 지 이만큼 지났으면 몰년이 없어도 사망자로 본다.
export const DECEASED_AFTER_YEARS = 100;

// 몰년을 모르는 사망자의 생애가 언제 끝났다고 볼지. 겹침 계산에만 쓰고 화면에 적지 않는다.
export const ASSUMED_LIFESPAN_YEARS = 70;

export function parseCelebDate(
  value: string | null | undefined,
): ParsedCelebDate | null {
  if (!value) return null;

  const match = /^(-?\d{1,6})(?:-(\d{1,2})(?:-(\d{1,2}))?)?/.exec(value.trim());
  if (!match) return null;

  const year = Number(match[1]);
  if (!Number.isFinite(year)) return null;

  const rawMonth = match[2] ? Number(match[2]) : null;
  const rawDay = match[3] ? Number(match[3]) : null;

  return {
    year,
    month: rawMonth !== null && rawMonth >= 1 && rawMonth <= 12 ? rawMonth : null,
    day: rawDay !== null && rawDay >= 1 && rawDay <= 31 ? rawDay : null,
  };
}

export function getCelebYear(value: string | null | undefined): number | null {
  return parseCelebDate(value)?.year ?? null;
}

// 기원전에서 서기로 넘어갈 때는 0년이 없으므로 한 해를 뺀다.
function yearSpan(fromYear: number, toYear: number) {
  const span = toYear - fromYear;
  return fromYear < 0 && toYear > 0 ? span - 1 : span;
}

export function isCelebDeceased(
  birthDate: string | null | undefined,
  deathDate: string | null | undefined,
  now = new Date(),
): boolean {
  if (deathDate) return true;

  const birthYear = getCelebYear(birthDate);
  if (birthYear === null) return false;
  return yearSpan(birthYear, now.getUTCFullYear()) >= DECEASED_AFTER_YEARS;
}

/* 생애가 끝난 연도. 동시대 인물처럼 구간이 겹치는지 따질 때 쓴다.
   생존자는 올해, 몰년을 모르는 사망자는 생년 + 추정 수명으로 잡는다. */
export function getCelebLifeEndYear(
  birthDate: string | null | undefined,
  deathDate: string | null | undefined,
  now = new Date(),
): number | null {
  const deathYear = getCelebYear(deathDate);
  if (deathYear !== null) return deathYear;

  const birthYear = getCelebYear(birthDate);
  if (birthYear === null) return null;

  return isCelebDeceased(birthDate, deathDate, now)
    ? birthYear + ASSUMED_LIFESPAN_YEARS
    : now.getUTCFullYear();
}

export function getCelebAge(
  birthDate: string | null | undefined,
  deathDate: string | null | undefined,
  now = new Date(),
): CelebAgeInfo | null {
  const birth = parseCelebDate(birthDate);
  if (!birth) return null;

  const deceased = isCelebDeceased(birthDate, deathDate, now);
  // 사망자인데 몰년을 모르면 향년을 말할 수 없다. 지금까지 산 것으로 세면 수백 살이 된다
  if (deceased && !deathDate) return null;

  const end = deathDate
    ? parseCelebDate(deathDate)
    : {
        year: now.getUTCFullYear(),
        month: now.getUTCMonth() + 1,
        day: now.getUTCDate(),
      };
  if (!end) return null;

  let age = yearSpan(birth.year, end.year);

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

  return { age, approximate: !hasExactDates, deceased };
}
