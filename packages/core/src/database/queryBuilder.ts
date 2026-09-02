import type { IDatabaseAdapter } from './databaseAdapter.ts'

type WhereEntry =
  | { kind: 'basic'; col: string; op: string; val: unknown }
  | { kind: 'in'; col: string; vals: unknown[] }

export class QueryBuilder<T = Record<string, unknown>> {
  private readonly _table: string
  private readonly _adapter: IDatabaseAdapter
  private _wheres: WhereEntry[] = []
  private _selects: string[] = []
  private _limit?: number
  private _offset?: number
  private _orderBy?: { col: string; dir: 'ASC' | 'DESC' }
  private _joins: Array<{ type: string; table: string; on: string }> = []

  constructor(table: string, adapter: IDatabaseAdapter) {
    this._table = table
    this._adapter = adapter
  }

  select(...cols: string[]): this {
    this._selects.push(...cols)
    return this
  }

  where(col: string, op: string, val: unknown): this {
    this._wheres.push({ kind: 'basic', col, op, val })
    return this
  }

  whereIn(col: string, vals: unknown[]): this {
    this._wheres.push({ kind: 'in', col, vals })
    return this
  }

  limit(n: number): this { this._limit = n; return this }
  offset(n: number): this { this._offset = n; return this }

  orderBy(col: string, dir: 'ASC' | 'DESC' = 'ASC'): this {
    this._orderBy = { col, dir }
    return this
  }

  join(table: string, on: string, type: 'INNER' | 'LEFT' = 'INNER'): this {
    this._joins.push({ type, table, on })
    return this
  }

  async all(): Promise<T[]> {
    const { sql, params } = this._buildSelect()
    return this._adapter.query<T>(sql, params)
  }

  async first(): Promise<T | null> {
    const { sql, params } = this._buildSelect()
    const results = await this._adapter.query<T>(`${sql} LIMIT 1`, params)
    return results[0] ?? null
  }

  async insert(data: Partial<T>): Promise<number | bigint> {
    const entries = Object.entries(data as Record<string, unknown>).filter(([, v]) => v !== undefined)
    const keys = entries.map(([k]) => k)
    const vals = entries.map(([, v]) => v)
    const sql = `INSERT INTO "${this._table}" (${keys.map(k => `"${k}"`).join(', ')}) VALUES (${keys.map(() => '?').join(', ')})`
    const result = await this._adapter.execute(sql, vals)
    return result.lastInsertId ?? 0
  }

  async update(data: Partial<T>): Promise<number> {
    const entries = Object.entries(data as Record<string, unknown>).filter(([, v]) => v !== undefined)
    const sets = entries.map(([k]) => `"${k}" = ?`).join(', ')
    const vals = entries.map(([, v]) => v)
    const { whereClause, whereParams } = this._buildWhere()
    const result = await this._adapter.execute(
      `UPDATE "${this._table}" SET ${sets}${whereClause}`,
      [...vals, ...whereParams]
    )
    return result.rowsAffected
  }

  async delete(): Promise<number> {
    const { whereClause, whereParams } = this._buildWhere()
    const result = await this._adapter.execute(
      `DELETE FROM "${this._table}"${whereClause}`,
      whereParams
    )
    return result.rowsAffected
  }

  async count(): Promise<number> {
    const { whereClause, whereParams } = this._buildWhere()
    const rows = await this._adapter.query<{ cnt: number }>(
      `SELECT COUNT(*) as "cnt" FROM "${this._table}"${whereClause}`,
      whereParams
    )
    return rows[0]?.cnt ?? 0
  }

  private _buildWhere(): { whereClause: string; whereParams: unknown[] } {
    if (this._wheres.length === 0) return { whereClause: '', whereParams: [] }
    const parts: string[] = []
    const params: unknown[] = []
    for (const w of this._wheres) {
      if (w.kind === 'in') {
        parts.push(`"${w.col}" IN (${w.vals.map(() => '?').join(', ')})`)
        params.push(...w.vals)
      } else {
        parts.push(`"${w.col}" ${w.op} ?`)
        params.push(w.val)
      }
    }
    return { whereClause: ` WHERE ${parts.join(' AND ')}`, whereParams: params }
  }

  private _buildSelect(): { sql: string; params: unknown[] } {
    const select = this._selects.length > 0
      ? this._selects.map(c => `"${c}"`).join(', ')
      : '*'
    const joins = this._joins.map(j => `${j.type} JOIN "${j.table}" ON ${j.on}`).join(' ')
    const { whereClause, whereParams } = this._buildWhere()
    let sql = `SELECT ${select} FROM "${this._table}"`
    if (joins) sql += ` ${joins}`
    sql += whereClause
    if (this._orderBy) sql += ` ORDER BY "${this._orderBy.col}" ${this._orderBy.dir}`
    if (this._limit !== undefined) sql += ` LIMIT ${this._limit}`
    if (this._offset !== undefined) sql += ` OFFSET ${this._offset}`
    return { sql, params: whereParams }
  }
}
