import { validateManifest } from '../types/moduleManifest.ts'
import type { IModuleManifest } from '../types/moduleManifest.ts'
import type { BaseModule } from './baseModule.ts'

export interface INaojModuleEntry {
  name: string
  path: string
}

export interface INaojConfig {
  modules: INaojModuleEntry[]
}

// Reads naoj.config.json from the filesystem — Node.js / Electron only
export async function loadNaojConfig(configPath: string): Promise<INaojConfig> {
  const { readFile } = await import(/* @vite-ignore */ 'node:fs/promises')
  const content = await readFile(configPath, 'utf-8')
  return JSON.parse(content) as INaojConfig
}

// Reads and validates a module's manifest.json — Node.js / Electron only
export async function loadModuleManifest(modulePath: string): Promise<IModuleManifest> {
  const { readFile } = await import(/* @vite-ignore */ 'node:fs/promises')
  const { resolve } = await import(/* @vite-ignore */ 'node:path')
  const content = await readFile(resolve(modulePath, 'manifest.json'), 'utf-8')
  return validateManifest(JSON.parse(content))
}

// Dynamically imports and instantiates a module from a compiled entrypoint — Node.js / Electron only
export async function loadModuleFromPath(modulePath: string, manifest: IModuleManifest): Promise<BaseModule> {
  const { resolve } = await import(/* @vite-ignore */ 'node:path')
  const { pathToFileURL } = await import(/* @vite-ignore */ 'node:url')
  const url = pathToFileURL(resolve(modulePath, manifest.entrypoint)).href
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const mod = await import(/* @vite-ignore */ url)
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  const ModuleClass = mod.default as new () => BaseModule
  return new ModuleClass()
}
