// 한국어판 상품명 끝에 붙는 분권·세트·판차·총서 표시. 같은 작품의 판본 표시이므로 떼고 작품명만 남긴다.
// 끝의 숫자는 공백 뒤 한두 자리 권차만 뗀다(「화씨 451」「1984」 같은 제목 숫자는 남는다).
const EDITION_MARK=/\s*\((?:[상중하](?:권)?|전\s*\d+권|[^()]*(?:판|본|커버|에디션|HardCover|세트|전집|문학선|클래식|총서)[^()]*)\)\s*$|\s*\(?세트\)?\s*$|\.?\s+\d{1,2}\s*$|\.\s*\d{1,2}(?=\s*\()/;
export function workTitle(title) {
  let value = String(title ?? '').trim(), prior;
  do { prior = value; value = value.replace(EDITION_MARK, '').trim(); } while (value !== prior && value);
  return value || String(title ?? '').trim();
}

// A list names works, not a particular volume or a bookseller's product bundle.
export function koreanListLabels(item, locale, reviewed) {
  if (reviewed) return reviewed;
  const korean = value => /[가-힣]/.test(value ?? '');
  const title = workTitle(locale?.title);
  const ambiguous = /\b(trilogy|stories|tales|poems|collected|complete works)\b/i.test(item.raw_title)
    || /\.\.\.|…|고품격|리커버|특별판|세트|전집\s*\d|\s\d+(?:권)?$/.test(title);
  return [
    !korean(item.raw_title) && !ambiguous && (korean(title) || /^\d+$/.test(title)) ? title : item.raw_title,
    !korean(item.raw_creator) && korean(locale?.creator) && !/[\^]/.test(locale.creator)
      ? locale.creator : item.raw_creator || locale?.creator || '',
  ];
}
