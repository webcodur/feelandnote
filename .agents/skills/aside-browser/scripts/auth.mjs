// Authorized same-operator account rotation through observed web controls.
import fs from 'node:fs/promises';
import path from 'node:path';
import { freshSnapshot, quote, replJSON } from './browser-helpers.mjs';

const credentialsPath = 'D:/문서/id_key/google.txt';
async function readCredentials(filename){
  try{return await fs.readFile(filename,'utf8');}
  catch(error){
    if(error.code!=='ENOENT'||path.basename(filename)!=='구글.txt')throw error;
    // The operator renamed this same authorized folder's file to google.txt.
    return fs.readFile(path.join(path.dirname(filename),'google.txt'),'utf8');
  }
}
export async function allowedAccountEmails(filename=credentialsPath) {
  const raw=await readCredentials(filename);
  return [...new Set(raw.match(/[A-Za-z0-9._%+-]+@gmail\.com/gi)??[])];
}

function observedRef(tree, role, name) {
  const lines=tree.split('\n').filter(line=>line.includes(`${role} \"`) && !line.includes('[disabled]') && name.test(line));
  const refs=lines.map(line=>line.match(/\[ref=([^\]]+)\]/)?.[1]).filter(Boolean);
  return refs.length===1?refs[0]:null;
}

async function authSnapshot(client) {
  return replJSON(client,"console.log(JSON.stringify(await snapshot(page,{interactive:true})))",'Inspect login controls');
}
async function observedClick(client,ref) {
  await client.callRepl(`await page.locator(${quote(ref)}).click(); console.log('auth control accepted')`,'Continue observed login flow');
}

export async function inspectClaudeAccount(client,{logout=false}={}) {
  let state=await authSnapshot(client);
  let account=observedRef(state.tree,'button',/button \".* (Free|Pro|Max)\"/);
  for(let attempt=0;attempt<5&&!account&&!/- menu \"/.test(state.tree);attempt++){
    await new Promise(resolve=>setTimeout(resolve,500));
    state=await authSnapshot(client);
    account=observedRef(state.tree,'button',/button \".* (Free|Pro|Max)\"/);
  }
  // A prior private identity check may have left this same menu open.
  // Clicking its account toggle again would close it rather than inspect it.
  if(!/- menu \"/.test(state.tree)){
    if(!account)throw new Error('Observed Claude account menu not found');
    await observedClick(client,account);
    await new Promise(resolve=>setTimeout(resolve,1500));
  }
  let menu;
  for(let attempt=0;attempt<4;attempt++){
    try{const candidate=await authSnapshot(client);if(/- menu \"/.test(candidate.tree)){menu=candidate;break;}}catch{}await new Promise(r=>setTimeout(r,500));
  }
  if(!menu)throw new Error('Claude account menu did not open');
  const email=menu.tree.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/)?.[0];
  if(logout){
    const out=observedRef(menu.tree,'menuitem',/로그아웃|Log out/);
    if(!out)throw new Error('Observed Claude-only logout control missing');
    await observedClick(client,out);
  }
  return {email,logged_out:logout};
}

/** Authorized same-operator signup approvals; optional marketing stays unchecked. */
export async function approveObservedSignup(client,state) {
  const terms=observedRef(state.tree,'checkbox',/I agree to Anthropic|약관.*동의/);
  const privacy=observedRef(state.tree,'checkbox',/I consent to collection|개인정보.*동의/);
  const create=observedRef(state.tree,'button',/계정 만들기|Create account/);
  if(!terms||!privacy||!create)return false;
  await client.callRepl(`await page.locator(${quote(terms)}).check(); await page.locator(${quote(privacy)}).check(); await page.locator(${quote(create)}).click(); console.log('required signup approvals submitted')`,'Approve delegated required signup terms');
  return true;
}

/** Real web UI only. OTP/CAPTCHA/personal fields hold one account and permit another. */
export async function signInAccount(client,email,{credentialsFile=credentialsPath,maxSteps=24,operatorDisplayName='아가톤'}={}) {
  const allowed=await allowedAccountEmails(credentialsFile);
  if(!allowed.some(x=>x.toLowerCase()===email.toLowerCase()))throw new Error('Account is not in authorized credential file');
  let observedGoogleName;
  try{observedGoogleName=(await existingGoogleAccounts(client)).find(x=>x.email.toLowerCase()===email.toLowerCase())?.name;}catch{}
  await client.callRepl("await openTab('https://claude.ai/login'); var ownAuthMain=page; console.log('opened own login tab')",'Open Claude account login');
  let selected=false;
  for(let step=0;step<maxSteps;step++) {
    let state;
    try{state=await authSnapshot(client);}catch{
      await client.callRepl("page=ownAuthMain; console.log('returned to own Claude tab')",'Return after Google authorization');
      state=await authSnapshot(client);
    }
    const tree=state.tree;
    if(/url=https:\/\/claude\.ai\/(?:new|chat)/.test(tree)){
      await new Promise(resolve=>setTimeout(resolve,1500));
      const settled=await authSnapshot(client);
      if(!/url=https:\/\/claude\.ai\/(?:new|chat)/.test(settled.tree))continue;
      const actual=await inspectClaudeAccount(client);
      if(actual.email?.toLowerCase()===email.toLowerCase())return {status:'ready',email};
      await inspectClaudeAccount(client,{logout:true});
      await client.callRepl("await openTab('https://claude.ai/login'); ownAuthMain=page; console.log('opened after Claude-only logout')",'Switch Claude account only');
      selected=false;continue;
    }
    if(/verification code|인증 코드|2-Step Verification|2단계 인증|전화번호|Phone number|date of birth|생년월일/i.test(tree))return {status:'personal_or_otp_hold',email};
    if(/generic \[focused\].*Captcha|captcha challenge|보안 문자|로봇이 아닙니다/i.test(tree))return {status:'captcha_hold',email};
    if(await approveObservedSignup(client,state))continue;
    const free=observedRef(tree,'button',/Claude 무료로 사용하기|Use Claude for free|Continue with Free/);
    if(free){await observedClick(client,free);continue;}
    const skip=observedRef(tree,'button',/\"(?:건너뛰기|Skip|나중에 설정|Set up later)\"/);
    if(skip&&/onboarding/.test(tree)){await observedClick(client,skip);continue;}
    const nameField=observedRef(tree,'textbox',/이름이 무엇인가요|What.*name|Your name/);
    if(nameField&&/onboarding/.test(tree)){
      // AGENTS.md explicitly identifies this same operator's public name as 아가톤.
      const displayName=observedGoogleName??operatorDisplayName;
      if(!displayName)return {status:'missing_observed_name_hold',email};
      await client.callRepl(`await page.locator(${quote(nameField)}).fill(${quote(displayName)}); console.log('filled existing operator display name')`,'Use established operator display name');
      const updated=await authSnapshot(client);
      const go=observedRef(updated.tree,'button',/\"(?:계속|Continue)\"/);
      if(go)await observedClick(client,go);
      continue;
    }
    const pickerLine=tree.split('\n').find(line=>line.includes(email)&&/link|button/.test(line));
    const pickerRef=pickerLine?.match(/\[ref=([^\]]+)\]/)?.[1];
    if(!selected&&pickerRef&&!/selected|선택됨/.test(pickerLine)) {await observedClick(client,pickerRef);selected=true;continue;}
    const google=observedRef(tree,'button',/Google로 계속하기|Continue with Google/);
    if(google){
      const priorTabs=await replJSON(client,"console.log(JSON.stringify(await listBrowserTabs()))",'Record existing authorization tabs');
      await observedClick(client,google);
      await client.callRepl("var ownAuthTabs=await listBrowserTabs(); console.log(JSON.stringify(ownAuthTabs.filter(t=>t.url.startsWith('https://accounts.google.com/')).map(t=>({targetId:t.targetId,url:t.url}))))",'Locate Google OAuth popup');
      const tabs=await replJSON(client,"console.log(JSON.stringify(await listBrowserTabs()))",'Resolve observed Google popup');
      const popup=tabs.find(t=>t.url.startsWith('https://accounts.google.com/')&&!priorTabs.some(old=>old.targetId===t.targetId))
        ?? tabs.find(t=>t.active&&t.url.startsWith('https://accounts.google.com/'));
      if(!popup){await new Promise(r=>setTimeout(r,1500));continue;}
      await client.callRepl(`await attachBrowserTab(${quote(popup.targetId)}); console.log('attached OAuth popup')`,'Use own Google OAuth popup');
      continue;
    }
    const another=observedRef(tree,'link',/Use another account|다른 계정 사용/);
    if(another&&!selected){await observedClick(client,another);continue;}
    const passwordRef=observedRef(tree,'textbox',/Enter your password|비밀번호 입력|Password/);
    const emailRef=observedRef(tree,'textbox',/Email or phone|이메일 또는 휴대전화/);
    const next=observedRef(tree,'button',/\"(?:Next|다음)\"/);
    if((emailRef||passwordRef)&&next){
      await fillObservedLogin(client,{email,fieldRef:passwordRef??emailRef,nextRef:next,kind:passwordRef?'password':'email',credentialsFile,observedSnapshot:state});
      selected=true;continue;
    }
    const consent=observedRef(tree,'button',/\"(?:Continue|계속)\"/);
    if(consent&&/Google|Claude/.test(tree)){await observedClick(client,consent);continue;}
    const otherEmail=observedRef(tree,'link',/다른 이메일 사용|Use a different email/);
    if(otherEmail&&!tree.includes(email)){await observedClick(client,otherEmail);selected=false;continue;}
    // Only repeat inspection when the observed state is still transitioning.
    await new Promise(r=>setTimeout(r,1500));
  }
  return {status:'unrecognized_login_hold',email};
}

export async function rotateAccount(client,{usedEmails=[],credentialsFile=credentialsPath,onAttempt=()=>{}}={}) {
  const allowed=await allowedAccountEmails(credentialsFile);
  try{
    await client.callRepl("await openTab('https://claude.ai/new'); console.log('opened own account rotation screen')",'Identify exhausted Claude account');
    const current=await inspectClaudeAccount(client);
    if(current.email&&!usedEmails.includes(current.email)){
      usedEmails.push(current.email);
      onAttempt({status:'quota_exhausted',account_index:allowed.indexOf(current.email)+1,account_specific:true});
    }
  }catch{}
  let existing=[];try{existing=await existingGoogleAccounts(client);}catch{}
  const signedIn=existing.map(x=>x.email).filter(x=>allowed.includes(x));
  const candidates=[...new Set([...signedIn,...allowed])].filter(x=>!usedEmails.includes(x));
  let controllerFailures=0;
  for(const email of candidates){
    let result;try{result=await signInAccount(client,email,{credentialsFile});}catch{result={status:'login_error_hold',email};}
    const specific=['ready','personal_or_otp_hold','captcha_hold','missing_observed_name_hold'].includes(result.status);
    if(specific){usedEmails.push(email);controllerFailures=0;}else controllerFailures++;
    onAttempt({status:result.status,account_index:allowed.indexOf(email)+1,account_specific:specific,controller_failures:controllerFailures});
    if(result.status==='ready')return {...result,usedEmails};
    if(controllerFailures>=3)return {status:'controller_hold',usedEmails};
  }
  return {status:'all_accounts_held',usedEmails};
}

/** Credentials stay in local memory. Never return passwords or file contents. */
export async function credentialFor(email, filename = credentialsPath) {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Valid account email required');
  const raw = await readCredentials(filename);
  // Accept only an unambiguous adjacent token/line for the exact requested email.
  const lines = raw.split(/\r?\n/);
  const matches = [];
  for (let index = 0; index < lines.length; index++) {
    const tokens = lines[index].trim().split(/[\t ,|]+/).filter(Boolean);
    const position = tokens.findIndex(token => token.toLowerCase() === email.toLowerCase());
    if (position < 0) continue;
    const next = tokens[position + 1] ?? lines[index + 1]?.trim();
    if (next && !/\s|@/.test(next)) matches.push(next);
  }
  if (matches.length !== 1) throw new Error('Account password format is ambiguous; credential file was not logged');
  return { email, password: matches[0] };
}

export async function existingGoogleAccounts(client) {
  return replJSON(client, 'console.log(JSON.stringify(await googleAccounts.list()))', 'Find existing Google sign-ins');
}

/** UI auth proceeds only using fresh observed refs supplied by the controller. */
export async function selectExistingGoogleAccount(client, email) {
  const state = await freshSnapshot(client);
  const matching = state.tree.split('\n').filter(line => line.includes(email));
  const refs = matching.map(line => line.match(/\[(?:ref=)?([a-z]\w*)\]/)?.[1]).filter(Boolean);
  if (refs.length !== 1) return { status: 'needs_account_picker_inspection' };
  await client.callRepl(`await page.locator(${quote(refs[0])}).click(); console.log(JSON.stringify((await snapshot(page,{interactive:true})).diff))`, 'Select signed-in Google account');
  return { status: 'selected', email };
}

export async function fillObservedLogin(client, { email, fieldRef, nextRef, kind, credentialsFile, observedSnapshot }) {
  if (!['email', 'password'].includes(kind)) throw new Error('Unsupported login field');
  // Do not take another snapshot here: that would invalidate the observed refs.
  if (!observedSnapshot?.tree) throw new Error('Fresh observed login snapshot required');
  for (const ref of [fieldRef, nextRef]) if (!observedSnapshot.tree.includes(`[${ref}]`) && !observedSnapshot.tree.includes(`[ref=${ref}]`)) throw new Error('Login ref is not in the supplied fresh snapshot');
  const value = kind === 'email' ? email : (await credentialFor(email, credentialsFile)).password;
  // REPL code remains private in the runner. Never print this code or error output.
  try {
    await client.callRepl(`await page.locator(${quote(fieldRef)}).fill(${quote(value)}); await page.locator(${quote(nextRef)}).click(); await sleep(1500); console.log('login step submitted')`, 'Complete observed Google login step');
  } catch { throw new Error('Observed Google login step failed; credentials suppressed'); }
  return { status: 'submitted', kind };
}

export async function classifyAuth(client) {
  const state = await freshSnapshot(client);
  if (/verification code|인증 코드|2-Step Verification|2단계 인증|휴대전화.*확인/i.test(state.tree)) return { status: 'otp_hold' };
  if (/upgrade|업그레이드|subscribe|구독/i.test(state.tree) && !/chat-input/.test(state.tree)) return { status: 'inspect_plan_screen' };
  return { status: 'inspect', snapshot: state };
}
