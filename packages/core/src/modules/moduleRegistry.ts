import type { CoreAPI } from '../core/coreApi.ts'
import type { EventBus } from '../events/eventBus.ts'
import type { BaseModule } from './baseModule.ts'
import type { RouteRecordRaw } from 'vue-router'

export class ModuleRegistry {
  private readonly _modules = new Map<string, BaseModule>()
  private readonly _core: CoreAPI
  private readonly _events: EventBus

  constructor(core: CoreAPI, events: EventBus) {
    this._core = core
    this._events = events
  }

  async register(module: BaseModule): Promise<void> {
    const { name, version } = module.manifest
    if (this._modules.has(name)) {
      console.warn(`[ModuleRegistry] Module "${name}" already registered. Skipping.`)
      return
    }
    module.inject(this._core, this._events)
    await this._core.registerModule(module.manifest, module.tables)
    await module.onLoad()
    this._modules.set(name, module)
    this._events.emit('module:loaded', { name, version })
    console.info(`[ModuleRegistry] "${name}@${version}" loaded.`)
  }

  async unregister(name: string): Promise<void> {
    const module = this._modules.get(name)
    if (!module) return
    await module.onUnload()
    this._modules.delete(name)
    this._events.emit('module:unloaded', { name })
  }

  get(name: string): BaseModule | undefined {
    return this._modules.get(name)
  }

  getAll(): BaseModule[] {
    return [...this._modules.values()]
  }

  getRoutes(): RouteRecordRaw[] {
    return this.getAll().flatMap(m => m.getRoutes())
  }

  isLoaded(name: string): boolean {
    return this._modules.has(name)
  }
}
