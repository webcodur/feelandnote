import crypto from 'node:crypto';

// Existing published/reserved posts share the same editor entry and read checks.
export function createExistingEditor(page, { onStep = () => {} } = {}) {
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const hash = value => crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');

  async function click(selector) {
    await page.waitForSelector(selector, { visible: true, timeout: 15000 });
    await page.click(selector);
  }

  async function blankEditor() {
    const response = await page.goto('https://blog.naver.com/dmx777/postwrite', { waitUntil: 'domcontentloaded', timeout: 30000 });
    if (!response?.ok()) throw new Error(`글쓰기 화면 조회 실패: HTTP ${response?.status()}`);
    await page.waitForSelector('button[class*=publish_btn]', { timeout: 30000 });
    await page.waitForFunction(() => !document.body.innerText.includes('글을 불러오고 있습니다'), { timeout: 20000 });
    // 저장된 다른 원고를 불러오지 않는다. 취소는 원고 삭제가 아니다.
    const resume = await page.evaluateHandle(() => {
      const layer = [...document.querySelectorAll('[role=dialog],.se-popup')].find(e => e.offsetParent && /작성 중|임시저장|불러오/.test(e.textContent));
      return layer ? [...layer.querySelectorAll('button')].find(e => /^(취소|아니오|닫기)$/.test(e.textContent.trim())) ?? null : null;
    });
    if (resume.asElement()) await resume.asElement().click();
    await resume.dispose();
  }

  async function openTarget(d) {
    onStep('open-editor');
    await blankEditor();
    let reservation = null;
    const date = d.scheduledAt?.match(/(\d{4})\.\s*(\d{2})\.\s*(\d{2})\s+(\d{2}:\d{2})/);
    const futureReservation = date && new Date(`${date[1]}-${date[2]}-${date[3]}T${date[4]}:00+09:00`).getTime() > Date.now();
    if (futureReservation) await page.waitForSelector('button[class*=reserve_btn]', { timeout: 15000 });
    const reserveButton = await page.$('button[class*=reserve_btn]');
    if (reserveButton) {
      onStep('open-reservation-list');
      await click('button[class*=reserve_btn]');
      await page.waitForSelector('button[class*=article_button]', { timeout: 15000 });
      const rows = await page.$$eval('button[class*=article_button]', bs => bs.map(b => b.innerText.replace(/\u200b/g, '').trim()));
      const matches = rows.filter(text => text.slice(0, text.lastIndexOf('\n')).trim() === d.title.trim());
      if (matches.length > 1) throw new Error(`예약 제목 중복: ${d.title}`);
      if (matches.length === 1) {
        reservation = { row: matches[0], count: rows.length };
        const button = await page.evaluateHandle(text => [...document.querySelectorAll('button[class*=article_button]')].find(b => b.innerText.replace(/\u200b/g, '').trim() === text), matches[0]);
        onStep('load-reserved-post');
        await button.asElement().click();
        await button.dispose();
      }
    }
    if (!reservation) {
      // 미래 예약 기록이 있는데 실제 목록에서 찾지 못했다면 일반 수정 주소로 대신 열지 않는다.
      if (futureReservation) {
        throw new Error(`예약 목록에서 글을 찾지 못했다: ${d.title}`);
      }
      await page.goto(`https://blog.naver.com/PostUpdateForm.naver?blogId=dmx777&logNo=${d.logNo}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    }
    await page.waitForFunction(title => document.querySelector('.se-documentTitle .se-text-paragraph')?.textContent.replace(/\u200b/g, '').trim() === title.trim(), { timeout: 25000 }, d.title);
    if (d.body) {
      const images = d.body.split('\n').filter(l => l.startsWith('[img:')).length;
      await page.waitForFunction(n => document.querySelectorAll('.se-component.se-image').length === n, { timeout: 20000 }, images);
    }
    let previous = '', stable = 0;
    for (let i = 0; i < 20; i++) {
      const current = hash(await content());
      stable = current === previous ? stable + 1 : 0;
      if (stable >= 2) break;
      previous = current;
      if (i === 19) throw new Error('본문 로딩이 안정되지 않았다');
      await wait(300);
    }
    onStep('open-publish-options');
    await click('button[class*=publish_btn]');
    await page.waitForSelector('#publish-option-search', { timeout: 10000 });
    const state = await settings();
    if (!state.inputs.find(x => x.id === 'open_public')?.checked) throw new Error('전체공개 상태가 아니다. 공개범위 변경은 하지 않는다');
    if (reservation && !state.inputs.find(x => x.id === 'radio_time2')?.checked) throw new Error('예약 글에 예약 시간이 선택되지 않았다');
    if (reservation) {
      const actual = `${state.date?.replace(/\s/g, '')} ${state.hour}:${state.minute}`;
      if (actual !== reservation.row.split('\n').at(-1).trim()) throw new Error('예약 목록과 발행 패널의 날짜가 다르다');
    }
    return { reservation, state, content: await content() };
  }

  async function content() {
    return page.evaluate(() => ({
      title: document.querySelector('.se-documentTitle .se-text-paragraph')?.textContent.replace(/\u200b/g, '').trim(),
      body: [...document.querySelectorAll('.se-component:not(.se-documentTitle) .se-text-paragraph')].map(e => e.textContent.replace(/\u200b/g, '').trim()).filter(Boolean),
      images: document.querySelectorAll('.se-component.se-image').length,
      dividers: document.querySelectorAll('.se-component.se-horizontalLine').length,
    }));
  }

  async function settings() {
    return page.evaluate(() => ({
      // 사진 편집기가 남기는 「다시 보지 않기」는 발행 설정이 아니다.
      inputs: [...document.querySelectorAll('input[type=checkbox],input[type=radio]')].filter(e => !e.closest('.npe_alert_btn_hide')).map(e => ({ id: e.id, value: e.value, checked: e.checked, disabled: e.disabled })),
      date: document.querySelector('input[class*=input_date]')?.value,
      hour: document.querySelector('select[class*=hour_option]')?.value,
      minute: document.querySelector('select[class*=minute_option]')?.value,
      category: document.querySelector('[class*=selectbox_button]')?.textContent,
      tags: [...document.querySelectorAll('[class*=tag_text]')].map(e => e.textContent),
      shareMode: document.querySelector('#publish-option-scrap')?.closest('li')?.querySelector('a')?.textContent.replace(/\s/g, ''),
    }));
  }

  async function imageSizes(count, expected = null) {
    await page.waitForFunction(({ count, target }) => {
      const imgs = [...document.querySelectorAll('.se-component.se-image img.se-image-resource')];
      return imgs.length === count && imgs.every((image, index) => image.complete && image.naturalWidth > 0 && image.naturalHeight > 0
        && (!target || (image.naturalWidth === target[index][0] && image.naturalHeight === target[index][1])));
    }, { timeout: 30000 }, { count, target: expected })
      .catch(() => { throw new Error(`사진 ${count}장의 크기를 확인하지 못했다${expected ? ' — 액자 처리 또는 재열기 결과가 예상 크기와 다르다' : ''}`); });
    return page.$$eval('.se-component.se-image img.se-image-resource', images => images.map(image => [image.naturalWidth, image.naturalHeight]));
  }

  return { click, blankEditor, openTarget, content, settings, imageSizes };
}
