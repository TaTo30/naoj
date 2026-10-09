import { EditorView } from "prosemirror-view"
import { VimEditorCommands, VimState } from "../types"
import { lineStartAt, moveCursor } from "../utils"



// TODO add docs
export interface VimInsertModeState {
  isTrackingInsert: boolean
  insertTextBuffer: string
}

export function insertMode(view: EditorView, event: KeyboardEvent, state: VimState, commands: VimEditorCommands){

  if (event.key === 'Escape' || (event.ctrlKey && event.key === 'c')) {
    state.mode = 'normal'
    state.operators = []

    // Finalize insert text tracking for dot repeat
    if (state.insertMode.isTrackingInsert && state.lastAction) {
      state.lastAction.insertedText = state.insertMode.insertTextBuffer
      state.insertMode.isTrackingInsert = false
      state.insertMode.insertTextBuffer = ''
    }
    // Move cursor one left (vim behavior) but don't cross line boundary
    const head = view.state.selection.head
    const lineS = lineStartAt(view.state, head)
    const newPos = head > lineS ? head - 1 : head
    view.dispatch(moveCursor(view.state, newPos))
    return true
  }


  // Track backspace for dot repeat
  if (event.key === 'Backspace' && state.insertMode.isTrackingInsert) {
    state.insertMode.insertTextBuffer = state.insertMode.insertTextBuffer.slice(0, -1)
  }
  return false // Let all other keys pass through in insert mode
}
