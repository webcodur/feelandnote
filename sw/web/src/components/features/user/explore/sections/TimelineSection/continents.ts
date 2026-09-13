import type { CountryGroup } from "@/actions/home/getCelebTimeline";

/**
 * Unicode CLDR 48 territory containment (UN M49 regions).
 * North America (003) includes Central America and the Caribbean.
 * CLDR's QO (Outlying Oceania, including Antarctica) is not a continent here.
 * https://github.com/unicode-org/cldr-json/blob/main/cldr-json/cldr-core/supplemental/territoryContainment.json
 */
const CONTINENT_COUNTRIES = {
  asia: "AE AF AM AZ BD BH BN BT CN CY GE HK ID IL IN IQ IR JO JP KG KH KP KR KW KZ LA LB LK MM MN MO MV MY NP OM PH PK PS QA SA SG SY TH TJ TL TM TR TW UZ VN YE",
  europe: "AD AL AT AX BA BE BG BY CH CQ CZ DE DK EE ES FI FO FR GB GG GI GR HR HU IE IM IS IT JE LI LT LU LV MC MD ME MK MT NL NO PL PT RO RS RU SE SI SJ SK SM UA VA XK",
  africa: "AO BF BI BJ BW CD CF CG CI CM CV DJ DZ EA EG EH ER ET GA GH GM GN GQ GW IC IO KE KM LR LS LY MA MG ML MR MU MW MZ NA NE NG RE RW SC SD SH SL SN SO SS ST SZ TD TF TG TN TZ UG YT ZA ZM ZW",
  northAmerica: "AG AI AW BB BL BM BQ BS BZ CA CR CU CW DM DO GD GL GP GT HN HT JM KN KY LC MF MQ MS MX NI PA PM PR SV SX TC TT US VC VG VI",
  southAmerica: "AR BO BR BV CL CO EC FK GF GS GY PE PY SR UY VE",
  oceania: "AS AU CC CK CX FJ FM GU HM KI MH MP NC NF NR NU NZ PF PG PN PW SB TK TO TV UM VU WF WS",
} as const;

export const TIMELINE_CONTINENTS = ["asia", "europe", "africa", "northAmerica", "southAmerica", "oceania", "other"] as const;
export type TimelineContinent = (typeof TIMELINE_CONTINENTS)[number];

const continentByCountry = new Map<string, TimelineContinent>();
for (const continent of TIMELINE_CONTINENTS) {
  if (continent === "other") continue;
  for (const country of CONTINENT_COUNTRIES[continent].split(" ")) {
    continentByCountry.set(country, continent);
  }
}

export function getCountryContinent(code: string): TimelineContinent {
  return continentByCountry.get(code.toUpperCase()) ?? "other";
}

/** Keep every country, including unknown/custom codes, in exactly one menu. */
export function groupTimelineCountries(countries: CountryGroup[]) {
  return TIMELINE_CONTINENTS.map((id) => ({
    id,
    countries: countries.filter((country) => getCountryContinent(country.code) === id),
  })).filter((group) => group.countries.length > 0);
}
