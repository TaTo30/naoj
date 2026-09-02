import { QueryBuilder } from '../database/queryBuilder.ts'
import { columnDefToSQL, tableSchemaToCreateSQL } from '../database/schemaBuilder.ts'
import type { IDatabaseAdapter, ITableSchema } from '../database/databaseAdapter.ts'
import type { IModuleManifest } from '../types/moduleManifest.ts'
import { SYSTEM_TABLES } from '../models/systemTables.ts'

export class CoreAPI {
  private readonly _adapter: IDatabaseAdapter

  constructor(adapter: IDatabaseAdapter) {
    this._adapter = adapter
  }

  get adapter(): IDatabaseAdapter {
    return this._adapter
  }

  async initialize(): Promise<void> {
    for (const table of SYSTEM_TABLES) {
      await this._adapter.execute(tableSchemaToCreateSQL(table))
    }
  }

  from<T = Record<string, unknown>>(table: string): QueryBuilder<T> {
    return new QueryBuilder<T>(table, this._adapter)
  }

  async registerModule(manifest: IModuleManifest, tables: ITableSchema[]): Promise<void> {
    for (const table of tables) {
      await this._migrateTable(table)
    }
    await this._adapter.execute(
      `INSERT OR REPLACE INTO "naoj_modules" ("name", "version", "manifest_json") VALUES (?, ?, ?)`,
      [manifest.name, manifest.version, JSON.stringify(manifest)]
    )
  }

  async transaction<T>(fn: () => Promise<T>): Promise<T> {
    return this._adapter.transaction(fn)
  }

  private async _migrateTable(table: ITableSchema): Promise<void> {
    const existing = await this._adapter.query<{ name: string }>(
      `SELECT name FROM sqlite_master WHERE type='table' AND name=?`,
      [table.name]
    )

    if (existing.length === 0) {
      await this._adapter.execute(tableSchemaToCreateSQL(table))
      return
    }

    // Auto-migrate: add any new columns that don't exist yet
    const pragma = await this._adapter.query<{ name: string }>(
      `PRAGMA table_info("${table.name}")`
    )
    const existingCols = new Set(pragma.map(r => r.name))

    for (const col of table.columns) {
      if (!existingCols.has(col.name) && !col.primaryKey) {
        await this._adapter.execute(
          `ALTER TABLE "${table.name}" ADD COLUMN ${columnDefToSQL(col)}`
        )
      }
    }
  }
}
