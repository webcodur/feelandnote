---
name: suno-download
description: Suno 곡(suno.com/song/<id>)의 오디오를 로컬 파일로 저장한다. 단순 fetch로 받은 CloudFront m4a는 AES-CTR 암호화 스트림이라 재생 불가 — 로그인된 Aside 브라우저에서 mango/rights 키를 받아 복호화해야 한다. "수노 다운로드", "suno 곡 받아줘", "suno 링크 음원 추출", "suno m4a" 요청, 또는 받은 suno 파일이 재생 안 될 때 적용한다.
---

# Suno 오디오 다운로드

Suno 스트림(`d2lwuy8qc234o3.cloudfront.net/1/clip/<id>.m4a`)은 `encoding: 1.0.0` AES-CTR 암호화다. fetch/curl로 받으면 `ftyp` 아톰 없는 난수 파일이 되어 재생이 안 된다. 복호화 키는 로그인 세션의 `POST studio-api-prod.suno.com/api/mango/rights`가 준다 — 웹 플레이어가 쓰는 정규 경로이므로 무료 플랜 다운로드 제한(0회)과 무관하게 본인 곡·공개 곡 모두 된다.

## 전제

- aside-browser 스킬의 전제와 같다 — Aside 실행, Suno 로그인 프로필. 브라우저 제어는 무조건 `aside repl`이다.
- 곡 ID는 `suno.com/song/<UUID>` 경로에서 뽑는다.

## 실행

아래를 한 번의 `aside repl` 호출로 돌린다. `<CLIP_ID>`만 바꾼다. 파일명은 `<NAME>`으로 지정한다(미지정 시 clip id).

```bash
"C:/Users/webco/AppData/Local/Aside/CLI/current/aside.exe" repl "const p = await openTab('https://suno.com/song/<CLIP_ID>'); await sleep(4000); const r = await p.evaluate(async () => { const clipId='<CLIP_ID>'; const b64ToU8=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0)); const rr=await fetch('https://studio-api-prod.suno.com/api/mango/rights',{method:'POST',headers:{'Content-Type':'application/json'},credentials:'include',body:JSON.stringify({content_params:{content_id:clipId,content_type:'clip'}})}); if(!rr.ok) return {err:'rights '+rr.status}; const rights=await rr.json(); const ukBuf=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(rights.glt)); const uk=await crypto.subtle.importKey('raw',ukBuf,{name:'AES-GCM'},false,['decrypt']); const aad=new TextEncoder().encode(clipId); const rk=b64ToU8(rights.key); const ckBuf=await crypto.subtle.decrypt({name:'AES-GCM',iv:rk.subarray(0,12),additionalData:aad},uk,rk.subarray(12)); const ri=b64ToU8(rights.iv); const civBuf=await crypto.subtle.decrypt({name:'AES-GCM',iv:ri.subarray(0,12),additionalData:aad},uk,ri.subarray(12)); const mr=await fetch('https://d2lwuy8qc234o3.cloudfront.net/1/clip/'+clipId+'.m4a'); const mb=await mr.arrayBuffer(); const ck=await crypto.subtle.importKey('raw',ckBuf,{name:'AES-CTR'},false,['decrypt']); const dec=await crypto.subtle.decrypt({name:'AES-CTR',counter:new Uint8Array(civBuf),length:128},ck,mb); const blob=new Blob([dec],{type:'audio/mp4'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='<NAME>.m4a'; document.body.appendChild(a); a.click(); const h=Array.from(new Uint8Array(dec.slice(0,12))).map(b=>b.toString(16).padStart(2,'0')).join(' '); return {ok:true,size:dec.byteLength,head:h} }); console.log(JSON.stringify(r))"
```

- 성공 시 `{"ok":true,"size":...,"head":"00 00 00 1c 66 74 79 70 69 73 6f 6d"}` — `66 74 79 70` = `ftyp`.
- 파일은 브라우저 다운로드 폴더(`C:\Users\webco\Downloads`)에 떨어진다.
- 곡 메타(제목·태그·길이)가 필요하면 `GET https://studio-api.prod.suno.com/api/clip/<CLIP_ID>`는 인증 없이도 열린다.
- 여러 곡은 같은 탭에서 `p.evaluate`를 곡마다 반복 호출한다 — 탭을 다시 열 필요 없다.

## 검수

```bash
ffprobe -v error -show_entries format=duration -of default=nw=1 "C:/Users/webco/Downloads/<NAME>.m4a"
```

duration이 나오면 완료. `moov atom not found`는 암호문 그대로 저장된 것이다.

## 실패 시

- `rights 401/403` → Suno 로그인이 풀린 프로필이다. `aside account list`로 로그인된 프로필을 골라 `aside repl --account <id>`로 다시 연다.
- `rights 404` → 곡 ID 오기입 또는 삭제된 곡.
- repl 세션 밖에서 연 탭은 `closeTab`이 못 닫는다(`not tracked in this session`) — 정리는 같은 repl 호출 안에서 하거나 사용자에게 둔다.
- 변형은 aside-browser 스킬과 같다 — 자연어 위임(`aside exec`)은 크레딧을 쓰므로 쓰지 않는다.

## 배경 (왜 이 모양인가)

- `audio_url` 필드는 `/api/forbidden`으로 비워져 있고, `media_urls[].url`만 유효하다 — 이것이 암호문이다.
- 복호화 절차: `glt`를 SHA-256 → AES-GCM 유저키. `rights.key`·`rights.iv` 각각 앞 12바이트를 GCM IV, 나머지를 암호문으로, AAD=clipId(UTF-8)로 풀면 AES-CTR 콘텐츠 키와 카운터가 나온다. m4a 전체를 CTR로 복호화한다.
- 유료 플랜의 UI 다운로드와 무관하게 플레이어가 재생에 쓰는 키 경로라, 곡이 페이지에서 재생만 되면 이 방법이 통한다.
