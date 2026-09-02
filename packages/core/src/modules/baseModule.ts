import type { Component } from 'vue'
import type { RouteRecordRaw } from 'vue-router'
import type { CoreAPI } from '../core/coreApi.ts'
import type { EventBus } from '../events/eventBus.ts'
import type { IModuleManifest } from '../types/moduleManifest.ts'
import type { ITableSchema } from '../database/databaseAdapter.ts'

export abstract class BaseModule {
  protected core!: CoreAPI
  protected events!: EventBus

  abstract readonly manifest: IModuleManifest
  abstract readonly tables: ITableSchema[]

  inject(core: CoreAPI, events: EventBus): void {
    this.core = core
    this.events = events
  }

  async onLoad(): Promise<void> {}
  async onUnload(): Promise<void> {}

  getRoutes(): RouteRecordRaw[] { return [] }
  getSidebarComponent(): Component | null { return null }
  getStatusBarComponent(): Component | null { return null }
}
