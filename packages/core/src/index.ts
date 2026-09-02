// Database layer
export type {
  IDatabaseAdapter,
  IQueryResult,
  ITableSchema,
  IColumnDef,
  ColumnType,
} from "./database/databaseAdapter.ts";
export {
  schema,
  TableBuilder,
  columnDefToSQL,
  tableSchemaToCreateSQL,
} from "./database/schemaBuilder.ts";
export { QueryBuilder } from "./database/queryBuilder.ts";

// Platform adapters
export { ElectronSQLiteAdapter } from "./adapters/electronSqliteAdapter.ts";
export { BrowserSQLAdapter } from "./adapters/browserSqlAdapter.ts";
export type { InitSqlJs } from "./adapters/browserSqlAdapter.ts";
export { isElectron } from "./adapters/index.ts";

// Core API
export { CoreAPI } from "./core/coreApi.ts";

// Event bus
export { EventBus } from "./events/eventBus.ts";

// Module system
export { BaseModule } from "./modules/baseModule.ts";
export { ModuleRegistry } from "./modules/moduleRegistry.ts";
export { loadNaojConfig, loadModuleManifest, loadModuleFromPath } from "./modules/moduleLoader.ts";
export type { INaojConfig, INaojModuleEntry } from "./modules/moduleLoader.ts";

// Manifest types & validation
export type { IModuleManifest } from "./types/moduleManifest.ts";
export {
  ModuleManifestSchema,
  validateManifest,
  safeValidateManifest,
} from "./types/moduleManifest.ts";

// Vue composables and injection keys
export {
  CORE_API_KEY,
  EVENT_BUS_KEY,
  MODULE_REGISTRY_KEY,
  useCoreAPI,
  useEventBus,
  useModuleRegistry,
} from "./composables/useCore.ts";
