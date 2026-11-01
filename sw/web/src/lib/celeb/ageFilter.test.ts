import assert from "node:assert/strict";
import test from "node:test";
import { ageRangeToBirthYears, birthYearsToAgeRange } from "./ageFilter";

test("age bounds map inclusively to the opposite birth-year bounds", () => {
  assert.deepEqual(ageRangeToBirthYears({ max: 30 }, 2026), { min: 1996, max: undefined });
  assert.deepEqual(ageRangeToBirthYears({ min: 30 }, 2026), { min: undefined, max: 1996 });
  assert.deepEqual(ageRangeToBirthYears({ min: 30, max: 50 }, 2026), { min: 1976, max: 1996 });
  assert.deepEqual(ageRangeToBirthYears({}, 2026), { min: undefined, max: undefined });
  assert.deepEqual(ageRangeToBirthYears({ max: 0 }, 2026), { min: 2026, max: undefined });
});

test("birth-year ranges convert back to age without treating a future year as a negative age", () => {
  assert.deepEqual(birthYearsToAgeRange({ min: 1976, max: 1996 }, 2026), { min: 30, max: 50 });
  assert.deepEqual(birthYearsToAgeRange({ min: 1978, max: 2030 }, 2026), { min: undefined, max: 48 });
  assert.deepEqual(birthYearsToAgeRange({}, 2026), { min: undefined, max: undefined });
});
