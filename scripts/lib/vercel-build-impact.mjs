const ROOT_BUILD_FILES = new Set([
  '.npmrc',
  'package.json',
  'pnpm-lock.yaml',
  'pnpm-workspace.yaml',
  'pnpmfile.cjs',
])

const SHARED_BUILD_PREFIXES = [
  'packages/',
  'patches/',
]

const PROJECT_BUILD_PREFIXES = {
  web: [
    'sw/web/messages/',
    'sw/web/public/',
    'sw/web/src/',
    'sw/web/next.config.ts',
    'sw/web/package.json',
    'sw/web/postcss.config.mjs',
    'sw/web/tsconfig.json',
    'sw/web/vercel.json',
  ],
  'web-bo': [
    'sw/web-bo/public/',
    'sw/web-bo/src/',
    'sw/web-bo/next.config.ts',
    'sw/web-bo/package.json',
    'sw/web-bo/pnpm-lock.yaml',
    'sw/web-bo/postcss.config.mjs',
    'sw/web-bo/tsconfig.json',
    'sw/web-bo/vercel.json',
    'sw/remotion/src/',
    'sw/remotion/package.json',
    'sw/remotion/tsconfig.json',
  ],
}

function normalizeGitPath(file) {
  return file.trim().replaceAll('\\', '/').replace(/^\.\//, '')
}

export function shouldBuildVercelProject(project, changedFiles) {
  const projectPrefixes = PROJECT_BUILD_PREFIXES[project]
  if (!projectPrefixes) {
    throw new Error(`Unknown Vercel project: ${project}`)
  }

  return changedFiles.some((rawFile) => {
    const file = normalizeGitPath(rawFile)
    if (!file) return false
    if (ROOT_BUILD_FILES.has(file)) return true
    if (SHARED_BUILD_PREFIXES.some((prefix) => file.startsWith(prefix))) return true
    return projectPrefixes.some((prefix) => (
      prefix.endsWith('/') ? file.startsWith(prefix) : file === prefix
    ))
  })
}
