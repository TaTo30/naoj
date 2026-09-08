import { BaseModule, validateManifest } from '@naoj/core'
import type { IModuleManifest, ITableSchema } from '@naoj/core'
import type { RouteRecordRaw } from 'vue-router'
import { notesTable } from './schema.ts'
import rawManifest from '../manifest.json'

import "./main.css"
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
          default: () => import('./components/NoteEditor.vue'),
          sidebar: () => import('./components/NoteList.vue'),
          toolbar: () => import('./components/NoteToolbar.vue'),
         'status-bar': () => import('./components/NoteStatusBar.vue'),
        },
      },
      // {
      //   path: '/notes/:id',
      //   name: 'note-view',
      //   components: {
      //     default: () => import('./components/NoteEditor.vue'),
      //     sidebar: () => import('./components/NoteList.vue'),
      //     toolbar: () => import('./components/NoteToolbar.vue'),
      //     'status-bar': () => import('./components/NoteStatusBar.vue'),
      //   },
      // },
    ]
  }
}

export default NotebookModule
