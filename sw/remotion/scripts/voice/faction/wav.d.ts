/**
 * 'wav' 패키지 타입 선언 (최소) — @types/wav 부재 보완.
 * BookRecommend engines.ts 도 같은 implicit-any 를 안고 있으나 tsx 실행 경로라 표면화되지 않는다.
 * Faction 음성 파이프라인은 전용 tsconfig 로 타입검증하므로 이 shim 으로 FileWriter 시그니처만 채운다.
 */
declare module 'wav' {
  import { Writable } from 'stream'
  export class FileWriter extends Writable {
    constructor(path: string, opts?: { channels?: number; sampleRate?: number; bitDepth?: number })
  }
}
