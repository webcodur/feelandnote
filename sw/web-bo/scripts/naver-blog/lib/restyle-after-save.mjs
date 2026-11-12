// 평문 입력 도구(apply-editorial-changes·apply-review-gaps·apply-blurbs)는 단락을 서식 없이 넣는다.
// 저장이 끝난 글에 restyle-body를 이어 실행해 본문 서식과 bodyStyle 대장을 같은 작업 안에서 되돌린다.
// 호출하는 도구가 브라우저를 놓은 뒤 부른다. restyle-body는 자기 브라우저 잠금을 따로 잡는다.
import { spawnSync } from 'node:child_process';
import { releaseBrowserLock } from './browser.mjs';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const RESTYLE = path.join(import.meta.dirname, '..', 'restyle-body.mjs');

/** restyle-body 출력의 completed 이벤트로 글마다 재서식 완료를 확인한다. deferred는 정상 종료여도 실패다. */
export function restyleOutcome(stdout, logNos) {
  const events = stdout.split(/\r?\n/).flatMap(line => { try { return [JSON.parse(line)]; } catch { return []; } });
  const completed = new Set(events.filter(e => e.event === 'completed').map(e => String(e.logNo)));
  return { missing: logNos.map(String).filter(id => !completed.has(id)), deferred: events.filter(e => e.event === 'deferred') };
}

export function restyleAfterSave(logNos) {
  const ids = [...new Set(logNos.map(String))].filter(Boolean);
  if (!ids.length) return;
  const work = fs.mkdtempSync(path.join(os.tmpdir(), 'naver-restyle-after-save-'));
  console.log(JSON.stringify({ event: 'restyle-after-save', logNos: ids }));
  // 부른 도구가 쥔 브라우저 잠금이 남아 있으면 자식 restyle-body가 잠금에 막혀 바로 끝난다.
  releaseBrowserLock();
  const run = spawnSync(process.execPath, [RESTYLE, '--logs=' + ids.join(','), '--work=' + work, '--apply'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'], env: process.env });
  process.stdout.write(run.stdout ?? '');
  const { missing, deferred } = restyleOutcome(run.stdout ?? '', ids);
  if (run.status !== 0 || missing.length) {
    throw new Error(`저장 후 재서식 미완료: ${missing.join(',') || '종료 코드 ' + run.status}${deferred.length ? ' — ' + deferred.map(d => d.logNo + ': ' + d.error).join(' / ') : ''} (작업 폴더 ${work})`);
  }
  fs.rmSync(work, { recursive: true, force: true });
}
