// 룰북 argon 구획을 localStorage rwBookA로 심는 init-A.js를 만든다. 룰북을 고치면 다시 실행하고 탭마다 init-A.js를 실행한다.
import { R, W } from './paths.mjs'
import fs from 'node:fs'
import { pathToFileURL } from 'node:url'
const m = await import(pathToFileURL(R + '/scripts/browser/reading-way-argon.mjs').href)
const A = m.argonSections(fs.readFileSync(R + '/docs/project/celeb/celeb-05-02-reading-way.md', 'utf8'), 'celeb-05-02-reading-way.md')
fs.writeFileSync(`${W}/scoped/init-A.js`, `localStorage.setItem('rwBookA',${JSON.stringify(A)});localStorage.getItem('rwBookA').length`, 'utf8')
console.log('A', A.length, /서너 군데/.test(A), /채울 목표가 아니다/.test(A), (A.match(/\r\n/g)||[]).length, (A.match(/(?<!\r)\n/g)||[]).length)
