import assert from 'node:assert/strict'
import test from 'node:test'
import {
  parseInactiveSeedManifest,
  reserveGeneratedSlug,
} from './seed-inactive-contract'

test('최소 선등록 명세를 정리하고 실존 축을 FICTION으로 채운다', () => {
  assert.deepEqual(parseInactiveSeedManifest({
    tag_slug: 'myth-korea',
    people: [{
      nickname: '  바리공주 ',
      nickname_en: ' Princess Bari ',
      bio: '한국 무속 신화에서 저승을 다녀와 부모를 살리는 인간 영웅.',
      identity: { mode: 'new' },
    }],
  }), {
    tag_slug: 'myth-korea',
    people: [{
      nickname: '바리공주',
      nickname_en: 'Princess Bari',
      bio: '한국 무속 신화에서 저승을 다녀와 부모를 살리는 인간 영웅.',
      celeb_reality: 'FICTION',
      identity: { mode: 'new' },
    }],
  })
})

test('건국 시조처럼 실존과 전승이 함께 다뤄지는 인물은 BOTH로 싣는다', () => {
  const manifest = parseInactiveSeedManifest({
    tag_slug: 'myth-korea',
    people: [{
      nickname: '박혁거세',
      nickname_en: 'Bak Hyeokgeose',
      bio: '나정 우물가의 붉은 알에서 나와 서라벌을 연 신라의 첫 임금.',
      celeb_reality: 'BOTH',
      identity: { mode: 'new' },
    }],
  })
  assert.equal(manifest.people[0].celeb_reality, 'BOTH')
})

test('실존 인물(REAL)과 알 수 없는 값은 실존 축으로 받지 않는다', () => {
  for (const value of ['REAL', 'real', 'both', '']) {
    assert.throws(() => parseInactiveSeedManifest({
      tag_slug: 'myth-korea',
      people: [{
        nickname: '박혁거세',
        nickname_en: 'Bak Hyeokgeose',
        bio: '신라의 첫 임금.',
        celeb_reality: value,
        identity: { mode: 'new' },
      }],
    }), /FICTION 또는 BOTH/)
  }
})

test('명세 안의 동일 인물 중복과 100자를 넘는 bio를 거부한다', () => {
  assert.throws(() => parseInactiveSeedManifest({
    tag_slug: 'myth-korea',
    people: [
      { nickname: '바리공주', nickname_en: 'Princess Bari', bio: '설명', identity: { mode: 'new' } },
      { nickname: '바리공주', nickname_en: 'Princess Bari', bio: '설명', identity: { mode: 'new' } },
    ],
  }), /인물 중복/)

  assert.throws(() => parseInactiveSeedManifest({
    tag_slug: 'myth-korea',
    people: [{
      nickname: '바리공주',
      nickname_en: 'Princess Bari',
      bio: '가'.repeat(101),
      identity: { mode: 'new' },
    }],
  }), /100자 이하/)
})

test('기존 UUID를 명시해 연결하고 bio가 다른 동명이인 신규 등록을 허용한다', () => {
  const manifest = parseInactiveSeedManifest({
    tag_slug: 'myth-china-xiyou',
    people: [
      {
        nickname: '이정',
        nickname_en: 'Li Jing',
        bio: '봉신연의와 서유기의 탁탑천왕.',
        identity: { mode: 'existing', celeb_id: '052fc4fe-3b06-4098-8c18-6b99b5c81733' },
      },
      {
        nickname: '아르고스',
        nickname_en: 'Argus',
        bio: '아르고호를 만든 조선공.',
        identity: { mode: 'new' },
      },
      {
        nickname: '아르고스',
        nickname_en: 'Argos',
        bio: '오디세우스의 늙은 개.',
        identity: { mode: 'new' },
      },
      {
        nickname: '아르고스',
        nickname_en: 'Argus',
        bio: '헤라를 위해 이오를 감시한 백 개 눈의 거인.',
        identity: { mode: 'new' },
      },
    ],
  })
  assert.equal(manifest.people.length, 4)

  assert.throws(() => parseInactiveSeedManifest({
    tag_slug: 'myth-china-xiyou',
    people: [{
      nickname: '이정',
      nickname_en: 'Li Jing',
      bio: '봉신연의와 서유기의 탁탑천왕.',
      identity: { mode: 'existing', celeb_id: 'li-jing' },
    }],
  }), /UUID/)
})

test('generated slug 충돌 시 DB와 같은 -2 접미사를 예약한다', () => {
  const occupied = new Set(['princess-bari', 'princess-bari-2'])
  assert.deepEqual(reserveGeneratedSlug('princess-bari', occupied), {
    slug: 'princess-bari-3',
    slugSuffix: '3',
  })
  assert.equal(occupied.has('princess-bari-3'), true)
})
