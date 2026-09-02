import { schema } from '../database/schemaBuilder.ts'
import type { ITableSchema } from '../database/databaseAdapter.ts'

export const naojModulesTable: ITableSchema = schema.table('naoj_modules')
  .id()
  .string('name').unique()
  .string('version')
  .text('manifest_json')
  .datetime('registered_at').default('CURRENT_TIMESTAMP')
  .build()

export const naojSchemaVersionsTable: ITableSchema = schema.table('naoj_schema_versions')
  .id()
  .string('module_name')
  .string('table_name')
  .string('version')
  .datetime('updated_at').default('CURRENT_TIMESTAMP')
  .build()

export const SYSTEM_TABLES: ITableSchema[] = [naojModulesTable, naojSchemaVersionsTable]
