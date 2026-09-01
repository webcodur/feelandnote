import assert from 'node:assert/strict'
import test from 'node:test'
import {
  parseInactiveFictionSeedManifest,
  reserveGeneratedSlug,
} from './seed-inactive-contract'

test('최소 fiction 선등록 명세를 정리한다', () => {
  assert.deepEqual(parseInactiveFictionSeedManifest({
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
      identity: { mode: 'new' },
    }],
  })
})

test('명세 안의 동일 인물 중복과 100자를 넘는 bio를 거부한다', () => {
  assert.throws(() => parseInactiveFictionSeedManifest({
    tag_slug: 'myth-korea',
    people: [
      { nickname: '바리공주', nickname_en: 'Princess Bari', bio: '설명', identity: { mode: 'new' } },
      { nickname: '바리공주', nickname_en: 'Princess Bari', bio: '설명', identity: { mode: 'new' } },
    ],
  }), /인물 중복/)

  assert.throws(() => parseInactiveFictionSeedManifest({
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
  const manifest = parseInactiveFictionSeedManifest({
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

  assert.throws(() => parseInactiveFictionSeedManifest({
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
