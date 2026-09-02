import { BaseModule, validateManifest } from '@naoj/core'
import type { IModuleManifest, ITableSchema } from '@naoj/core'
import type { RouteRecordRaw } from 'vue-router'
import { notesTable } from './schema.ts'
import rawManifest from '../manifest.json'

export class NotesModule extends BaseModule {
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
      {
        path: '/notes/:id',
        name: 'note-view',
        components: {
          default: () => import('./components/NoteEditor.vue'),
          sidebar: () => import('./components/NoteList.vue'),
          toolbar: () => import('./components/NoteToolbar.vue'),
          'status-bar': () => import('./components/NoteStatusBar.vue'),
        },
      },
    ]
  }
}

export default NotesModule
