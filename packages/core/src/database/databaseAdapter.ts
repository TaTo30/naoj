export interface IQueryResult<T = Record<string, unknown>> {
  rows: T[];
  rowsAffected: number;
  lastInsertId?: number | bigint;
}

export type ColumnType = "id" | "string" | "text" | "integer" | "boolean" | "datetime" | "json";

export interface IColumnDef {
  name: string;
  type: ColumnType;
  nullable: boolean;
  defaultValue?: string | number | boolean | null;
  unique: boolean;
  primaryKey: boolean;
  autoIncrement: boolean;
  length?: number;
}

export interface ITableSchema {
  name: string;
  columns: IColumnDef[];
}

export interface IDatabaseAdapter {
  open(path: string): Promise<void>;
  close(): Promise<void>;
  execute(sql: string, params?: unknown[]): Promise<IQueryResult>;
  query<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T[]>;
  transaction<T>(fn: () => Promise<T>): Promise<T>;
  isOpen(): boolean;
  serialize(): Uint8Array;
}
