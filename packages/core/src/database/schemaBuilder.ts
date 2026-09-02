import type { IColumnDef, ITableSchema, ColumnType } from "./databaseAdapter.ts";

export function columnDefToSQL(col: IColumnDef): string {
  if (col.type === "id") {
    return `"${col.name}" INTEGER PRIMARY KEY AUTOINCREMENT`;
  }

  const typeMap: Record<Exclude<ColumnType, "id">, string> = {
    string: "TEXT",
    text: "TEXT",
    integer: "INTEGER",
    boolean: "INTEGER",
    datetime: "TEXT",
    json: "TEXT",
  };

  let sql = `"${col.name}" ${typeMap[col.type as Exclude<ColumnType, "id">]}`;

  if (!col.nullable) sql += " NOT NULL";

  if (col.defaultValue !== undefined) {
    if (col.defaultValue === null) {
      sql += " DEFAULT NULL";
    } else if (typeof col.defaultValue === "string") {
      sql += ` DEFAULT '${col.defaultValue}'`;
    } else if (typeof col.defaultValue === "boolean") {
      sql += ` DEFAULT ${col.defaultValue ? 1 : 0}`;
    } else {
      sql += ` DEFAULT ${col.defaultValue}`;
    }
  }

  if (col.unique) sql += " UNIQUE";

  return sql;
}

export function tableSchemaToCreateSQL(table: ITableSchema): string {
  const cols = table.columns.map(columnDefToSQL).join(",\n  ");
  return `CREATE TABLE IF NOT EXISTS "${table.name}" (\n  ${cols}\n)`;
}

export class TableBuilder {
  private readonly _name: string;
  private readonly _columns: IColumnDef[] = [];

  constructor(name: string) {
    this._name = name;
  }

  private _last(): IColumnDef {
    const last = this._columns[this._columns.length - 1];
    if (!last) throw new Error("No column defined yet. Add a column before using modifiers.");
    return last;
  }

  private _add(name: string, type: ColumnType): this {
    this._columns.push({
      name,
      type,
      nullable: false,
      unique: false,
      primaryKey: false,
      autoIncrement: false,
    });
    return this;
  }

  id(name = "id"): this {
    this._columns.push({
      name,
      type: "id",
      nullable: false,
      unique: true,
      primaryKey: true,
      autoIncrement: true,
    });
    return this;
  }

  text(name: string): this {
    return this._add(name, "text");
  }

  string(name: string, length?: number): this {
    this._add(name, "string");
    if (length !== undefined) this._last().length = length;
    return this;
  }

  integer(name: string): this {
    return this._add(name, "integer");
  }
  boolean(name: string): this {
    return this._add(name, "boolean");
  }
  datetime(name: string): this {
    return this._add(name, "datetime");
  }
  json(name: string): this {
    return this._add(name, "json");
  }

  nullable(): this {
    this._last().nullable = true;
    return this;
  }

  default(value: string | number | boolean | null): this {
    this._last().defaultValue = value;
    return this;
  }

  unique(): this {
    this._last().unique = true;
    return this;
  }

  build(): ITableSchema {
    return { name: this._name, columns: [...this._columns] };
  }
}

export const schema = {
  table: (name: string): TableBuilder => new TableBuilder(name),
};
