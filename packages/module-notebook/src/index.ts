import { BaseModule, validateManifest } from '@naoj/core'
import type { IModuleManifest, ITableSchema } from '@naoj/core'
import type { RouteRecordRaw } from 'vue-router'
import { notesTable } from './schema.ts'
import rawManifest from '../manifest.json'

import "floating-vue/style.css"

export class NotebookModule extends BaseModule {
  readonly manifest: IModuleManifest = validateManifest(rawManifest)
  readonly tables: ITableSchema[] = [notesTable]

  getRoutes(): RouteRecordRaw[] {
    return [
      {
        path: '/notes',
        name: 'notes',
        components: {
          default: () => import('./layout/NotebookMain.vue'),
          sidebar: () => import('./layout/NotebookSidebar.vue'),
          toolbar: () => import('./layout/NotebookToolbar.vue'),
         'status-bar': () => import('./layout/NotebookStatusBar.vue'),
        },
      },
      {
        path: '/notes/:id',
        name: 'note-view',
        components: {
          default: () => import('./layout/NotebookMain.vue'),
          sidebar: () => import('./layout/NotebookSidebar.vue'),
          toolbar: () => import('./layout/NotebookToolbar.vue'),
         'status-bar': () => import('./layout/NotebookStatusBar.vue'),
        },
      },
    ]
  }
}

export default NotebookModule
