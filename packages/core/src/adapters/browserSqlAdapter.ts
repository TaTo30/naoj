import type { IDatabaseAdapter, IQueryResult } from "../database/databaseAdapter.ts";
import type { Database as SqlJsDatabase, SqlJsStatic, SqlJsConfig } from "sql.js";

type SqlParam = string | number | null | Uint8Array;

// Caller-supplied factory — avoids CJS/ESM interop at the adapter level
export type InitSqlJs = (config?: SqlJsConfig) => Promise<SqlJsStatic>;

export class BrowserSQLAdapter implements IDatabaseAdapter {
  private _db: SqlJsDatabase | null = null;
  private _SQL: SqlJsStatic | null = null;

  constructor(
    private readonly _initSqlJs: InitSqlJs,
    private readonly _wasmUrl?: string,
  ) {}

  async open(_path: string): Promise<void> {
    if (!this._SQL) {
      this._SQL = await this._initSqlJs(
        this._wasmUrl ? { locateFile: () => this._wasmUrl! } : undefined,
      );
    }
    this._db = new this._SQL.Database();
    this._db.run("PRAGMA foreign_keys = ON");
  }

  async close(): Promise<void> {
    this._db?.close();
    this._db = null;
  }

  async execute(sql: string, params: unknown[] = []): Promise<IQueryResult> {
    this._assertOpen();
    // sql.js rejects undefined; map to null (SQL NULL)
    const safe = params.map((p) => (p === undefined ? null : p));
    this._db!.run(sql, safe as SqlParam[]);
    const meta = this._db!.exec("SELECT changes(), last_insert_rowid()");
    const vals = meta[0]?.values[0];
    return {
      rows: [],
      rowsAffected: (vals?.[0] as number | undefined) ?? 0,
      lastInsertId: vals?.[1] as number | undefined,
    };
  }

  async query<T = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T[]> {
    this._assertOpen();
    const safe = params.map((p) => (p === undefined ? null : p));
    const stmt = this._db!.prepare(sql);
    stmt.bind(safe as SqlParam[]);
    const rows: T[] = [];
    while (stmt.step()) {
      rows.push(stmt.getAsObject({}) as T);
    }
    stmt.free();
    return rows;
  }

  async transaction<T>(fn: () => Promise<T>): Promise<T> {
    this._assertOpen();
    this._db!.run("BEGIN");
    try {
      const result = await fn();
      this._db!.run("COMMIT");
      return result;
    } catch (e) {
      this._db!.run("ROLLBACK");
      throw e;
    }
  }

  isOpen(): boolean {
    return this._db !== null;
  }

  serialize(): Uint8Array {
    this._assertOpen();
    return this._db!.export();
  }

  // Loads an existing database from serialized bytes
  async loadFromData(data: ArrayBuffer | Uint8Array): Promise<void> {
    if (!this._SQL) {
      this._SQL = await this._initSqlJs(
        this._wasmUrl ? { locateFile: () => this._wasmUrl! } : undefined,
      );
    }
    this._db?.close();
    const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
    this._db = new this._SQL.Database(bytes);
  }

  private _assertOpen(): void {
    if (!this._db) throw new Error("Database not open. Call open() first.");
  }
}
