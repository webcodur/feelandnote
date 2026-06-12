/*
  파일명: /app/reading/components/CharacterContent/constants.ts
  기능: 인물 섹션 공유 상수
  책임: 성별 옵션과 색상 매핑을 제공한다.
*/ // ------------------------------

import type { CharacterGender } from "../../types";

export const GENDER_OPTIONS: { value: CharacterGender; key: string; color: string }[] = [
  { value: "male", key: "genderMale", color: "bg-blue-500/20 text-blue-400 border-blue-400" },
  { value: "female", key: "genderFemale", color: "bg-pink-500/20 text-pink-400 border-pink-400" },
  { value: "unknown", key: "genderUnknown", color: "bg-gray-500/20 text-text-secondary border-gray-400" },
];

export const GENDER_COLORS = {
  male: "bg-blue-500/10 text-blue-400 border-blue-500/30",
  female: "bg-pink-500/10 text-pink-400 border-pink-500/30",
  unknown: "bg-gray-500/10 text-text-secondary border-gray-500/30",
};
