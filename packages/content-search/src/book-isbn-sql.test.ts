import { strict as assert } from 'node:assert'
import { test } from 'node:test'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { contentIsbnMigration, isbnSqlCheck } from './book-isbn-sql'

test('DB CHECK is reproduced from the shared ISBN contract', () => {
  const file = fileURLToPath(new URL('../../../sw/web/database/migrations/20261002000000_content_isbn_valid.sql', import.meta.url))
  assert.equal(readFileSync(file, 'utf8'), contentIsbnMigration())
})

test('ISBN database validation creates no table, column, or RPC and validates both existing columns atomically', () => {
  const sql = contentIsbnMigration()
  assert.match(sql, /^--[^\n]+\nBEGIN;/)
  assert.match(sql, /COMMIT;\n$/)
  assert.equal((sql.match(/ADD CONSTRAINT/g) ?? []).length, 2)
  assert.equal((sql.match(/VALIDATE CONSTRAINT/g) ?? []).length, 2)
  assert.doesNotMatch(sql, /CREATE\s+(?:TABLE|FUNCTION)|ADD\s+COLUMN|DROP/i)
  assert.match(sql, /97\[89\]\[0-9\]\{10\}/)
  assert.match(sql, /% 10 = 0/)
  assert.match(sql, /% 11 = 0/)
})

test('SQL renderer rejects expressions and quotes the one existing column', () => {
  for (const value of ['isbn); DROP TABLE contents;', 'isbn.value', 'ISBN', '']) {
    assert.throws(() => isbnSqlCheck(value), /Invalid SQL column/)
  }
  assert.match(isbnSqlCheck('isbn'), /^"isbn" IS NULL/)
})
