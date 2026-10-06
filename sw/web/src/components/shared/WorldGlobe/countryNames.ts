const regionNames = new Intl.DisplayNames(['en'], { type: 'region' });

// Natural Earth가 Intl.DisplayNames와 다르게 표기하는 국가명.
const mapNames: Record<string, string> = {
  US: 'United States of America', TZ: 'Tanzania', EH: 'W. Sahara',
  CD: 'Dem. Rep. Congo', CG: 'Congo', DO: 'Dominican Rep.',
  FK: 'Falkland Is.', TF: 'Fr. S. Antarctic Lands', CI: "Côte d'Ivoire",
  CF: 'Central African Rep.', GQ: 'Eq. Guinea', SZ: 'eSwatini',
  PS: 'Palestine', MM: 'Myanmar', TR: 'Turkey', SB: 'Solomon Is.',
  BA: 'Bosnia and Herz.', MK: 'Macedonia', SS: 'S. Sudan',
  AG: 'Antigua and Barb.', AX: 'Åland', BL: 'St-Barthélemy',
  CK: 'Cook Is.', CV: 'Cabo Verde', HK: 'Hong Kong',
  IO: 'Br. Indian Ocean Ter.', KN: 'St. Kitts and Nevis', KY: 'Cayman Is.',
  LC: 'Saint Lucia', MF: 'St-Martin', MH: 'Marshall Is.', MO: 'Macao',
  MP: 'N. Mariana Is.', PF: 'Fr. Polynesia', PM: 'St. Pierre and Miquelon',
  PN: 'Pitcairn Is.', SH: 'Saint Helena', ST: 'São Tomé and Principe',
  TC: 'Turks and Caicos Is.', TT: 'Trinidad and Tobago', VA: 'Vatican',
  VC: 'St. Vin. and Gren.', VG: 'British Virgin Is.', VI: 'U.S. Virgin Is.',
  WF: 'Wallis and Futuna Is.', FO: 'Faeroe Is.',
};

export function getGlobeCountryName(code: string): string {
  return mapNames[code] ?? regionNames.of(code) ?? code;
}
