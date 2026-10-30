import { filterSelection } from "@/constants/celebFilterSelection";

// RPC 내부 LIMIT을 풀고 이 조건을 건 뒤, 서버에서 전체 수와 페이지를 계산한다.
export function applyListingMultiFilters<T extends {
  in(column: string, values: readonly string[]): T;
  or(filters: string): T;
}>(request: T, profession: string | null, nationality: string | null): T {
  const professions = filterSelection(profession);
  const nationalities = filterSelection(nationality);
  if (professions.length > 1) request = request.in("profession", professions);
  if (nationalities.includes("none")) {
    const countries = nationalities.filter(value => value !== "none");
    const alternatives = ["nationality.is.null", 'nationality.eq.""'];
    if (countries.length) alternatives.push(`nationality.in.(${countries.map(value => JSON.stringify(value)).join(",")})`);
    request = request.or(alternatives.join(","));
  } else if (nationalities.length > 1) request = request.in("nationality", nationalities);
  return request;
}
