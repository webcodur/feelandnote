export interface SubtitleEntry {
  startSec: number
  endSec: number
  lines: string[]
  section: 'intro' | 'verse' | 'chorus'
}

export const subtitles: SubtitleEntry[] = [
  // === Intro ===
  { startSec: 0.319, endSec: 7.5, lines: ['험버리라 험버리라 험밤밤', '험버리라 험버리라 험밤밤'], section: 'intro' },
  { startSec: 7.8, endSec: 11.4, lines: ['험버리라 험버리라 람밤밤'], section: 'intro' },
  { startSec: 11.8, endSec: 15.0, lines: ['밤바리라라 람바리라라 라'], section: 'intro' },

  // === Verse 1 ===
  { startSec: 15.5, endSec: 22.52, lines: ['먼 바다 끝', '희미한 섬 하나'], section: 'verse' },
  { startSec: 23.22, endSec: 31.00, lines: ['바위 위에 새겨진 이름', '잊혀진 신들의 자리'], section: 'verse' },
  { startSec: 31.12, endSec: 38.5, lines: ['먼지 쌓인 검', '손길을 기다려'], section: 'verse' },
  { startSec: 39.0, endSec: 47.2, lines: ['조용한 제단 위에', '심장만 요동치네'], section: 'verse' },

  // === Chorus 1 ===
  { startSec: 49.5, endSec: 57.0, lines: ['올림포스가 나를 부른다', '번개처럼 숨을 가르네'], section: 'chorus' },
  { startSec: 57.2, endSec: 65, lines: ['두려움과 용기 그 사이', '지금 내 발걸음이 결정하리'], section: 'chorus' },
  { startSec: 65.119, endSec: 72.32, lines: ['올림포스가 나를 부른다', '운명이라 적힌 길 위에'], section: 'chorus' },
  { startSec: 72.62, endSec: 76.244, lines: ['넘어져도 다시 일어서리'], section: 'chorus' },
  { startSec: 76.444, endSec: 81.989, lines: ['이 이름으로'], section: 'chorus' },
  { startSec: 82.59, endSec: 85.56, lines: ['이 몸으로'], section: 'chorus' },

  // === Verse 2 ===
  { startSec: 88.72, endSec: 96.432, lines: ['황금계단', '끝없는 기둥들'], section: 'verse' },
  { startSec: 96.82, endSec: 104.59, lines: ['굳게 닫힌 거대한 문', '안쪽에서 울리는 함성'], section: 'verse' },
  { startSec: 104.80, endSec: 107.32, lines: ['내 안의 상처'], section: 'verse' },
  { startSec: 107.92, endSec: 111.88, lines: ['별자리처럼', '빛나'], section: 'verse' },
  { startSec: 112.46, endSec: 121.399, lines: ['검집에서 튀는 불꽃', '답을 알고 있는 듯해'], section: 'verse' },

  // === Chorus 2 ===
  { startSec: 121, endSec: 129.5, lines: ['올림포스가 나를 부른다', '번개처럼 숨을 가르네'], section: 'chorus' },
  { startSec: 129.7, endSec: 137.12, lines: ['두려움과 용기 그 사이', '지금 내 발걸음이 결정하리'], section: 'chorus' },
  { startSec: 137.12, endSec: 144.92, lines: ['올림포스가 나를 부른다', '운명이라 적힌 길 위에'], section: 'chorus' },
  { startSec: 144.92, endSec: 154.279, lines: ['넘어져도 다시 일어서리', '이 이름으로'], section: 'chorus' },
  { startSec: 154.279, endSec: 156.882, lines: ['이 몸으로'], section: 'chorus' },
]

export const SONG_DURATION_SEC = 162
