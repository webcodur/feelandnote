// Native SmartEditor operations verified on a complete existing article.
// Text is selected through actual mouse/keyboard events; DOM ranges only measure caret positions.
export const EDITORIAL_FONT_SIZES = Object.freeze({ label: 13, author: 16, body: 19, heading: 24 });
export const EDITORIAL_PORTRAIT_WIDTH = 360;
export const EDITORIAL_COVER_WIDTH = 240;

export function createEditorialEditor(page) {
  const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
  const selector = '.se-component:not(.se-documentTitle) .se-text-paragraph';

  async function clickControl(css) {
    await page.waitForSelector(css, { visible: true, timeout: 10000 });
    const point = await page.evaluate(css => {
      const node = [...document.querySelectorAll(css)].find(node => node.offsetParent && !node.disabled);
      if (!node) throw new Error(`Visible editor control missing: ${css}`);
      const rect = node.getBoundingClientRect();
      return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    }, css);
    // The toolbar rerenders on selection changes; an ElementHandle can detach before click.
    await page.mouse.click(point.x, point.y);
  }

  async function selectParagraph(text, { occurrence = 0 } = {}) {
    const handle = await page.evaluateHandle(({ selector, text, occurrence }) =>
      [...document.querySelectorAll(selector)].filter(p => p.textContent.replace(/\u200b/g, '').trim() === text)[occurrence] ?? null,
    { selector, text, occurrence });
    if (!handle.asElement()) { await handle.dispose(); throw new Error(`Exact paragraph missing: ${text.slice(0, 50)}`); }
    let points;
    try {
      await handle.evaluate(p => p.scrollIntoView({ block: 'center', behavior: 'instant' }));
      await wait(150);
      points = await handle.evaluate(p => {
        const walker = document.createTreeWalker(p, NodeFilter.SHOW_TEXT), nodes = [];
        while (walker.nextNode()) if (walker.currentNode.textContent.replace(/\u200b/g, '').length) nodes.push(walker.currentNode);
        if (!nodes.length) throw new Error('Cannot select an empty paragraph');
        const first = nodes[0], last = nodes.at(-1);
        let start = 0, end = last.length;
        while (first.textContent[start] === '\u200b') start++;
        while (last.textContent[end - 1] === '\u200b') end--;
        const head = document.createRange(); head.setStart(first, start); head.setEnd(first, start + 1);
        const tail = document.createRange(); tail.setStart(last, end - 1); tail.setEnd(last, end);
        const a = head.getBoundingClientRect(), b = tail.getBoundingClientRect();
        if (a.top < 125 || b.bottom > innerHeight - 20) throw new Error('Paragraph cannot be selected safely within the viewport');
        return { start: { x: a.left + 0.5, y: a.top + a.height / 2 }, end: { x: b.right + 1, y: b.top + b.height / 2 } };
      });
    } finally { await handle.dispose(); }
    // Drag selection can silently collapse inside a long quotation. Shift-click is stable.
    await page.mouse.click(points.start.x, points.start.y);
    await wait(150);
    // Placing the caret can scroll the editor. A stale end point lands on the next paragraph,
    // and typing over that selection merges the two paragraphs, so measure the end again.
    points.end = await page.evaluate(({ selector, text, occurrence }) => {
      const p = [...document.querySelectorAll(selector)].filter(p => p.textContent.replace(/\u200b/g, '').trim() === text)[occurrence];
      if (!p) throw new Error('Paragraph disappeared after placing the caret');
      const walker = document.createTreeWalker(p, NodeFilter.SHOW_TEXT), nodes = [];
      while (walker.nextNode()) if (walker.currentNode.textContent.replace(/\u200b/g, '').length) nodes.push(walker.currentNode);
      const last = nodes.at(-1);
      let end = last.length;
      while (last.textContent[end - 1] === '\u200b') end--;
      const tail = document.createRange(); tail.setStart(last, end - 1); tail.setEnd(last, end);
      const b = tail.getBoundingClientRect();
      if (b.top < 125 || b.bottom > innerHeight - 20) throw new Error('Paragraph end moved outside the viewport');
      return { x: b.right - 1, y: b.top + b.height / 2 };
    }, { selector, text, occurrence });
    await page.keyboard.down('Shift');
    try { await page.mouse.click(points.end.x, points.end.y); }
    finally { await page.keyboard.up('Shift'); }
    await wait(200);
  }

  async function fontSize(size) {
    if (!Object.values(EDITORIAL_FONT_SIZES).includes(size)) throw new Error(`Unreviewed editorial font size: ${size}`);
    await clickControl('.se-font-size-code-toolbar-button'); await wait(120);
    await clickControl(`.se-toolbar-option-font-size-code-fs${size}-button`); await wait(200);
  }

  async function formatParagraph(text, size, occurrence = 0) {
    await selectParagraph(text, { occurrence }); await fontSize(size);
  }

  async function replaceParagraph(before, after, { occurrence = 0 } = {}) {
    if (!before.trim() || !after.trim()) throw new Error('Paragraph replacement requires nonempty reviewed text');
    await selectParagraph(before, { occurrence });
    const parts = after.split('\n');
    for (let index = 0; index < parts.length; index++) {
      if (index) await page.keyboard.press('Enter');
      await page.keyboard.sendCharacter(parts[index]);
    }
    await wait(150);
    const found = await page.evaluate(({ selector, parts }) => parts.every(text =>
      [...document.querySelectorAll(selector)].some(p => p.textContent.replace(/\u200b/g, '').trim() === text)), { selector, parts });
    if (!found) throw new Error(`Paragraph replacement did not match: ${before.slice(0, 50)}`);
    // The caller must still compare the complete article, links and images before saving.
  }

  async function clearParagraph(before, { occurrence = 0 } = {}) {
    if (!before.trim()) throw new Error('A reviewed nonempty paragraph is required');
    const count = await page.$$eval(selector,(nodes,text)=>nodes.filter(p=>p.textContent.replace(/\u200b/g,'').trim()===text).length,before);
    await selectParagraph(before, { occurrence });
    await page.keyboard.press('Backspace');
    await wait(150);
    // Remove the empty paragraph and preceding blank separators, without joining two text paragraphs.
    // A first paragraph can border a photograph or quotation; never backspace across that boundary.
    for(let i=0;i<6;i++){
      const removable = await page.evaluate(()=>{
        const selection=getSelection(),node=selection?.anchorNode,element=node?.nodeType===Node.ELEMENT_NODE?node:node?.parentElement;
        const p=element?.closest('.se-text-paragraph'),component=p?.closest('.se-component:not(.se-documentTitle)');
        if(!selection?.isCollapsed||!p||!component||p.textContent.replace(/\u200b/g,'').trim())return false;
        return [...component.querySelectorAll('.se-text-paragraph')].indexOf(p)>0;
      });
      if(!removable)break;await page.keyboard.press('Backspace');await wait(80);
    }
    const afterCount = await page.$$eval(selector,(nodes,text)=>nodes.filter(p=>p.textContent.replace(/\u200b/g,'').trim()===text).length,before);
    if (afterCount!==count-1) throw new Error('Reviewed paragraph was not cleared exactly once');
  }

  async function alignParagraph(text, align, { occurrence = 0 } = {}) {
    if (!['left', 'center', 'right'].includes(align)) throw new Error('Unreviewed paragraph alignment');
    // Quotations already align left and expose a different toolbar without this dropdown.
    const alreadyAligned = await page.evaluate(({ selector, text, occurrence, align }) => {
      const matches = [...document.querySelectorAll(selector)].filter(p => p.textContent.replace(/\u200b/g, '').trim() === text);
      return matches[occurrence] && getComputedStyle(matches[occurrence]).textAlign === align;
    }, { selector, text, occurrence, align });
    if (alreadyAligned) return;
    await selectParagraph(text, { occurrence });
    await clickControl('.se-toolbar-item-align .se-property-toolbar-drop-down-button'); await wait(150);
    const point = await page.evaluate(label => {
      const button = [...document.querySelectorAll('button')].find(e => e.offsetParent && e.textContent.trim().startsWith(label));
      if (!button) throw new Error('Paragraph alignment choice missing');
      const rect = button.getBoundingClientRect(); return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    }, align === 'center' ? '가운데 정렬' : align === 'right' ? '오른쪽 정렬' : '왼쪽 정렬');
    await page.mouse.click(point.x, point.y); await wait(150);
    const aligned = await page.evaluate(({ selector, text, occurrence, align }) => {
      const p = [...document.querySelectorAll(selector)].filter(p => p.textContent.replace(/\u200b/g, '').trim() === text)[occurrence];
      return p && getComputedStyle(p).textAlign === align;
    }, { selector, text, occurrence, align });
    if (!aligned) throw new Error('Paragraph alignment differs');
  }

  const alignLeft = (text, options) => alignParagraph(text, 'left', options);
  return { selectParagraph, replaceParagraph, clearParagraph, fontSize, formatParagraph, alignLeft, alignParagraph, clickControl };
}
