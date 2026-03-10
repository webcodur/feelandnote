import { readFileSync } from 'fs'

const data = JSON.parse(readFileSync('scripts/needs-review.json', 'utf8'))
const fixed = new Set([
  '40f9b422-5143-4e52-a0e7-91f7fdf77780','bd286ffa-1cbc-4073-96e8-38f3e9bed295',
  '9a916a85-8875-428d-8e66-ed99dda16661','fd8731f1-b9c4-4a91-8ca8-c7c8f5686a52',
  '4bb39dc6-28ae-4b36-80b3-5ccb018b5a88','b4ab9ad4-a349-47e0-adf1-7816556d7175',
  '8b52a56c-b60a-498c-944d-178418a84836','da661064-fa8b-4168-820f-2f9f167279ec',
  '4cf14249-b467-4fc6-a00d-6532b904a0d5','825b90e6-8ceb-4a2d-b342-332bcd1c66aa',
  '550aa795-0414-460a-8a8f-6ae4e2965543','a8a815ab-1090-4a64-9d22-a349b8f9b69e',
  'f831f69d-8f7e-430d-99d8-26d648312ea6','1a7981e8-a423-4ba8-9f8d-b7b76895afa1',
  '2d16b027-19d9-479f-a917-fb42d4d074ce','56899b40-0064-4851-98ef-118c8b6bbe3d',
  '71448699-3ce0-4ea0-af14-af893cbeb03e','3e8ad5a3-c367-4249-9e5c-818badcd40d5',
  '9da412aa-667d-4b29-9fd0-2993d13780b4','ef3a85bb-135d-47f2-9b9a-3a902975fbcf',
  '7fa85ae0-6899-4bc9-847d-b9e342ff2223','728816d4-13ba-4d50-8769-16a5e84418f8',
  '20b71537-6be6-432e-8724-50cdf318f369'
])
const remaining = data.filter(r => !fixed.has(r.content_id))
console.log('remaining:', remaining.length)

const am = remaining.filter(r => r.reason.startsWith('저자'))
console.log(`\n=== 저자 불일치 ${am.length}건 ===`)
am.forEach(r => console.log(`${r.content_id.slice(0,8)} | ${(r.en_title||'').slice(0,45)} | DB:${r.en_creator} | OL:${r.ol?.author}`))

const om = remaining.filter(r => r.reason === 'OL 검색 실패')
console.log(`\n=== OL miss ${om.length}건 ===`)
om.forEach(r => console.log(`${r.content_id.slice(0,8)} | ${(r.en_title||'').slice(0,50)} | ${r.en_creator}`))

const tm = remaining.filter(r => r.reason.startsWith('OL 제목'))
console.log(`\n=== OL 제목 불일치 ${tm.length}건 ===`)
tm.forEach(r => console.log(`${r.content_id.slice(0,8)} | ${(r.en_title||'').slice(0,40)} | OL:${(r.ol?.title||'').slice(0,40)} | ${r.en_creator}`))
