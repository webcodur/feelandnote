throw new Error(
  [
    'timeline-audit.mjs는 폐기됐다.',
    'DB 결손 모집단은 timeline-export-missing-manifest.mjs --check-only로 확인하고,',
    '조사 JSON 구조는 timeline-draft-validate.mjs로 검증하라.',
    '구형 profiles 공개·등급·생몰 필터 결과는 커버리지 근거로 사용할 수 없다.',
  ].join(' '),
)
