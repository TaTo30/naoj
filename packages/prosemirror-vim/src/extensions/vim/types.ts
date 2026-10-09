import type { Node as ProseMirrorNode } from 'prosemirror-model'
import { VimVisualModeState } from './visual-mode/visual-mode'
import { VimInsertModeState } from './insert-mode/insert-mode'

export interface VimRepeatableAction {
  type:
    | 'command'
    | 'operator-linewise'
    | 'operator-motion'
    | 'operator-textobject'
    | 'insert-command'
  key: string
  count: number
  operator?: 'd' | 'y' | 'c'
  motion?: string
  findChar?: string
  findMotion?: 'f' | 'F' | 't' | 'T'
  textObject?: { type: 'i' | 'a'; object: string }
  insertedText?: string
  replaceChar?: string
}

export type Mode = 'normal' | 'insert' | 'replace' | 'visual' | 'visual-line'
export type VimOperator = 'd' | 'y' | 'c' | '<' | '>' | '=' | 'g' | 'r'

export interface Register {
  text: string
  linewise: boolean
  content: ProseMirrorNode[] | null
}

export interface RepeatableAction {
  type:
    | 'command'
    | 'operator-linewise'
    | 'operator-motion'
    | 'operator-textobject'
    | 'insert-command'
  key: string
  count: number
  operator?: 'd' | 'y' | 'c'
  motion?: string
  findChar?: string
  findMotion?: 'f' | 'F' | 't' | 'T'
  textObject?: { type: 'i' | 'a'; object: string }
  insertedText?: string
  replaceChar?: string
}

export interface VimState {
  mode: Mode
  operators: VimOperator[]

  visualMode: VimVisualModeState
  insertMode: VimInsertModeState
  count: number | null
  register: Register
  goalColumn: number | null
  lastAction: RepeatableAction | null
  // Marks
  // Search
  searchTerm: string
  searchWholeWord: boolean
  searchActive: boolean
  searchQuery: string
  searchHighlightsVisible: boolean
  // Repeat
  replacePendingCount: number | null
  // Indent pending
  shiftRightPending: boolean
  shiftLeftPending: boolean
  // Center cursor pending
  zzPending: boolean
  // Status message (for status line display)
  statusMessage: string
}

export interface VimEditorCommands {
  undo(): boolean
  redo(): boolean
  indent?(): boolean
  outdent?(): boolean
}

export function defaultVimState(): VimState {
  return {
    mode: 'normal',
    operators: [],
    lastAction: null,
    insertMode: { isTrackingInsert: false, insertTextBuffer: '' },
    visualMode: { anchor: null, head: null },
    count: null,
    register: { text: '', linewise: false, content: null },
    goalColumn: null,
    searchTerm: '',
    searchWholeWord: false,
    searchActive: false,
    searchQuery: '',
    searchHighlightsVisible: false,
    replacePendingCount: null,
    shiftRightPending: false,
    shiftLeftPending: false,
    zzPending: false,
    statusMessage: '',
  }
}
