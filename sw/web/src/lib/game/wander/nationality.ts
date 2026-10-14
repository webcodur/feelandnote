const NATIONALITY_TO_REGION: Record<string, string> = {
  // 동아시아
  CN: 'east_asia', KR: 'east_asia', JP: 'east_asia', MN: 'east_asia',
  // 동남아시아
  VN: 'southeast_asia', TH: 'southeast_asia', KH: 'southeast_asia', MM: 'southeast_asia', PH: 'southeast_asia', ID: 'southeast_asia', MY: 'southeast_asia', SG: 'southeast_asia',
  // 남아시아
  IN: 'south_asia', BD: 'south_asia', LK: 'south_asia', NP: 'south_asia', PK: 'south_asia',
  // 중앙아시아
  KZ: 'central_asia', UZ: 'central_asia', TM: 'central_asia', KG: 'central_asia', TJ: 'central_asia', AF: 'central_asia',
  RU: 'central_asia', UA: 'central_asia', PL: 'central_asia', BY: 'central_asia', RO: 'central_asia', HU: 'central_asia',
  // 중동
  IR: 'middle_east', IQ: 'middle_east', SA: 'middle_east', TR: 'middle_east', EG: 'middle_east', IL: 'middle_east', SY: 'middle_east', LB: 'middle_east', AE: 'middle_east',
  // 동유럽
  GR: 'east_europe', BG: 'east_europe', RS: 'east_europe', HR: 'east_europe', CZ: 'east_europe', SK: 'east_europe', AT: 'east_europe', SI: 'east_europe',
  // 서유럽
  IT: 'west_europe', FR: 'west_europe', GB: 'west_europe', DE: 'west_europe', ES: 'west_europe', PT: 'west_europe', NL: 'west_europe', BE: 'west_europe', CH: 'west_europe', IE: 'west_europe', SE: 'west_europe', NO: 'west_europe', DK: 'west_europe', FI: 'west_europe',
  // 아프리카
  DZ: 'africa', TN: 'africa', MA: 'africa', NG: 'africa', KE: 'africa', ET: 'africa', ZA: 'africa', GH: 'africa',
  // 아메리카
  US: 'americas', CA: 'americas', MX: 'americas', BR: 'americas', AR: 'americas', CL: 'americas', CO: 'americas', PE: 'americas', VE: 'americas',
  // 오세아니아
  AU: 'oceania', NZ: 'oceania', PG: 'oceania',
}

export function getRegionForNationality(nationality: string): string {
  return NATIONALITY_TO_REGION[nationality] ?? 'west_europe'
}
