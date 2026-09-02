export { ElectronSQLiteAdapter } from './electronSqliteAdapter.ts'
export { BrowserSQLAdapter } from './browserSqlAdapter.ts'

export function isElectron(): boolean {
  return (
    typeof process !== 'undefined' &&
    typeof process.versions !== 'undefined' &&
    'electron' in process.versions
  )
}
