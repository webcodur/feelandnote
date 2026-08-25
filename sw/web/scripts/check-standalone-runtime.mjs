import { existsSync, readdirSync, statSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const webRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const distDir = process.env.NEXT_DIST_DIR || '.next'
const runtimeModules = join(webRoot, distDir, 'standalone', 'sw', 'web', 'node_modules', '@img')
const sharpBinary = join(runtimeModules, 'sharp-linux-x64', 'lib', 'sharp-linux-x64.node')
const libvipsDir = join(runtimeModules, 'sharp-libvips-linux-x64', 'lib')

function assertMaterialFile(path, minimumBytes) {
  if (!existsSync(path) || !statSync(path).isFile() || statSync(path).size < minimumBytes) {
    throw new Error(`Oracle Linux runtime 파일이 standalone에 없습니다: ${path}`)
  }
}

assertMaterialFile(sharpBinary, 100_000)

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

console.log('[standalone-runtime] Oracle Linux sharp + libvips 포함 확인')
