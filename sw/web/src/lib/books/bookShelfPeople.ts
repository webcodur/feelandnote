import type { BookShelfPeople, BookShelfPerson } from '@/actions/books/getBookShelfPeople'
import type { BookShelfContext } from '@/components/shared/BookShelf/types'

/** 작품의 실제 관계는 유지한다. 책장 맥락은 표시 순서에만 쓰고 개인 책장의 본인 등장은 뺀다. */
export function selectBookShelfPeople(people: BookShelfPeople, context?: BookShelfContext, readerIds?: readonly string[]): BookShelfPeople {
  const members = context?.memberIds ? new Set(context.memberIds) : null
  const readers = readerIds ? new Set(readerIds) : null
  const priority = (person: BookShelfPerson) => person.id === context?.personId ? 3
    : readers?.has(person.id) ? 2 : members?.has(person.id) ? 1 : 0
  const sort = (list: BookShelfPerson[]) => [...new Map(list.map((person) => [person.id, person])).values()]
    .sort((a, b) => priority(b) - priority(a))
  return {
    appeared: sort(people.appeared.filter((person) => person.id !== context?.personId)),
    authored: sort(people.authored),
    read: sort(people.read),
  }
}
