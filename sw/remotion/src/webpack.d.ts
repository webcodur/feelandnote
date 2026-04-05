interface WebpackRequireContext {
  keys(): string[]
  <T = unknown>(key: string): T
}

interface WebpackRequire {
  context(dir: string, deep?: boolean, filter?: RegExp): WebpackRequireContext
  <T = unknown>(id: string): T
}

declare const require: WebpackRequire
