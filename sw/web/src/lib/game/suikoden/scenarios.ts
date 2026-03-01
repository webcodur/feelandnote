// 천도 — 시나리오 정의 (5개)

import type { ScenarioDef } from './types'

// ── Profile ID 상수 ──

const ID = {
  // 삼국쟁패
  유비: '1db274a2-a28a-4544-addb-d563ce02a07d',
  조조: '5f7c474c-b27d-4a84-84cc-e3e56e5bac6d',
  손권: '8d3f7fc5-4aaf-42cd-9db4-cb7189205f84',
  진시황: '9bd7aa63-0735-41c1-9db7-5a59a89518ec',
  제갈량: '6fcd1574-efe3-4674-ace7-06763841d34d',
  관우: 'a423a244-3ce2-4063-aa92-a25ace9017ed',
  사마의: '6d99c7a8-2436-4d3f-b170-ae7f1b83f302',
  한신: '7c0afcc1-3941-40c3-98b7-185ee87ba768',
  장량: '028057ac-07a9-41ad-88d4-f915d5f30f66',
  여몽: 'c42e3822-dfdc-4950-884e-6ca0d472541c',
  오기: 'ed6a1d9a-aaca-4feb-a47c-ddf8f4725652',
  손자: '71ee7d5f-b876-4b86-8bfc-df635acea863',

  // 십자군 전쟁
  리처드1세: '8c4c228e-c21a-4601-a557-dc1fd9763b41',
  살라딘: '8f42e8c6-d3ce-4ecc-8e5e-62001198a229',
  메흐메트2세: '6d555bf0-0859-4975-826e-62f49f90c45b',
  술레이만1세: '7736f0c0-7cf0-4dba-9444-e40cd50ada2e',
  블라드3세: '2b8cf3b8-cc6a-4c4f-8705-76148a4537ed',
  엘시드: '1f02850f-113b-400c-a49d-745d7df9e98a',
  잔다르크: '9508ba04-50f6-488b-939f-1328d0293685',
  윌리엄마셜: 'b2622bea-8e55-49ec-80de-ec54c320b50f',
  루미: 'fd5daae5-abd8-421a-9164-7ac995796a76',
  마틴루터: 'b5c4c38f-0a85-4178-9d04-be75d4037738',
  이븐할둔: '89c0e7a8-1eae-43ec-beb4-c8ff1eff5728',

  // 전국시대
  오다노부나가: '5f8fd431-e150-43c9-85bf-08f360da48cb',
  도쿠가와이에야스: 'be551f9e-805d-4940-a70a-a3f70fa63074',
  다케다신겐: '8d9ac6ec-2095-427b-a2c6-6b8fdbbb910a',
  도요토미히데요시: '296e45de-0586-44ab-b48e-f3fe052a6b1d',
  미나모토노요리토모: '111aa1bf-ca72-4da2-b8dc-f1a3946a0b0a',
  이순신: '73d5da05-cccf-47ba-bc52-5b1a39725b9b',
  유성룡: '1a0892ae-db6b-4392-8f0a-23b1edb883da',
  왕양명: 'a7f3c891-2d48-4b5e-9f12-8e6d3a1bc047',
  악비: '875c920f-19d5-417d-afad-5e3307e7d391',

  // 나폴레옹 전쟁
  나폴레옹: '0ba1daf9-47d5-4778-9175-0267737927cb',
  웰링턴: '21bbb37c-54e4-46ab-b64e-b05aa0e960d0',
  비스마르크: 'f860c2b6-99d8-4ff3-8314-2f358d20b6fb',
  프리드리히2세: '3753e872-c62c-48ba-9427-8d395c7bc839',
  표트르대제: '4a7e7298-7900-4916-b045-836efc894afa',
  예카테리나2세: '6f1c0702-3800-4fbb-86e1-6c839baa3055',
  링컨: 'c26f8b69-738e-46ea-bb53-929ebfe6166d',
  볼리바르: '41325e0a-2db0-4ad0-9923-383b1ed37616',
  볼테르: '8f1820a6-ede6-4fec-8181-e8e96f535657',
  괴테: 'a1ecd156-f516-4f8a-9156-b0cf9deffac7',
  베토벤: '86a2b3f1-784a-4b6d-8ef3-f31f8be7dcf6',
  칼마르크스: '760da9cf-7708-472f-a08e-f5087fcc1637',

  // 대몽골제국
  칭기즈칸: 'e94f8fc2-9010-4f39-9d32-2dad78a83cd2',
  이세민: 'affab1d8-cd58-4600-8f05-e4c4fa92a22c',
  주원장: '29fde7be-02fd-4bfb-91f2-941179747566',
  쿠빌라이칸: 'd6e578a1-de6a-4dd0-8f76-f8e7ef3f8e7a',
  티무르: 'c037ca92-1b44-4e6f-b3f0-b3d03ad60338',
  왕건: '80c6e03b-354d-49ce-982e-7af4297ab7e8',
  소동파: '5b7ea359-bc08-4738-8eff-38065bc400fb',
  세종대왕: '02ce6160-21b1-43c0-a85e-9d64a051a51d',
  이정: '70121e83-86ab-4fcc-b11d-3878b674c368',
} as const

// ── 시나리오 5개 ──

export const SCENARIOS: ScenarioDef[] = [
  // 1. 삼국쟁패
  {
    id: 'three_kingdoms',
    name: '삼국쟁패',
    subtitle: '중원의 패권을 놓고 세 나라가 격돌한다',
    era: 'ancient',
    description: '후한이 무너진 뒤, 조조·유비·손권 세 영웅이 천하를 다툰다. 서쪽에서는 진시황의 유산을 이은 세력이 호시탐탐 기회를 엿보고 있다. 인재를 모아 천하를 통일하라.',
    objective: '전 영토를 통일하라',
    difficulty: 'normal',
    playerCandidates: [
      { profileId: ID.유비, startTerritoryId: 'pyongyang', startDescription: '촉 땅에서 인의로 인재를 모으며, 한실 부흥의 뜻을 품었다.' },
      { profileId: ID.조조, startTerritoryId: 'beijing', startDescription: '중원의 패자. 냉철한 용병술과 패기로 천하를 호령한다.' },
      { profileId: ID.손권, startTerritoryId: 'nanjing', startDescription: '강동의 호랑이. 부형이 남긴 기반 위에 제국을 세운다.' },
    ],
    aiFactions: [
      { leaderId: ID.진시황, memberIds: [ID.한신, ID.오기], territoryId: 'samarkand', personality: 'conqueror' },
    ],
    wandererIds: [ID.제갈량, ID.관우, ID.사마의, ID.장량, ID.여몽, ID.손자],
  },

  // 2. 십자군 전쟁
  {
    id: 'crusades',
    name: '십자군 전쟁',
    subtitle: '성지를 둘러싼 동서 문명의 충돌',
    era: 'medieval',
    description: '지중해를 사이에 두고 십자군과 이슬람 세력이 격돌한다. 성지 예루살렘의 주인은 누가 될 것인가. 콘스탄티노플에서는 오스만의 야망이 꿈틀거리고, 동유럽의 영주들도 가만히 있지 않는다.',
    objective: '성지(카이로)를 확보하고 적대 세력 3개 이상을 제거하라',
    difficulty: 'hard',
    playerCandidates: [
      { profileId: ID.리처드1세, startTerritoryId: 'london', startDescription: '사자심왕 리처드. 성지 탈환을 위해 대군을 이끌고 원정에 나선다.' },
      { profileId: ID.살라딘, startTerritoryId: 'cairo', startDescription: '이슬람의 수호자. 관용과 무용으로 성지를 지킨다.' },
    ],
    aiFactions: [
      { leaderId: ID.메흐메트2세, memberIds: [ID.술레이만1세], territoryId: 'constantinople', personality: 'conqueror' },
      { leaderId: ID.블라드3세, memberIds: [], territoryId: 'berlin', personality: 'conqueror' },
      { leaderId: ID.엘시드, memberIds: [], territoryId: 'carthage', personality: 'virtuous' },
    ],
    wandererIds: [ID.잔다르크, ID.윌리엄마셜, ID.루미, ID.마틴루터, ID.이븐할둔],
  },

  // 3. 전국시대
  {
    id: 'sengoku',
    name: '전국시대',
    subtitle: '천하통일을 이룰 영웅은 누구인가',
    era: 'modern',
    description: '일본 열도가 군웅할거의 전국시대에 접어들었다. 오다 노부나가, 도쿠가와 이에야스, 다케다 신겐 — 세 무장이 천하의 패권을 다투고, 동아시아 전역에서 영웅호걸들이 발흥한다.',
    objective: '전 영토를 통일하라',
    difficulty: 'normal',
    playerCandidates: [
      { profileId: ID.오다노부나가, startTerritoryId: 'pyongyang', startDescription: '제6천마왕. 혁신과 파괴로 구질서를 무너뜨린다.' },
      { profileId: ID.도쿠가와이에야스, startTerritoryId: 'beijing', startDescription: '인내의 화신. 기다림 끝에 천하를 취한다.' },
      { profileId: ID.다케다신겐, startTerritoryId: 'nanjing', startDescription: '갑주의 호랑이. 풍림화산의 깃발 아래 적을 압도한다.' },
    ],
    aiFactions: [
      { leaderId: ID.도요토미히데요시, memberIds: [], territoryId: 'hanoi', personality: 'schemer' },
      { leaderId: ID.미나모토노요리토모, memberIds: [], territoryId: 'angkor', personality: 'economist' },
    ],
    wandererIds: [ID.이순신, ID.유성룡, ID.왕양명, ID.악비],
  },

  // 4. 나폴레옹 전쟁
  {
    id: 'napoleonic',
    name: '나폴레옹 전쟁',
    subtitle: '혁명의 불길이 유럽을 휩쓴다',
    era: 'modern',
    description: '프랑스 혁명의 불길 속에서 나폴레옹이 등극했다. 영국의 웰링턴이 대항하고, 프로이센의 비스마르크, 러시아의 거인들이 유럽 패권을 노린다. 구질서와 신질서의 대충돌이 시작된다.',
    objective: '유럽 5개 영토 이상을 확보하라',
    difficulty: 'hard',
    playerCandidates: [
      { profileId: ID.나폴레옹, startTerritoryId: 'paris', startDescription: '혁명의 아들. 유럽 전역에 새로운 질서를 세우겠다는 야망을 품었다.' },
      { profileId: ID.웰링턴, startTerritoryId: 'london', startDescription: '철의 공작. 대영제국의 위신을 걸고 프랑스의 야망을 저지한다.' },
    ],
    aiFactions: [
      { leaderId: ID.비스마르크, memberIds: [], territoryId: 'berlin', personality: 'schemer' },
      { leaderId: ID.프리드리히2세, memberIds: [], territoryId: 'moscow', personality: 'conqueror' },
      { leaderId: ID.표트르대제, memberIds: [], territoryId: 'constantinople', personality: 'economist' },
      { leaderId: ID.예카테리나2세, memberIds: [], territoryId: 'samarkand', personality: 'culturist' },
    ],
    wandererIds: [ID.링컨, ID.볼리바르, ID.볼테르, ID.괴테, ID.베토벤, ID.칼마르크스],
  },

  // 5. 대몽골제국
  {
    id: 'mongol_empire',
    name: '대몽골제국',
    subtitle: '초원의 패자가 세계를 향해 말을 달린다',
    era: 'medieval',
    description: '칭기즈 칸이 초원을 통일하고 세계 정복에 나선다. 당 태종 이세민의 유산을 이은 세력이 서역을 장악하고, 주원장이 남방에서 호시탐탐 북벌을 준비한다. 유라시아 대륙의 주인은 누구인가.',
    objective: '유라시아 7개 영토 이상을 확보하라',
    difficulty: 'hard',
    playerCandidates: [
      { profileId: ID.칭기즈칸, startTerritoryId: 'samarkand', startDescription: '대칸. 말 위에서 태어나 말 위에서 세계를 정복한다.' },
      { profileId: ID.이세민, startTerritoryId: 'delhi', startDescription: '천가한. 당의 영광을 서역까지 넓히겠다는 대업을 품었다.' },
    ],
    aiFactions: [
      { leaderId: ID.주원장, memberIds: [], territoryId: 'nanjing', personality: 'conqueror' },
      { leaderId: ID.쿠빌라이칸, memberIds: [], territoryId: 'beijing', personality: 'economist' },
      { leaderId: ID.티무르, memberIds: [], territoryId: 'baghdad', personality: 'conqueror' },
      { leaderId: ID.살라딘, memberIds: [], territoryId: 'cairo', personality: 'virtuous' },
      { leaderId: ID.왕건, memberIds: [], territoryId: 'pyongyang', personality: 'virtuous' },
    ],
    wandererIds: [ID.악비, ID.왕양명, ID.소동파, ID.세종대왕, ID.이정],
  },
]
