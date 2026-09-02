import type { IDatabaseAdapter, IQueryResult } from '../database/databaseAdapter.ts'

// Type-only import to avoid bundling the native module in browser builds
type BetterSqlite3Database = import('better-sqlite3').Database

export class ElectronSQLiteAdapter implements IDatabaseAdapter {
  private _db: BetterSqlite3Database | null = null

  async open(path: string): Promise<void> {
    // @vite-ignore prevents Vite from bundling this native module
    const { default: Database } = await import(/* @vite-ignore */ 'better-sqlite3')
    this._db = new Database(path)
    this._db.pragma('journal_mode = WAL')
    this._db.pragma('foreign_keys = ON')
  }

  async close(): Promise<void> {
    this._db?.close()
    this._db = null
  }

  async execute(sql: string, params: unknown[] = []): Promise<IQueryResult> {
    this._assertOpen()
    const stmt = this._db!.prepare(sql)
    const info = stmt.run(...params)
    return { rows: [], rowsAffected: info.changes, lastInsertId: info.lastInsertRowid }
  }

  async query<T = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T[]> {
    this._assertOpen()
    return this._db!.prepare(sql).all(...params) as T[]
  }

  async transaction<T>(fn: () => Promise<T>): Promise<T> {
    this._assertOpen()
    this._db!.exec('BEGIN')
    try {
      const result = await fn()
      this._db!.exec('COMMIT')
      return result
    } catch (e) {
      this._db!.exec('ROLLBACK')
      throw e
    }
  }

  isOpen(): boolean {
    return this._db !== null && this._db.open
  }

  serialize(): Uint8Array {
    this._assertOpen()
    return this._db!.serialize()
  }

  private _assertOpen(): void {
    if (!this._db || !this._db.open) throw new Error('Database not open. Call open() first.')
  }
}
