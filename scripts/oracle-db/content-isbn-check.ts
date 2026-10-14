/** 동일 ISBN 계약으로 기존 컬럼의 DB CHECK를 출력한다. 연결·적용·파일 생성은 하지 않는다. */
import { contentIsbnMigration } from '../../packages/content-search/src/book-isbn-sql'

process.stdout.write(contentIsbnMigration())
