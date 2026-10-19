import { existsSync, readdirSync, statSync, realpathSync, readFileSync } from 'node:fs'
import { dirname, join, resolve, relative, isAbsolute } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'

const webRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const repoRoot = resolve(webRoot, '../..')
const distDir = process.env.NEXT_DIST_DIR || '.next'
const standaloneRoot = join(webRoot, distDir, 'standalone')
const runtimeModules = join(webRoot, distDir, 'standalone', 'sw', 'web', 'node_modules', '@img')
const sharpDir = join(runtimeModules, 'sharp-linux-x64', 'lib')
const sharpBinary = existsSync(sharpDir) ? readdirSync(sharpDir)
  .filter(name => /^sharp-linux-x64(?:-[\d.]+)?\.node$/.test(name))
  .map(name => join(sharpDir, name)).find(file => statSync(file).isFile()) : undefined
const libvipsDir = join(runtimeModules, 'sharp-libvips-linux-x64', 'lib')

function assertMaterialFile(path, minimumBytes) {
  if (!existsSync(path) || !statSync(path).isFile() || statSync(path).size < minimumBytes) {
    throw new Error(`Oracle Linux runtime 파일이 standalone에 없습니다: ${path}`)
  }
}

if (!sharpBinary) throw new Error(`Oracle Linux sharp가 standalone에 없습니다: ${sharpDir}`)
assertMaterialFile(sharpBinary, 100_000)
assertMaterialFile(join(webRoot, distDir, 'standalone', 'sw', 'web', 'scripts', 'shared-data-cache.cjs'), 100)

const libvipsBinary = existsSync(libvipsDir)
  ? readdirSync(libvipsDir)
      .filter((name) => name.startsWith('libvips-cpp.so.'))
      .map((name) => join(libvipsDir, name))
      .find((path) => statSync(path).isFile())
  : undefined

if (!libvipsBinary) {
  throw new Error(`Oracle Linux libvips가 standalone에 없습니다: ${libvipsDir}`)
}
assertMaterialFile(libvipsBinary, 1_000_000)

// 디스크에 패키지가 있다는 것만으로는 조건부 export 누락을 잡지 못한다.
const standaloneRequire = createRequire(join(webRoot, distDir, 'standalone', 'sw', 'web', 'package.json'))
const flagsRoot = dirname(realpathSync(standaloneRequire.resolve('country-flag-icons/package.json')))
const flagsOutput = relative(standaloneRoot, flagsRoot).startsWith('..')
  ? join(standaloneRoot, relative(repoRoot, flagsRoot)) : flagsRoot
const flagFiles = readdirSync(join(flagsOutput, '3x2')).filter(name => name.endsWith('.svg'))
if (flagFiles.length < 200) throw new Error('Standalone 국기 SVG 파일이 빠졌습니다')
for (const file of flagFiles) assertMaterialFile(join(flagsOutput, '3x2', file), 20)
// sharp 0.35는 네이티브 .node 앞에 index.cjs를 사용한다. 바이너리 존재만
// 확인하지 않고 sharp가 실제로 쓰는 의존성 경로와 export 진입점도 검사한다.
const sharpRequire = createRequire(standaloneRequire.resolve('sharp'))
for (const specifier of ['@img/sharp-linux-x64/sharp.node', '@img/sharp-libvips-linux-x64/binary']) {
  const resolved = realpathSync(sharpRequire.resolve(specifier))
  const fromOutput = relative(standaloneRoot, resolved)
  const fromRepo = relative(repoRoot, resolved)
  const inside = value => value !== '..' && !value.startsWith('..\\') && !value.startsWith('../') && !isAbsolute(value)
  if (!inside(fromRepo)) throw new Error(`sharp 의존성이 저장소 밖에서 로딩됐습니다: ${resolved}`)
  const material = inside(fromOutput) ? resolved : join(standaloneRoot, fromRepo)
  assertMaterialFile(material, 1)
}
standaloneRequire('@aws-sdk/client-s3')
// Windows junction이 원본 node_modules로 이어져 있어도, 실제 수신 파일 전부가 배포본 안에 있어야 한다.
const loaded = [standaloneRequire.cache[standaloneRequire.resolve('@aws-sdk/client-s3')]]
const seen = new Set()
while (loaded.length) {
  const loadedModule = loaded.pop()
  if (!loadedModule || seen.has(loadedModule.filename)) continue
  seen.add(loadedModule.filename)
  const file = realpathSync(loadedModule.filename)
  const inOutput = relative(standaloneRoot, file)
  const inRepo = relative(repoRoot, file)
  const inside = value => value !== '..' && !value.startsWith('..\\') && !value.startsWith('../') && !isAbsolute(value)
  if (!inside(inRepo)) throw new Error(`S3 의존성이 저장소 밖에서 로딩됐습니다: ${file}`)
  const material = inside(inOutput) ? file : join(standaloneRoot, inRepo)
  assertMaterialFile(material, 1)
  if (!inside(relative(standaloneRoot, realpathSync(material)))) throw new Error(`S3 의존성이 배포본 밖을 가리킵니다: ${material}`)
  loaded.push(...loadedModule.children)
}
const nextRoot = dirname(standaloneRequire.resolve('next/package.json'))
const actionHandler = readFileSync(join(nextRoot, 'dist/server/app-render/action-handler.js'), 'utf8')
if (!/actionId\s*&&\s*!actionWasForwarded/.test(actionHandler)) {
  throw new Error('Standalone Next.js에 Server Action 재전달 방지가 없습니다')
}

console.log('[standalone-runtime] Linux sharp + libvips + data cache + S3 SDK + Action 재전달 방지 확인')
