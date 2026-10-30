import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';

const exec=promisify(execFile),digest=value=>createHash('sha256').update(value).digest('hex');
const powershell=code=>exec('powershell.exe',['-NoProfile','-NonInteractive','-Command',code],{windowsHide:true});
async function downloadsDirectory(){
 const {stdout}=await powershell("$folders=Get-ItemProperty -LiteralPath 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\User Shell Folders';[Environment]::ExpandEnvironmentVariables($folders.'{374DE290-123F-4565-9164-39C4925E467B}') | ConvertTo-Json -Compress");
 const directory=JSON.parse(stdout.trim());
 if(typeof directory!=='string'||!path.isAbsolute(directory))throw Error('Actual Downloads directory unavailable');
 return directory;
}

/** Remove only the exact completed browser download after a separate byte-identical copy exists. */
export async function removeVerifiedDownloadCopy(downloadPath,preservedPath,{directory}={}){
 if(typeof downloadPath!=='string'||!path.isAbsolute(downloadPath)||typeof preservedPath!=='string'||!path.isAbsolute(preservedPath))throw Error('Absolute download and preserved paths required');
 const root=path.resolve(directory??await downloadsDirectory()),source=path.resolve(downloadPath),preserved=path.resolve(preservedPath);
 if(source===preserved||path.dirname(source)!==root||path.dirname(preserved)===root)throw Error('Cleanup requires one exact Downloads file and a separate preserved copy');
 if((await fs.lstat(root)).isSymbolicLink()||await fs.realpath(root)!==root)throw Error('Downloads directory must not be a link');
 const saved=await fs.lstat(preserved);
 if(!saved.isFile()||saved.isSymbolicLink()||await fs.realpath(preserved)!==preserved)throw Error('Preserved copy must be a regular file without linked parents');
 let input;try{input=await fs.lstat(source)}catch(error){if(error.code==='ENOENT')return {removed:false,reason:'already_absent'};throw error}
 if(!input.isFile()||input.isSymbolicLink())throw Error('Download must be a regular file');
 const [raw,copy]=await Promise.all([fs.readFile(source),fs.readFile(preserved)]),sha256=digest(raw);
 if(!raw.length||raw.length!==copy.length||sha256!==digest(copy))throw Error('Download and preserved copy differ; nothing removed');
 const encoded=Buffer.from(source,'utf8').toString('base64');
 await powershell(`$target=[Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('${encoded}'));if((Get-Item -LiteralPath $target -ErrorAction Stop).Attributes -band [IO.FileAttributes]::ReparsePoint){throw 'Download became a link'};if((Get-FileHash -LiteralPath $target -Algorithm SHA256 -ErrorAction Stop).Hash -ne '${sha256}'){throw 'Download changed before cleanup'};Remove-Item -LiteralPath $target -ErrorAction Stop`);
 try{await fs.lstat(source);throw Error('Completed download still exists')}catch(error){if(error.code!=='ENOENT')throw error}
 return {removed:true,sha256,bytes:raw.length};
}
