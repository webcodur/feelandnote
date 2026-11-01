export interface AgeRange {
  min?: number;
  max?: number;
}

/** 출생연도 기준 나이. 나이의 상한은 생년의 하한으로 뒤집힌다. */
export function ageRangeToBirthYears(age: AgeRange, referenceYear: number): AgeRange {
  return {
    min: age.max === undefined ? undefined : referenceYear - age.max,
    max: age.min === undefined ? undefined : referenceYear - age.min,
  };
}

export function birthYearsToAgeRange(birth: AgeRange, referenceYear: number): AgeRange {
  return {
    min: birth.max === undefined || birth.max > referenceYear ? undefined : referenceYear - birth.max,
    max: birth.min === undefined ? undefined : Math.max(0, referenceYear - birth.min),
  };
}
