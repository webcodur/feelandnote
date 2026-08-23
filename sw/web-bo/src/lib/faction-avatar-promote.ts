/**
 * 팩션 개인샷 → 셀럽 얼굴 사진(아바타) 승격 — 서버 전용, 인증 밖.
 *
 * 서버 액션(`actions/admin/factions/avatar.ts`)은 사람 확인만 하고 이 함수를 부른다.
 * 액션 파일 안에 로직을 두면 Next 밖에서 부를 수 없어 검증이 불가능하다.
 *
 * ## 왜 함수를 옮겨오지 않고 기존 스크립트를 그대로 돌리나
 *
 * 얼굴 찾기·정사각 크롭·webp 변환·저장소 올리기·프로필 갱신 절차는 이미
 * `scripts/avatar/upload.ts` 의 `--image-file` 갈래가 전부 갖고 있다.
 * 그 스크립트는 **명령줄 전제**다 — 인자를 `process.argv` 로 읽고 실패에 `process.exit` 하며,
 * 불러오는 순간 `main()` 이 돌고, 설정값을 `process.env` 가 아니라 `.env` 파일에서 직접 읽는다.
 * 게다가 얼굴 찾기가 tfjs wasm 백엔드를 `node_modules` 경로로 직접 잡고
 * `createRequire` 로 face-api 의 node-wasm 빌드를 불러온다 — Next 번들러가 다룰 모양이 아니다.
 * 그래서 함수로 뜯어내지 않고 **자식 프로세스로 그대로 돌린다.**
 *
 * 자식 프로세스를 백그라운드 작업줄(`bo/task-queue`)에 태우지 않은 이유: 그 작업줄은 렌더 저장소에서
 * `pnpm` 을 돌리는 전제이고(cwd·명령 고정), 진행 로그를 화면이 따로 긁어가야 한다. 여기서 사람에게
 * 꼭 보여줘야 하는 것은 **실패 사유 원문**(특히 얼굴 미검출)이라, 끝날 때까지 기다렸다가 그대로
 * 돌려주는 편이 맞다. 한 장이라 20초 남짓이다.
 *
 * ⚠ 얼굴을 못 찾으면 `--require-face` 때문에 스크립트가 **올리기 전에** 실패한다. 대체 크롭으로
 *   조용히 올려 두면 사람은 성공으로 오해한다(전신·측면 사진이 많은 개인샷에서 실제로 벌어진다).
 *
 * 이 함수는 셀럽 본문(`celebs`)에 손대는 유일한 팩션 경로다. 문서 §4 「celebs 불가침」의 예외는
 * **사람이 버튼으로 명시 실행할 때만**이므로, 일괄 실행 경로는 두지 않았다(한 명씩만).
 */

import { spawn } from 'child_process'
import { existsSync } from 'fs'
import path from 'path'
import type { SupabaseClient } from '@supabase/supabase-js'
import { resolveImageRef } from './faction-sync/collect'

/** 명령이 이 시간을 넘기면 죽인다 — 얼굴 찾기 모델 적재까지 실측 20초 남짓이다 */
const TIMEOUT_MS = 180_000

export interface FactionAvatarPromoteResult {
  personId: string
  name: string
  celebId: string
  /** 재료로 쓴 개인샷 — 에피소드 폴더 기준 상대경로 */
  imageRel: string
  /** 갱신된 celebs.avatar_url */
  avatarUrl: string
  /** 갈아치운 것인지(원래 얼굴 사진이 있었다) */
  replaced: boolean
  /** 스크립트가 남긴 진행 기록 — 얼굴 점수·크롭 좌표가 여기 있다 */
  log: string[]
}

/** web-bo 저장소 뿌리 — 스크립트와 그 `.env`·`node_modules` 가 있는 곳 */
function webBoRoot(): string {
  return process.cwd()
}

/**
 * 자식 프로세스로 스크립트를 돌린다.
 *
 * 셸을 거치지 않는다 — 셸을 켜면 Node 가 인자를 따옴표 없이 이어 붙여, 공백·한글이 섞인 사진 경로가
 * 토막으로 쪼개진다. 그래서 `tsx` 의 `.cmd` 대신 그 실행 파일(js)을 node 로 직접 부른다
 * (Windows 의 `.cmd` 는 셸 없이 spawn 할 수 없다).
 */
async function runScript(args: string[]): Promise<{ code: number; log: string[] }> {
  const root = webBoRoot()
  const tsxCli = path.join(root, 'node_modules', 'tsx', 'dist', 'cli.mjs')
  if (!existsSync(tsxCli)) throw new Error(`tsx 실행 파일을 찾을 수 없습니다: ${tsxCli}`)

  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [tsxCli, ...args], { cwd: root })
    const log: string[] = []
    const push = (d: Buffer) => { log.push(...d.toString().split('\n').map(s => s.trimEnd()).filter(Boolean)) }
    // 멈춘 프로세스를 남기지 않는다 — 죽이면 close 가 뒤따라 오므로 그때 결과가 정리된다
    const timer = setTimeout(() => {
      log.push(`[중단] ${TIMEOUT_MS / 1000}초를 넘겨 강제 종료`)
      child.kill('SIGKILL')
    }, TIMEOUT_MS)
    child.stdout.on('data', push)
    child.stderr.on('data', push)
    child.on('error', (e) => { clearTimeout(timer); reject(e) })
    child.on('close', (code) => {
      clearTimeout(timer)
      resolve({ code: code ?? -1, log })
    })
  })
}

/** 로그 꼬리 몇 줄 — 실패 사유를 사람에게 그대로 보여줄 때 쓴다 */
function tail(log: string[], n = 12): string {
  return log.slice(-n).join('\n')
}

/** 묶음 → 세력 → 에피소드를 거슬러 올라가 폴더명이 맞는지 확인한다 */
async function assertPersonBelongs(db: SupabaseClient, clusterId: string, folder: string): Promise<void> {
  const { data: cluster, error: cErr } = await db
    .from('faction_clusters').select('group_id').eq('id', clusterId).maybeSingle()
  if (cErr) throw new Error(`묶음 조회 실패: ${cErr.message}`)
  if (!cluster) throw new Error('인물이 속한 묶음을 찾을 수 없습니다')

  const { data: group, error: gErr } = await db
    .from('faction_groups').select('episode_id').eq('id', cluster.group_id as string).maybeSingle()
  if (gErr) throw new Error(`세력 조회 실패: ${gErr.message}`)
  if (!group) throw new Error('인물이 속한 세력을 찾을 수 없습니다')

  const { data: ep, error: eErr } = await db
    .from('faction_episodes').select('folder').eq('id', group.episode_id as string).maybeSingle()
  if (eErr) throw new Error(`에피소드 조회 실패: ${eErr.message}`)
  if (ep?.folder !== folder) throw new Error(`이 인물은 ${folder} 편의 인물이 아닙니다`)
}

/**
 * 한 인물의 개인샷을 그 셀럽의 얼굴 사진으로 승격한다.
 *
 * @param force 이미 얼굴 사진이 있어도 갈아치운다. 없으면 그 사실을 사유로 들고 거부한다.
 */
export async function promoteSoloShotToAvatar(
  db: SupabaseClient,
  { folder, personId, force = false }: { folder: string; personId: string; force?: boolean },
): Promise<FactionAvatarPromoteResult> {
  if (!folder) throw new Error('에피소드 폴더명이 필요합니다')
  if (!personId) throw new Error('인물을 지정해야 합니다')

  const { data: person, error: pErr } = await db
    .from('faction_people')
    .select('id, is_person, name, slug, celeb_id, image, cluster_id')
    .eq('id', personId).maybeSingle()
  if (pErr) throw new Error(`인물 조회 실패: ${pErr.message}`)
  if (!person) throw new Error(`인물을 찾을 수 없습니다: ${personId}`)
  if (person.is_person === false) throw new Error('서사 항목은 셀럽 얼굴 사진으로 승격할 수 없습니다')

  // 이 인물이 정말 그 편의 것인지 자리를 거슬러 확인한다 — 주소만 알면 불릴 수 있는 창구라
  // 「화면에서 눌렀으니 맞겠지」로 넘기지 않는다. 임베드 응답 모양에 기대지 않고 한 칸씩 올라간다.
  await assertPersonBelongs(db, person.cluster_id as string, folder)

  const name = (person.name as string) ?? ''
  const celebId = person.celeb_id as string | null
  if (!celebId) {
    throw new Error(`${name} — 셀럽이 이어지지 않아 얼굴 사진을 올릴 곳이 없습니다. 셀럽을 먼저 등록하세요.`)
  }

  const image = resolveImageRef(folder, person.image)
  if (!image) throw new Error(`${name} — 개인샷이 지정되지 않았습니다`)
  if (image.external) throw new Error(`${name} — 개인샷이 외부 주소입니다(${image.raw}). 로컬 파일만 승격할 수 있습니다.`)
  if (!existsSync(image.abs)) throw new Error(`${name} — 개인샷 파일이 없습니다: ${image.rel}`)

  const { data: profile, error: prErr } = await db
    .from('celebs').select('id, slug, avatar_url, celeb_tier').eq('id', celebId).maybeSingle()
  if (prErr) throw new Error(`셀럽 프로필 조회 실패: ${prErr.message}`)
  if (!profile) throw new Error(`${name} — 셀럽 프로필(${celebId})이 없습니다`)

  const had = !!(profile.avatar_url as string | null)?.trim()
  if (had && !force) {
    throw new Error(`${name} — 이미 얼굴 사진이 있습니다. 갈아치우려면 덮어쓰기를 켜고 다시 실행하세요.`)
  }
  if (profile.celeb_tier !== 'fiction') {
    throw new Error(
      `${name} — 실존 인물의 팩션 개인샷은 신원 근거 없이 셀럽 아바타로 자동 승격할 수 없습니다. `
      + '공식·기관·본인 페이지를 대조한 뒤 아바타 업로드 도구에 --identity-evidence를 명시해 수동 등록하세요.'
    )
  }

  const { code, log } = await runScript([
    path.join('scripts', 'upload-celeb-avatar.ts'),
    '--celeb-id', celebId,
    '--slug', (profile.slug as string) || (person.slug as string) || celebId,
    '--image-file', image.abs,
    '--source-note', `faction:${folder} 개인샷 (${image.rel})`,
    '--identity-evidence', `fiction:${folder}/${personId}`,
    '--face-detect', 'true',
    // 얼굴을 못 찾으면 대체 크롭으로 올리지 않고 실패시킨다 — 조용한 대체 금지
    '--require-face', 'true',
  ])
  if (code !== 0) throw new Error(`${name} — 얼굴 사진 만들기 실패\n${tail(log)}`)

  // 스크립트가 올리고 프로필까지 갱신한다 — 결과 주소는 DB 에서 다시 읽어 확인한다(로그 파싱보다 확실하다)
  const { data: after, error: aErr } = await db
    .from('celebs').select('avatar_url').eq('id', celebId).maybeSingle()
  if (aErr) throw new Error(`갱신 확인 실패: ${aErr.message}`)
  const avatarUrl = (after?.avatar_url as string | null)?.trim() ?? ''
  if (!avatarUrl) throw new Error(`${name} — 스크립트는 성공했다는데 프로필에 주소가 없습니다\n${tail(log)}`)

  return { personId, name, celebId, imageRel: image.rel, avatarUrl, replaced: had, log }
}
