export interface SubtitleEntry {
  startSec: number
  endSec: number
  lines: string[]
  /** intro=챈트, verse=절, chorus=후렴, marker=섹션표시(비표시) */
  section: 'intro' | 'verse' | 'chorus' | 'marker'
}

export const subtitles: SubtitleEntry[] = [
  // === Intro (0:00 – 0:16) ===
  { startSec: 0.7, endSec: 7.933, lines: ['험버리라 험버리라 험밤밤', '험버리라 험버리라 험밤밤'], section: 'intro' },
  { startSec: 8.5, endSec: 11.766, lines: ['험버리라 험버리라 험밤밤'], section: 'intro' },
  { startSec: 12.3, endSec: 15.3, lines: ['밤바리라라 람바리라라 라'], section: 'intro' },

  // === Verse 1 (0:16 – 0:49) ===
  { startSec: 16.166, endSec: 23.433, lines: ['먼 바다 끝', '희미한 섬 하나'], section: 'verse' },
  { startSec: 23.9, endSec: 30.7, lines: ['바위 위에 새겨진 이름', '잊혀진 신들의 자리'], section: 'verse' },
  { startSec: 31.7, endSec: 38.433, lines: ['먼지 쌓인 검', '손길을 기다려'], section: 'verse' },
  { startSec: 39.366, endSec: 49.166, lines: ['조용한 제단 위에', '심장만 요동치네'], section: 'verse' },

  // === Chorus 1 (0:49 – 1:26) ===
  { startSec: 49.933, endSec: 57.233, lines: ['올림포스가 나를 부른다', '번개처럼 숨을 가르네'], section: 'chorus' },
  { startSec: 57.733, endSec: 65.033, lines: ['두려움과 용기 그 사이', '지금 내 발걸음이 결정하리'], section: 'chorus' },
  { startSec: 65.5, endSec: 72.7, lines: ['올림포스가 나를 부른다', '운명이라 적힌 길 위에'], section: 'chorus' },
  { startSec: 73.3, endSec: 76.8, lines: ['넘어져도 다시 일어서리'], section: 'chorus' },
  { startSec: 76.8, endSec: 82.866, lines: ['이 이름으로'], section: 'chorus' },
  { startSec: 82.866, endSec: 85.533, lines: ['이 몸으로'], section: 'chorus' },

  // === Verse 2 (1:29 – 2:01) ===
  { startSec: 89.7, endSec: 91.666, lines: ['황금계단'], section: 'verse' },
  { startSec: 93, endSec: 96.366, lines: ['끝없는 기둥들'], section: 'verse' },
  { startSec: 97.4, endSec: 100.3, lines: ['굳게 닫힌 거대한 문'], section: 'verse' },
  { startSec: 100.3, endSec: 105.066, lines: ['안쪽에서 울리는 함성'], section: 'verse' },
  { startSec: 105.066, endSec: 108.5, lines: ['내 안의 상처'], section: 'verse' },
  { startSec: 108.5, endSec: 111.933, lines: ['별자리처럼', '빛나'], section: 'verse' },
  { startSec: 112.933, endSec: 120.733, lines: ['검집에서 튀는 불꽃', '답을 알고 있는 듯해'], section: 'verse' },

  // === Chorus 2 (2:01 – 2:39) ===
  { startSec: 121.6, endSec: 129.366, lines: ['올림포스가 나를 부른다', '번개처럼 숨을 가르네'], section: 'chorus' },
  { startSec: 129.366, endSec: 137.066, lines: ['두려움과 용기 그 사이', '지금 내 발걸음이 결정하리'], section: 'chorus' },
  { startSec: 137.066, endSec: 144.9, lines: ['올림포스가 나를 부른다', '운명이라 적힌 길 위에'], section: 'chorus' },
  { startSec: 144.9, endSec: 154.233, lines: ['넘어져도 다시 일어서리', '이 이름으로'], section: 'chorus' },
  { startSec: 154.233, endSec: 159.366, lines: ['이 몸으로'], section: 'chorus' },
]

/** 곡 전체 길이 (초) */
export const SONG_DURATION_SEC = 162
