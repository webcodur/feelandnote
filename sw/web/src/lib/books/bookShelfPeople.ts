import type { BookShelfPeople, BookShelfPerson } from '@/actions/books/getBookShelfPeople'
import type { BookShelfContext } from '@/components/shared/BookShelf/types'

/** 인물·세력의 관점만 좁힌다. 작품에 등록된 집필자는 구성원 밖이어도 확인할 수 있다. */
export function selectBookShelfPeople(people: BookShelfPeople, context?: BookShelfContext, readerIds?: readonly string[]): BookShelfPeople {
  const members = context?.memberIds ? new Set(context.memberIds) : null
  const personal = context?.personId && context.kind !== 'affiliation' && context.kind !== 'profession' ? context.personId : null
  const readers = readerIds ? new Set(readerIds) : null
  const sort = (list: BookShelfPerson[]) => [...new Map(list.map((person) => [person.id, person])).values()]
    .sort((a, b) => Number(b.id === context?.personId) - Number(a.id === context?.personId))
  return {
    appeared: sort(people.appeared.filter((person) => members ? members.has(person.id) : personal ? person.id === personal : true)),
    authored: sort(people.authored),
    read: sort(people.read.filter((person) => readers ? readers.has(person.id) : members ? members.has(person.id) : personal ? person.id === personal : true)),
  }
}
