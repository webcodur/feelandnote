import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

import {
  shouldBuildVercelProject,
  VERCEL_BUILD_DIFF_FILTER,
} from './lib/vercel-build-impact.mjs'

const project = process.argv[2]
const scriptDirectory = path.dirname(fileURLToPath(import.meta.url))
const repositoryRoot = path.resolve(scriptDirectory, '..')
const previousSha = process.env.VERCEL_GIT_PREVIOUS_SHA?.trim()
const currentSha = process.env.VERCEL_GIT_COMMIT_SHA?.trim() || 'HEAD'

if (!project) {
  console.error('[vercel-ignore] Project name is required; continuing the build safely.')
  process.exit(1)
}

try {
  shouldBuildVercelProject(project, [])
} catch (error) {
  console.error(`[vercel-ignore] ${error.message}; continuing the build safely.`)
  process.exit(1)
}

if (!previousSha) {
  console.log('[vercel-ignore] No previous successful deployment SHA; continuing the build.')
  process.exit(1)
}

const diff = spawnSync(
  'git',
  [
    'diff',
    '--name-only',
    '--no-renames',
    `--diff-filter=${VERCEL_BUILD_DIFF_FILTER}`,
    previousSha,
    currentSha,
    '--',
  ],
  {
    cwd: repositoryRoot,
    encoding: 'utf8',
    windowsHide: true,
  },
)

if (diff.status !== 0) {
  const message = diff.stderr.trim() || `git diff exited with ${diff.status}`
  console.error(`[vercel-ignore] Could not inspect Git changes: ${message}`)
  console.error('[vercel-ignore] Continuing the build safely.')
  process.exit(1)
}

const changedFiles = diff.stdout
  .split(/\r?\n/u)
  .map((file) => file.trim())
  .filter(Boolean)

const shouldBuild = shouldBuildVercelProject(project, changedFiles)
const preview = changedFiles.slice(0, 12).join(', ')
const remainder = Math.max(0, changedFiles.length - 12)
const summary = preview
  ? `${preview}${remainder ? ` (+${remainder} more)` : ''}`
  : '(no file changes)'

if (shouldBuild) {
  console.log(`[vercel-ignore] ${project}: relevant changes found; continuing build.`)
  console.log(`[vercel-ignore] Changed files: ${summary}`)
  process.exit(1)
}

console.log(`[vercel-ignore] ${project}: no relevant changes; skipping build.`)
console.log(`[vercel-ignore] Changed files: ${summary}`)
process.exit(0)
