// Shared host staging and observed Claude web artifact controls.
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';

export const sha256 = value => createHash('sha256').update(value).digest('hex');
export const quote = JSON.stringify;
export function textOf(reply) { return reply.content?.filter(x => x.type === 'text').map(x => x.text).join('\n') ?? ''; }
export async function replJSON(client, script, title) { return JSON.parse(textOf(await client.callRepl(script, title))); }

export async function sessionDirectory(client) {
  const directory = await replJSON(client, 'console.log(JSON.stringify(pwd))', 'Locate private Aside session storage');
  const absolute = path.resolve(directory);
  const allowed = path.resolve(process.env.USERPROFILE ?? 'C:/Users/webco', '.aside');
  const relative = path.relative(allowed, absolute);
  if (relative.startsWith('..') || path.isAbsolute(relative)) throw new Error('Aside session is outside expected host storage');
  if (!(await fs.stat(absolute)).isDirectory()) throw new Error('Aside session directory is not host accessible');
  return absolute;
}

export async function stagePacket(client, packet) {
  const directory = await sessionDirectory(client);
  const source = await fs.readFile(packet.file);
  if (sha256(source) !== packet.packet_sha256) throw new Error('Packet changed before upload');
  const destination = path.join(directory, `${packet.slug}.${packet.packet_sha256.slice(0, 12)}.txt`);
  try { await fs.writeFile(destination, source, { flag: 'wx' }); }
  catch (error) { if (error.code !== 'EEXIST' || sha256(await fs.readFile(destination)) !== packet.packet_sha256) throw error; }
  return destination;
}

export async function attachOwnedConversation(client, record) {
  const tabs = await replJSON(client, 'console.log(JSON.stringify(await listBrowserTabs()))', 'Find recorded conversation');
    const existing = tabs.find(tab => record.target_id&&tab.targetId===record.target_id)
    ?? tabs.find(tab => record.conversation_url?.includes('/chat/') && tab.url === record.conversation_url);
  if (existing) await client.callRepl(`await attachBrowserTab(${quote(existing.targetId)}); console.log('attached')`, 'Resume owned conversation');
  else if (record.conversation_url?.includes('/chat/')) await client.callRepl(`await openTab(${quote(record.conversation_url)}); console.log('opened recorded conversation')`, 'Resume saved conversation');
  else throw new Error('No resumable conversation; submission state needs review');
}

export async function freshSnapshot(client, interactive = true) {
  return replJSON(client, `console.log(JSON.stringify(await snapshot(page, {interactive:${interactive}})))`, 'Inspect current page');
}

export async function ensureSonnetHigh(client) {
  let state=await replJSON(client,"console.log(JSON.stringify(await snapshot(page,{interactive:true,selector:'main'})))",'Inspect actual model and Chat mode');
  for(let attempt=0;attempt<4&&!/button \"모델: Sonnet 5.5/.test(state.tree);attempt++){
    await new Promise(resolve=>setTimeout(resolve,500));
    state=await replJSON(client,"console.log(JSON.stringify(await snapshot(page,{interactive:true,selector:'main'})))",'Wait for observed model controls to finish loading');
  }
  if(state.tree.includes('모델: Sonnet 5.5 높음'))return state;
  const modelLine=state.tree.split('\n').find(line=>/button \"모델: Sonnet 5.5/.test(line));
  const modelRef=modelLine?.match(/\[ref=([^\]]+)\]/)?.[1];
  if(!modelRef)throw new Error('Actual Sonnet 5.5 model control missing');
  await client.callRepl(`await page.locator(${quote(modelRef)}).click(); console.log('opened observed model menu')`,'Set Sonnet effort');
  let menu;
  for(let attempt=0;attempt<3;attempt++){
    try{menu=await replJSON(client,"console.log(JSON.stringify(await snapshot(page,{interactive:true,selector:'[role=\"menu\"]'})))",'Inspect model effort controls');break;}
    catch(error){
      if(attempt===2)throw error;
      await new Promise(resolve=>setTimeout(resolve,500));
      const actual=await replJSON(client,"console.log(JSON.stringify(await snapshot(page,{interactive:true,selector:'main'})))",'Inspect unconfirmed model-menu action');
      const freshRef=actual.tree.split('\n').find(line=>/button \"모델: Sonnet 5.5/.test(line))?.match(/\[ref=([^\]]+)\]/)?.[1];
      if(!freshRef)throw new Error('Observed model control disappeared');
      await client.callRepl(`await page.locator(${quote(freshRef)}).click(); console.log('retried unconfirmed model menu action')`,'Retry observed model control');
    }
  }
  const effort=menu.tree.split('\n').find(line=>/menuitem \"노력 /.test(line))?.match(/\[ref=([^\]]+)\]/)?.[1];
  if(!effort)throw new Error('Observed model effort control missing');
  await client.callRepl(`await page.locator(${quote(effort)}).click(); console.log('opened observed effort submenu')`,'Open effort choices');
  menu=await replJSON(client,"console.log(JSON.stringify(await snapshot(page,{interactive:true,selector:'[role=\"menu\"]'})))",'Inspect effort choices');
  let high=menu.tree.split('\n').find(line=>/menuitemradio \"높음\"/.test(line))?.match(/\[ref=([^\]]+)\]/)?.[1];
  for(let attempt=0;attempt<4&&!high;attempt++){
    await new Promise(resolve=>setTimeout(resolve,500));
    menu=await replJSON(client,"console.log(JSON.stringify(await snapshot(page,{interactive:true,selector:'[role=\"menu\"]'})))",'Wait for observed effort submenu');
    high=menu.tree.split('\n').find(line=>/menuitemradio \"높음\"/.test(line))?.match(/\[ref=([^\]]+)\]/)?.[1];
  }
  if(!high)throw new Error('Observed high effort choice missing');
  await client.callRepl(`await page.locator(${quote(high)}).click(); await page.locator('[data-testid="chat-input"]').click(); console.log('selected observed high effort')`,'Apply Sonnet high effort');
  state=await replJSON(client,"console.log(JSON.stringify(await snapshot(page,{interactive:true,selector:'main'})))",'Confirm actual Sonnet high setting');
  if(!state.tree.includes('모델: Sonnet 5.5 높음'))throw new Error('Sonnet high setting not confirmed');
  return state;
}

/** Selectors must come from the pilot's inspected DOM, never invented here. */
export async function compactStatus(client, selectors) {
  if (!selectors.response) throw new Error('Verified response selector required');
  return replJSON(client, `console.log(JSON.stringify(await page.evaluate((s) => {
    const blocks = [...document.querySelectorAll(s.response)];
    const last = blocks.at(-1);
    const statuses = [...document.querySelectorAll('[role="status"]')].map(x=>x.textContent?.trim()??'').filter(Boolean);
    const notices=[...document.querySelectorAll('[role="status"],[role="alert"]')]
      .filter(x=>!x.closest(s.response)&&!x.closest('[role="article"]'))
      .map(x=>x.textContent?.trim()??'');
    const generating=statuses.some(x=>/Claude가 응답 중입니다|Claude is responding|Claude is generating/i.test(x));
    const complete=statuses.some(x=>/Claude가 응답을 완료했습니다|Claude has finished|Claude finished responding/i.test(x));
    const downloadable=[...document.querySelectorAll('[role="feed"] button')].some(x=>/^(다운로드|Download)$/.test(x.textContent.trim()));
    return {url:location.href,chars:last?.textContent?.length??0,responses:blocks.length,
      busy:generating?true:complete||downloadable?false:s.stop?!!document.querySelector(s.stop):null,
      downloadable,
      statuses:statuses.filter(x=>x.length<180),
      quota:notices.some(x=>/^(?:You(?:'ve| have) reached (?:your |the )?(?:usage|message|free).*limit|Usage limit reached|Message limit reached|사용 한도에 도달|메시지 한도에 도달|한도에 도달했습니다|(?:오전|오후)[ ]+[0-9]{1,2}:[0-9]{2}까지 무료 메시지(?:[(]새 탭에서 열림[)])?를 모두 사용했습니다)/i.test(x))&&!(downloadable&&!generating),
      login:location.pathname.includes('/login'),
      artifact:s.artifact?!!document.querySelector(s.artifact):false};
  }, ${quote(selectors)})))`, 'Check response progress');
}

export async function saveExtractedJSON(client, destination, selector) {
  if (!selector) throw new Error('Verified JSON artifact selector required');
  return client.saveRepl(`console.log(await page.locator(${quote(selector)}).last().textContent())`, destination, {
    format: 'json',
    extract: text => {
      const trimmed = text.trim();
      const fence = /^```(?:json)?\s*([\s\S]*?)\s*```$/.exec(trimmed);
      return JSON.parse(fence ? fence[1] : trimmed);
    },
  });
}

export async function downloadRef(client) {
  for(let attempt=0;attempt<2;attempt++){
    const scope=await replJSON(client, "console.log(JSON.stringify(await snapshot(page,{interactive:true,selector:'[role=\"feed\"]'})))", 'Find artifact download control');
    const lines=scope.tree.split('\n').filter(line=>/button \"[^\"]*(?:다운로드|Download)\"/.test(line));
    const refs=lines.map(line=>line.match(/\[ref=([^\]]+)\]/)?.[1]).filter(Boolean);
    // Feed order is chronological: choose the last rendered response's artifact.
    if(refs.length)return refs.at(-1);
    if(attempt===0)await new Promise(resolve=>setTimeout(resolve,1500));
  }
  throw new Error('Artifact download control is missing after one observed recheck');
}

export async function collectDownload(client, destination, triggerSelector) {
  const directory = await sessionDirectory(client);
  const temporary = path.join(directory, `download-${Date.now()}.json`);
  const trigger=triggerSelector==='scoped-feed-download-ref'?await downloadRef(client):triggerSelector;
  if(!trigger)throw new Error('Verified download control required');
  const marker = `download${Date.now()}`;
  await client.callRepl(`var ${marker}Promise = page.waitForEvent('download'); await page.locator(${quote(trigger)}).click(); var ${marker} = await ${marker}Promise; await ${marker}.saveAs(${quote(temporary)}); console.log(JSON.stringify({filename:await ${marker}.suggestedFilename(),path:${quote(temporary)}}))`, 'Save downloaded artifact');
  const raw = await fs.readFile(temporary);
  JSON.parse(raw.toString('utf8'));
  await fs.mkdir(path.dirname(destination), { recursive: true });
  await fs.writeFile(destination, raw, { flag: 'wx' });
  return { path: path.resolve(destination), bytes: raw.length, sha256: sha256(raw) };
}
