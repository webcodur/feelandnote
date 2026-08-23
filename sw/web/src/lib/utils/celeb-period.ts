/*
  파일명: /lib/utils/celeb-period.ts
  기능: 인물의 생몰 연도를 한 줄로 적는다.
  책임: 상세 머리글과 이름 대조 후보 목록이 같은 표기를 쓰도록 한 곳에 둔다.
*/ // ------------------------------

function formatYear(year: string | null | undefined) {
  if (!year) return "";

  const numericYear = Number.parseInt(year, 10);
  if (Number.isNaN(numericYear)) return year;
  return numericYear < 0 ? `BC ${Math.abs(numericYear)}` : `${numericYear}`;
}

export function formatCelebPeriod(
  birthDate: string | null | undefined,
  deathDate: string | null | undefined,
) {
  const birthYear = formatYear(birthDate);
  if (!birthYear) return "";

  // 살아 있는 사람에게 줄표만 매달아 두면 뒤가 잘린 것처럼 보인다.
  // 생존 여부는 옆의 나이 표시가 이미 알려 준다
  const deathYear = deathDate ? formatYear(deathDate) : "";
  return deathYear ? `${birthYear} — ${deathYear}` : birthYear;
}
