/** 발행 패널의 값을 읽기만 한다. 비활성 옵션은 실제 저장값을 확인한 것으로 보지 않는다. */
export async function assertPublishOptions(page, { preserve = null } = {}) {
  const state = await page.evaluate(function readPublishOptions() {
    const searches = [...document.querySelectorAll('#publish-option-search')];
    const scraps = [...document.querySelectorAll('#publish-option-scrap')];
    const outsides = [...document.querySelectorAll('#publish-option-outside')];
    const scrapMode = scraps[0]?.closest('li')?.querySelector('a');
    const selected = [...document.querySelectorAll('[class*=option_open_type] input[type=radio]')]
      .filter((input) => input.checked);
    const disabled = (input) => input
      ? input.disabled || input.matches(':disabled') || Boolean(input.closest('[aria-disabled="true"]'))
      : null;
    const label = (input) => input
      ? [...document.querySelectorAll('label')].find((item) => item.htmlFor === input.id)?.textContent.replace(/\s/g, '') ?? null
      : null;
    return {
      searchCount: searches.length,
      searchChecked: searches[0]?.checked ?? null,
      searchDisabled: disabled(searches[0]),
      scrapCount: scraps.length,
      scrapChecked: scraps[0]?.checked ?? null,
      scrapDisabled: disabled(scraps[0]),
      scrapMode: scrapMode?.textContent.replace(/\s/g, '') ?? null,
      scrapModeDisabled: disabled(scrapMode),
      outsideCount: outsides.length,
      outsideChecked: outsides[0]?.checked ?? null,
      outsideDisabled: disabled(outsides[0]),
      publicCount: selected.length,
      publicLabel: label(selected[0]),
      publicDisabled: disabled(selected[0]),
    };
  });

  const desired = id => {
    if (!preserve) return true;
    const matches = preserve.inputs?.filter(input => input.id === id) ?? [];
    if (matches.length !== 1 || typeof matches[0].checked !== 'boolean' || matches[0].disabled) throw new Error(`발행 중단: 원래 설정 확인 불가(${id})`);
    return matches[0].checked;
  };
  const search = desired('publish-option-search'), scrap = desired('publish-option-scrap'), outside = desired('publish-option-outside');
  const scrapMode = preserve ? preserve.shareMode : '링크허용';
  if (preserve && !scrapMode) throw new Error('발행 중단: 원래 공유 방식 확인 불가');
  const problems = [];
  if (state.searchCount !== 1) problems.push('검색허용 옵션을 하나로 확인하지 못함');
  else if (state.searchDisabled) problems.push('검색허용 옵션이 비활성: 저장값 확인 불가');
  else if (state.searchChecked !== search) problems.push(preserve ? '원래 검색 설정과 다름' : '검색 비허용');
  if (state.publicCount !== 1) problems.push('공개범위 선택을 하나로 확인하지 못함');
  else if (state.publicDisabled) problems.push('공개범위 옵션이 비활성: 저장값 확인 불가');
  else if (state.publicLabel !== '전체공개') problems.push(`전체공개 확인 실패(${state.publicLabel ?? '라벨 없음'})`);
  if (state.scrapCount !== 1) problems.push('블로그·카페 공유 옵션을 하나로 확인하지 못함');
  else if (state.scrapDisabled) problems.push('블로그·카페 공유 옵션이 비활성: 저장값 확인 불가');
  else if (state.scrapChecked !== scrap) problems.push(preserve ? '원래 블로그·카페 공유 설정과 다름' : '블로그·카페 공유 비허용');
  if (state.scrapModeDisabled) problems.push('공유 방식이 비활성: 저장값 확인 불가');
  else if (state.scrapMode !== scrapMode) problems.push(`공유 방식 확인 실패(${state.scrapMode ?? '공유 방식 없음'})`);
  if (state.outsideCount !== 1) problems.push('외부 공유 옵션을 하나로 확인하지 못함');
  else if (state.outsideDisabled) problems.push('외부 공유 옵션이 비활성: 저장값 확인 불가');
  else if (state.outsideChecked !== outside) problems.push(preserve ? '원래 외부 공유 설정과 다름' : '외부 공유 비허용');

  if (problems.length) throw new Error(`발행 중단: ${problems.join(' / ')}`);
  return state;
}
