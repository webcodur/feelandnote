// A list names works, not a particular volume or a bookseller's product bundle.
export function koreanListLabels(item, locale, reviewed) {
  if (reviewed) return reviewed;
  const korean = value => /[가-힣]/.test(value ?? '');
  const title = String(locale?.title ?? '').trim();
  const ambiguous = /\b(trilogy|stories|tales|poems|collected|complete works)\b/i.test(item.raw_title)
    || /\.\.\.|…|고품격|리커버|특별판|세트|전집\s*\d|\s\d+(?:권)?$/.test(title);
  return [
    !korean(item.raw_title) && !ambiguous && (korean(title) || /^\d+$/.test(title)) ? title : item.raw_title,
    !korean(item.raw_creator) && korean(locale?.creator) && !/[\^]/.test(locale.creator)
      ? locale.creator : item.raw_creator || locale?.creator || '',
  ];
}
