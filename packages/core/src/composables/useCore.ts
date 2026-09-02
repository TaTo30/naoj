import { inject, type InjectionKey } from 'vue'
import type { CoreAPI } from '../core/coreApi.ts'
import type { EventBus } from '../events/eventBus.ts'
import type { ModuleRegistry } from '../modules/moduleRegistry.ts'

export const CORE_API_KEY: InjectionKey<CoreAPI> = Symbol('coreAPI')
export const EVENT_BUS_KEY: InjectionKey<EventBus> = Symbol('eventBus')
export const MODULE_REGISTRY_KEY: InjectionKey<ModuleRegistry> = Symbol('moduleRegistry')

export function useCoreAPI(): CoreAPI {
  const core = inject(CORE_API_KEY)
  if (!core) throw new Error('CoreAPI not provided. Did you call app.provide(CORE_API_KEY, core)?')
  return core
}

export function useEventBus(): EventBus {
  const bus = inject(EVENT_BUS_KEY)
  if (!bus) throw new Error('EventBus not provided.')
  return bus
}

export function useModuleRegistry(): ModuleRegistry {
  const registry = inject(MODULE_REGISTRY_KEY)
  if (!registry) throw new Error('ModuleRegistry not provided.')
  return registry
}
