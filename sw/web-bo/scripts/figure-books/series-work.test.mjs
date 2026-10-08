import assert from 'node:assert/strict'
import test from 'node:test'
import { registeredSeriesMatches, bookEditionTitleKey } from './lib/series-work.mjs'
import { seriesVolumeInfo } from '../../../../packages/content-search/src/book-series.ts'

const series = { title: '그림피아노: 아이유', creator: 'PhildaveMusic 콘텐츠제작부', locale: 'ko', sourceUrl: 'https://www.yes24.com/product/category/series/001001007013002?SeriesNumber=251328' }
const work = { id: 'series-iu', metadata: { figureBook: { series } } }
const edition = { title: '그림피아노: 아이유 High4 - 봄 사랑 벚꽃 말고', creator: series.creator, locale: 'ko' }

test('괄호 앞 권 번호와 로마 숫자는 잘못된 시작권 범위로 덮어 쓸 수 없다', () => {
  const s = {title:'연속 작품',creator:'저자',locale:'ko',sourceUrl:'https://publisher.example/series'}
  const e = {locale:'ko',title:'연속 작품 19(부제)',creator:'저자',publisher:'출판사',editionKind:'volume',textScope:null}
  assert.equal(seriesVolumeInfo(s,e)?.number,19)
  assert.equal(seriesVolumeInfo(s,{...e,textScope:'volume/1'}),null)
  assert.equal(seriesVolumeInfo(s,{...e,title:'연속 작품 Volume II Part 1',textScope:'volume/2'})?.number,2)
  assert.equal(seriesVolumeInfo(s,{...e,title:'연속 작품 Volume II Part 1',textScope:'volume/1'}),null)
  assert.equal(seriesVolumeInfo(s,{...e,title:'연속 작품 4/5',textScope:'volume/4/of/5'})?.number,4)
})

test('검수한 표제의 큰글자·개정·판형 변형은 작품 신설 전에 기존 작품으로 안내한다',()=>{
 const original={id:'one',metadata:{link:'https://publisher.example/book',figureBook:{workTitle:'같은 책',workCreator:'작가'}}}
 for(const suffix of ['(큰글자책)','(큰글씨도서)','(개정증보판 2판)','(양장본 HardCover)']) {
  assert.equal(registeredSeriesMatches([original],[{title:'같은 책'+suffix,creator:'작가',locale:'ko'}])[0].contentId,'one')
 }
 for(const other of [{title:'같은 책 해설(큰글자책)',creator:'작가',locale:'ko'},{title:'같은 책(큰글자책)',creator:'다른 작가',locale:'ko'}])assert.deepEqual(registeredSeriesMatches([original],[other]),[])
 assert.deepEqual(registeredSeriesMatches([{...original,metadata:{figureBook:original.metadata.figureBook}}],[{title:'같은 책(큰글자책)',creator:'작가',locale:'ko'}]),[])
 assert.notEqual(bookEditionTitleKey('같은 책 1'),bookEditionTitleKey('같은 책 2'))
 assert.equal(bookEditionTitleKey('같은 책(큰글씨책)'),bookEditionTitleKey('같은 책'))
})

test('출판사가 확인한 구판·신장판 시리즈 이름을 같은 원작으로 안내한다',()=>{
 const original={id:'sangokushi',metadata:{figureBook:{series:{title:'전략 삼국지',aliases:['만화 삼국지'],creator:'요코야마 미츠테루',locale:'ko',sourceUrl:'https://www.yes24.com/product/goods/35394661'}}}}
 assert.equal(registeredSeriesMatches([original],[{title:'만화 삼국지 15',creator:'요코야마 미츠테루',locale:'ko'}])[0].contentId,original.id)
 assert.deepEqual(registeredSeriesMatches([original],[{title:'만화 삼국지 해설',creator:'다른 작가',locale:'ko'}]),[])
 assert.deepEqual(registeredSeriesMatches([original],[{title:'만화 삼국지연의 독립 작품',creator:'요코야마 미츠테루',locale:'ko'}]),[])
})

test('검수된 시리즈의 다른 곡·권은 기존 시리즈로 안내한다', () => {
  assert.equal(registeredSeriesMatches([work], [edition])[0].contentId, work.id)
  assert.equal(registeredSeriesMatches([work], [{ ...edition, title: '그림피아노: 아이유 금요일에 만나요' }]).length, 1)
})
test('공통 접두사만 있는 미검수 도서는 시리즈로 단정하지 않는다', () => {
  assert.deepEqual(registeredSeriesMatches([{ ...work, metadata: { figureBook: { workTitle: series.title } } }], [edition]), [])
  assert.deepEqual(registeredSeriesMatches([{ ...work, metadata: { figureBook: { series: { ...series, sourceUrl: '' } } } }], [edition]), [])
})
test('다른 인물·저자·언어의 책은 차단하지 않는다', () => {
  for (const other of [
    { ...edition, title: '그림피아노: 아이콘 사랑을 했다' },
    { ...edition, title: '그림피아노: 아이유아 다른 책' },
    { ...edition, creator: '다른 제작부' },
    { ...edition, locale: 'en' },
  ]) assert.deepEqual(registeredSeriesMatches([work], [other]), [])
})
test('공동 저자의 순서·공백·쉼표 모양이 달라도 같은 저자 목록으로 확인한다',()=>{
 const authors={...work,metadata:{figureBook:{series:{...series,creator:'작가 A, 작가 B'}}}}
 assert.equal(registeredSeriesMatches([authors],[{...edition,creator:'작가 B，작가 A'}]).length,1)
 assert.equal(registeredSeriesMatches([authors],[{...edition,creator:'작가 A'}]).length,0)
})
