/**
 * Generate the approved mythology avatar portraits through Codex image_gen.
 *
 * Each character is one isolated Codex session. Results are recovered from
 * ~/.codex/generated_images/<thread-id>/ and copied into the stable output
 * folder. Existing, valid slug.png files are skipped, so reruns are safe.
 *
 * Examples:
 *   node scripts/photo/generate-myth-portrait-images-codex.mjs --dry-run
 *   node scripts/photo/generate-myth-portrait-images-codex.mjs --slugs argus,guinevere,khnum
 *   node scripts/photo/generate-myth-portrait-images-codex.mjs --concurrency 3
 */

import crypto from 'node:crypto'
import { spawn, spawnSync, execFileSync } from 'node:child_process'
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import sharp from 'sharp'

const DEFAULT_PROMPTS = 'D:\\remotion-assets\\celeb-mythology-face-candidates\\개인초상화-프롬프트\\portrait-prompts.json'
const DEFAULT_OUTPUT = 'D:\\remotion-assets\\celeb-mythology-face-candidates\\개인초상화-생성본\\전체-v2'
const WORKSPACE = 'C:\\project\\feelandnote'
const MODEL = 'gpt-5.6-sol'
const MAX_CONCURRENCY = 3
const MIN_SIDE = 1000
const ATTEMPT_TIMEOUT_MS = 12 * 60 * 1000

function parseArgs(argv) {
  const args = {
    prompts: DEFAULT_PROMPTS,
    output: DEFAULT_OUTPUT,
    concurrency: MAX_CONCURRENCY,
    retries: 1,
    limit: null,
    slugs: null,
    dryRun: false,
  }
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    if (arg === '--prompts') args.prompts = path.resolve(argv[++index])
    else if (arg === '--output') args.output = path.resolve(argv[++index])
    else if (arg === '--concurrency') args.concurrency = Number(argv[++index])
    else if (arg === '--retries') args.retries = Number(argv[++index])
    else if (arg === '--limit') args.limit = Number(argv[++index])
    else if (arg === '--slugs') args.slugs = new Set(argv[++index].split(',').map((value) => value.trim()).filter(Boolean))
    else if (arg === '--dry-run') args.dryRun = true
    else throw new Error(`Unknown argument: ${arg}`)
  }
  if (!Number.isInteger(args.concurrency) || args.concurrency < 1 || args.concurrency > MAX_CONCURRENCY) {
    throw new Error(`--concurrency must be an integer from 1 to ${MAX_CONCURRENCY}`)
  }
  if (!Number.isInteger(args.retries) || args.retries < 0 || args.retries > 2) {
    throw new Error('--retries must be an integer from 0 to 2')
  }
  if (args.limit !== null && (!Number.isInteger(args.limit) || args.limit < 1)) {
    throw new Error('--limit must be a positive integer')
  }
  return args
}

function findCodex() {
  const where = process.platform === 'win32' ? ['where.exe', ['codex']] : ['which', ['codex']]
  const output = execFileSync(where[0], where[1], { encoding: 'utf8', windowsHide: true })
  const matches = output.split(/\r?\n/).map((value) => value.trim()).filter(Boolean)
  const launcher = matches.find((value) => value.toLowerCase().endsWith('.cmd')) ?? matches[0]
  if (process.platform !== 'win32') return { bin: launcher, prefix: [] }
  const cliEntry = path.join(path.dirname(launcher), 'node_modules', '@openai', 'codex', 'bin', 'codex.js')
  if (!existsSync(cliEntry)) throw new Error(`Codex CLI entry point not found: ${cliEntry}`)
  return { bin: process.execPath, prefix: [cliEntry] }
}

function atomicJson(file, value) {
  const temp = `${file}.tmp`
  writeFileSync(temp, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
  copyFileSync(temp, file)
}

function sha256(file) {
  return crypto.createHash('sha256').update(readFileSync(file)).digest('hex')
}

async function imageFingerprint(file) {
  return sharp(file).rotate().resize(64, 64, { fit: 'fill' }).grayscale().raw().toBuffer()
}

async function meanPixelDifference(leftFile, rightFile) {
  const [left, right] = await Promise.all([imageFingerprint(leftFile), imageFingerprint(rightFile)])
  let total = 0
  for (let index = 0; index < left.length; index += 1) total += Math.abs(left[index] - right[index])
  return total / (left.length * 255)
}

async function inspectImage(file, referenceImage = null) {
  const metadata = await sharp(file).metadata()
  if (!metadata.width || !metadata.height) throw new Error('Unreadable generated image geometry')
  if (metadata.width !== metadata.height) throw new Error(`Generated image is not square: ${metadata.width}x${metadata.height}`)
  if (Math.min(metadata.width, metadata.height) < MIN_SIDE) {
    throw new Error(`Generated image is too small: ${metadata.width}x${metadata.height}`)
  }
  let referenceDifference = null
  if (referenceImage && existsSync(referenceImage)) {
    referenceDifference = await meanPixelDifference(file, referenceImage)
    if (referenceDifference < 0.01) {
      throw new Error(`Generated image appears to echo the reference: diff=${referenceDifference.toFixed(5)}`)
    }
  }
  return {
    width: metadata.width,
    height: metadata.height,
    format: metadata.format,
    bytes: statSync(file).size,
    sha256: sha256(file),
    reference_difference: referenceDifference === null ? null : Number(referenceDifference.toFixed(5)),
  }
}

function parseThreadId(stdout) {
  for (const line of stdout.split(/\r?\n/)) {
    if (!line.trim().startsWith('{')) continue
    try {
      const event = JSON.parse(line)
      if (event.type === 'thread.started' && event.thread_id) return event.thread_id
    } catch {
      // Codex may write non-JSON progress around its JSONL stream.
    }
  }
  return null
}

function generatedCandidates(threadId, startedAt) {
  if (!threadId) return []
  const dir = path.join(os.homedir(), '.codex', 'generated_images', threadId)
  if (!existsSync(dir)) return []
  return readdirSync(dir)
    .filter((name) => /\.(png|jpe?g|webp)$/i.test(name))
    .map((name) => path.join(dir, name))
    .filter((file) => statSync(file).mtimeMs >= startedAt - 5000)
    .sort((left, right) => statSync(right).mtimeMs - statSync(left).mtimeMs)
}

async function recoverPriorGenerated(row, workDir, finalFile) {
  const rowDir = path.join(workDir, row.slug)
  if (!existsSync(rowDir)) return null
  const attempts = readdirSync(rowDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(rowDir, entry.name))
    .sort((left, right) => statSync(right).mtimeMs - statSync(left).mtimeMs)
  for (const attemptDir of attempts) {
    const eventFile = path.join(attemptDir, 'events.jsonl')
    if (!existsSync(eventFile)) continue
    const threadId = parseThreadId(readFileSync(eventFile, 'utf8'))
    const candidates = generatedCandidates(threadId, 0)
    if (!candidates.length) continue
    try {
      const details = await inspectImage(candidates[0], row.reference_image)
      copyFileSync(candidates[0], finalFile)
      return {
        slug: row.slug,
        name_ko: row.name_ko,
        tradition: row.tradition,
        status: 'recovered_generated',
        file: finalFile,
        source_file: candidates[0],
        thread_id: threadId,
        ...details,
      }
    } catch {
      // Try an older completed attempt if this output is invalid.
    }
  }
  return null
}

function runCodex({ codex, prompt, referenceImages, outFile, eventFile }) {
  const args = [
    ...codex.prefix,
    'exec',
    '-',
    '-m', MODEL,
    '-c', 'model_reasoning_effort="low"',
    '-s', 'read-only',
    '--skip-git-repo-check',
    '--json',
    '--output-last-message', outFile,
    '--color', 'never',
    '-C', WORKSPACE,
  ]
  for (const referenceImage of referenceImages) args.push('-i', referenceImage)

  return new Promise((resolve, reject) => {
    const child = spawn(codex.bin, args, {
      cwd: WORKSPACE,
      shell: false,
      windowsHide: true,
      detached: process.platform !== 'win32',
    })
    let stdout = ''
    let stderr = ''
    let settled = false
    const timer = setTimeout(() => {
      if (process.platform === 'win32' && child.pid) {
        spawnSync('taskkill.exe', ['/PID', String(child.pid), '/T', '/F'], { windowsHide: true, stdio: 'ignore' })
      } else if (child.pid) {
        try { process.kill(-child.pid, 'SIGKILL') } catch { child.kill('SIGKILL') }
      }
      if (!settled) {
        settled = true
        reject(new Error(`Codex timed out after ${ATTEMPT_TIMEOUT_MS / 60000} minutes`))
      }
    }, ATTEMPT_TIMEOUT_MS)
    child.stdout.on('data', (chunk) => { stdout += chunk.toString() })
    child.stderr.on('data', (chunk) => { stderr += chunk.toString() })
    child.on('error', (error) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      reject(error)
    })
    child.on('close', (code) => {
      writeFileSync(eventFile, `${stdout}\n--- STDERR ---\n${stderr}`, 'utf8')
      if (settled) return
      settled = true
      clearTimeout(timer)
      if (code === 0) resolve({ stdout, stderr })
      else reject(new Error(`Codex exited ${code}: ${stderr.slice(-2000) || stdout.slice(-2000)}`))
    })
    child.stdin.write(prompt)
    child.stdin.end()
  })
}

function invocationPrompt(row, taskId) {
  const hasFaceReference = Boolean(row.reference_image)
  const hasIconographyReference = Boolean(row.iconography_reference_image)
  const referenceDirections = hasFaceReference && hasIconographyReference
    ? [
      'Two images are attached in this exact order:',
      'IMAGE 1 — FACIAL IDENTITY ONLY. Preserve its facial structure, identity, apparent age, and ethnicity; do not copy its clothing, scalp or facial hair, eyewear, jewelry, headwear, crop, pose, or background.',
      'IMAGE 2 — INDIVIDUAL MYTH ICONOGRAPHY. Use its premodern hair silhouette, garment or armor silhouette, exposed-versus-covered balance, palette, and canonical divine markers. Do not copy its face, narrative composition, props, text, watermark, or background.',
    ]
    : hasFaceReference
      ? [
        'One image is attached as FACIAL IDENTITY ONLY. Preserve its facial structure, identity, apparent age, and ethnicity; do not copy its clothing, scalp or facial hair, eyewear, jewelry, headwear, crop, pose, or background.',
      ]
      : hasIconographyReference
        ? [
          'One image is attached as INDIVIDUAL MYTH ICONOGRAPHY ONLY. Use its premodern hair silhouette, garment or armor silhouette, exposed-versus-covered balance, palette, and canonical divine markers. Do not copy its face, narrative composition, props, text, watermark, or background.',
          'No facial identity model is approved. Create a new original face from the character specification.',
        ]
        : [
          'No reference image is attached and no facial identity model is approved.',
          'Create a new original face from the character specification. Do not imitate a recognizable real person, actor, celebrity or generic modern fashion model.',
        ]
  const priorImageNoun = hasFaceReference || hasIconographyReference ? 'the attachment' : 'a prior image'
  return [
    `TASK-ID: ${taskId}`,
    'Generate exactly one new image with the image_gen tool from the complete specification below.',
    ...referenceDirections,
    `Create a new photorealistic portrait; do not return or merely resize ${priorImageNoun}.`,
    'Return the generated image. Do not run any shell command.',
    '',
    row.prompt,
  ].join('\n')
}

async function generateOne(row, context) {
  const finalFile = path.join(context.outputDir, `${row.slug}.png`)
  if (existsSync(finalFile)) {
    const details = await inspectImage(finalFile, row.reference_image)
    return { slug: row.slug, status: 'skipped_existing', file: finalFile, ...details }
  }

  const recovered = await recoverPriorGenerated(row, context.workDir, finalFile)
  if (recovered) return recovered

  let lastError = null
  for (let attempt = 1; attempt <= context.retries + 1; attempt += 1) {
    const taskId = `MYTH-PORTRAIT-${row.slug}-${Date.now()}-A${attempt}`
    const attemptDir = path.join(context.workDir, row.slug, `attempt-${attempt}-${Date.now()}`)
    mkdirSync(attemptDir, { recursive: true })
    const outFile = path.join(attemptDir, 'last-message.txt')
    const eventFile = path.join(attemptDir, 'events.jsonl')
    const promptFile = path.join(attemptDir, 'prompt.txt')
    const prompt = invocationPrompt(row, taskId)
    writeFileSync(promptFile, prompt, 'utf8')
    writeFileSync(outFile, '', 'utf8')
    const startedAt = Date.now()
    try {
      const result = await runCodex({
        codex: context.codex,
        prompt,
        referenceImages: [row.reference_image, row.iconography_reference_image].filter(Boolean),
        outFile,
        eventFile,
      })
      const threadId = parseThreadId(result.stdout)
      if (!threadId) throw new Error('Codex JSON stream did not expose a thread id')
      const message = readFileSync(outFile, 'utf8').trim()
      const candidates = generatedCandidates(threadId, startedAt)
      if (!candidates.length) throw new Error(`No generated image found for thread ${threadId}`)
      const sourceFile = candidates[0]
      const details = await inspectImage(sourceFile, row.reference_image)
      copyFileSync(sourceFile, finalFile)
      return {
        slug: row.slug,
        name_ko: row.name_ko,
        tradition: row.tradition,
        status: 'generated',
        file: finalFile,
        source_file: sourceFile,
        thread_id: threadId,
        task_id: taskId,
        attempt,
        final_message_present: Boolean(message),
        ...details,
      }
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error)
      writeFileSync(path.join(attemptDir, 'error.txt'), `${lastError}\n`, 'utf8')
    }
  }
  return {
    slug: row.slug,
    name_ko: row.name_ko,
    tradition: row.tradition,
    status: 'failed',
    error: lastError,
  }
}

async function runPool(rows, concurrency, worker) {
  const results = new Array(rows.length)
  let cursor = 0
  await Promise.all(Array.from({ length: Math.min(concurrency, rows.length) }, async () => {
    while (true) {
      const index = cursor++
      if (index >= rows.length) return
      results[index] = await worker(rows[index], index)
    }
  }))
  return results
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  if (!existsSync(args.prompts)) throw new Error(`Prompt file not found: ${args.prompts}`)
  const document = JSON.parse(readFileSync(args.prompts, 'utf8'))
  if (!Array.isArray(document.prompts)) throw new Error('Prompt JSON does not contain prompts[]')

  mkdirSync(args.output, { recursive: true })
  const workDir = path.join(args.output, '_work')
  mkdirSync(workDir, { recursive: true })
  const statusFile = path.join(args.output, 'generation-status.json')
  const previous = existsSync(statusFile) ? JSON.parse(readFileSync(statusFile, 'utf8')) : { items: {} }

  let rows = document.prompts
  if (args.slugs) rows = rows.filter((row) => args.slugs.has(row.slug))
  if (args.limit !== null) rows = rows.slice(0, args.limit)

  const missingReferences = rows.filter((row) => (
    (row.reference_image && !existsSync(row.reference_image))
    || (row.iconography_reference_image && !existsSync(row.iconography_reference_image))
  ))
  if (missingReferences.length) {
    throw new Error(`Missing reference images: ${missingReferences.map((row) => row.slug).join(', ')}`)
  }

  const alreadyValid = []
  const pending = []
  for (const row of rows) {
    const file = path.join(args.output, `${row.slug}.png`)
    try {
      if (existsSync(file)) {
        await inspectImage(file, row.reference_image)
        alreadyValid.push(row)
      } else pending.push(row)
    } catch {
      pending.push(row)
    }
  }

  console.log(JSON.stringify({
    model: MODEL,
    prompt_count: document.prompts.length,
    selected_count: rows.length,
    already_valid: alreadyValid.length,
    pending: pending.length,
    concurrency: args.concurrency,
    output: args.output,
    dry_run: args.dryRun,
  }, null, 2))
  if (args.dryRun) return

  const codex = findCodex()
  let completedThisRun = 0
  let failedThisRun = 0
  const results = await runPool(rows, args.concurrency, async (row) => {
    const result = await generateOne(row, {
      outputDir: args.output,
      workDir,
      retries: args.retries,
      codex,
    })
    previous.items[row.slug] = result
    previous.updated_at = new Date().toISOString()
    previous.model = MODEL
    previous.prompt_file = args.prompts
    previous.output_directory = args.output
    atomicJson(statusFile, previous)
    if (result.status === 'failed') failedThisRun += 1
    else completedThisRun += 1
    console.log(`PROGRESS ${completedThisRun + failedThisRun}/${rows.length} ok=${completedThisRun} failed=${failedThisRun} slug=${row.slug} status=${result.status}`)
    if (result.error) console.log(`ERROR ${row.slug}: ${result.error}`)
    return result
  })

  const generated = results.filter((result) => result.status === 'generated').length
  const skipped = results.filter((result) => result.status === 'skipped_existing').length
  const failed = results.filter((result) => result.status === 'failed')
  console.log(JSON.stringify({
    selected: results.length,
    generated,
    skipped,
    failed: failed.length,
    failed_slugs: failed.map((result) => result.slug),
    output: args.output,
    status_file: statusFile,
  }, null, 2))
  if (failed.length) process.exitCode = 2
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
