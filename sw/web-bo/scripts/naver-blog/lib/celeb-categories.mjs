// 「셀럽의 책추천」 하위 카테고리는 서비스 직군과 1:1이다. 이름·순서는 직군 시드(DB celeb_professions와 같은 값)의 label이 쥔다.
import fs from 'node:fs';
const professions = JSON.parse(fs.readFileSync(new URL('../../../../../packages/shared/src/constants/celeb-professions.json', import.meta.url), 'utf8'));
export const CELEB_CATEGORY = Object.freeze(Object.fromEntries(professions.map(p => [p.value, p.label])));
