import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {removeVerifiedDownloadCopy} from './download-cleanup.mjs';

async function fixture(t){
 const parent=path.join(os.tmpdir(),'feelandnote');await fs.mkdir(parent,{recursive:true});
 const root=await fs.mkdtemp(path.join(parent,'download-cleanup-test-')),directory=path.join(root,'Downloads');await fs.mkdir(directory);
 const source=path.join(directory,'received.json'),preserved=path.join(root,'verified.json'),body='{"slug":"test-person","ko":"test","en":"test"}';
 await fs.writeFile(source,body);await fs.writeFile(preserved,body);
 t.after(async()=>{
  if(path.dirname(root)!==parent||await fs.realpath(root)!==root)throw Error('Fixture cleanup escaped its owned directory');
  const encoded=Buffer.from(root).toString('base64');
  await promisify(execFile)('powershell.exe',['-NoProfile','-NonInteractive','-Command',`Remove-Item -LiteralPath ([Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('${encoded}'))) -Recurse -ErrorAction Stop`],{windowsHide:true});
 });
 return {source,preserved,directory,body,root};
}

test('removes the exact completed download while preserving identical bytes and other files',{skip:process.platform!=='win32'},async t=>{
 const f=await fixture(t),other=path.join(f.directory,'unrelated.json');await fs.writeFile(other,'user file');
 assert.equal((await removeVerifiedDownloadCopy(f.source,f.preserved,{directory:f.directory})).removed,true);
 await assert.rejects(fs.access(f.source),{code:'ENOENT'});
 assert.equal(await fs.readFile(f.preserved,'utf8'),f.body);assert.equal(await fs.readFile(other,'utf8'),'user file');
});
test('mismatched or missing preserved copies retain the downloaded file',{skip:process.platform!=='win32'},async t=>{
 const f=await fixture(t);await fs.writeFile(f.preserved,'different');
 await assert.rejects(removeVerifiedDownloadCopy(f.source,f.preserved,{directory:f.directory}),/differ/);
 await assert.rejects(removeVerifiedDownloadCopy(f.source,path.join(f.root,'missing.json'),{directory:f.directory}),{code:'ENOENT'});
 assert.equal(await fs.readFile(f.source,'utf8'),f.body);
});
test('same-file preservation, a copy inside Downloads and a source outside Downloads are rejected',{skip:process.platform!=='win32'},async t=>{
 const f=await fixture(t);
 for(const [source,preserved]of[[f.source,f.source],[f.source,path.join(f.directory,'other.json')],[f.preserved,f.source]])
  await assert.rejects(removeVerifiedDownloadCopy(source,preserved,{directory:f.directory}),/separate preserved copy/);
 assert.equal(await fs.readFile(f.source,'utf8'),f.body);
});
test('an already absent exact download is harmless after verifying the preserved copy',{skip:process.platform!=='win32'},async t=>{
 const f=await fixture(t);await removeVerifiedDownloadCopy(f.source,f.preserved,{directory:f.directory});
 assert.deepEqual(await removeVerifiedDownloadCopy(f.source,f.preserved,{directory:f.directory}),{removed:false,reason:'already_absent'});
});
