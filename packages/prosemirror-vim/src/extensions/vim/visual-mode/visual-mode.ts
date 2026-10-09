import { EditorState, TextSelection, Transaction, Selection } from "prosemirror-state"
import { VimEditorCommands, VimState } from "../types"
import { lineBounds, moveCursor } from "../utils"
import { EditorView } from "prosemirror-view"
import { executeChange, executeDelete, executeYank } from "../operators"

// TODO add docs
export interface VimVisualModeState {
  anchor: number | null
  head: number | null
}


/**
 * Update the visual selection based on anchor and new head position.
 */
export function updateVisualSelection(
  viewState: EditorState,
  tr: Transaction,
  state: VimState,
  newHead: number,
): Transaction {
  if (state.visualMode.anchor === null) return tr

  const anchor = state.visualMode.anchor
  const head = newHead

  if (state.mode === 'visual') {
    // Characterwise visual: select from anchor to head
    // In vim, visual selection is inclusive. We extend head by 1 when head >= anchor
    let selFrom: number, selTo: number
    if (head >= anchor) {
      selFrom = anchor
      selTo = Math.min(head + 1, viewState.doc.content.size)
    } else {
      selFrom = head
      selTo = Math.min(anchor + 1, viewState.doc.content.size)
    }

    try {
      tr.setSelection(TextSelection.create(tr.doc, selFrom, selTo))
    } catch {
      // leave as-is
    }
  } else if (state.mode === 'visual-line') {
    // Linewise visual: select full lines from anchor to head
    const anchorBounds = lineBounds(viewState, anchor)
    const headBounds = lineBounds(viewState, newHead)

    const from = Math.min(anchorBounds.from, headBounds.from)
    const to = Math.max(anchorBounds.to, headBounds.to)

    try {
      tr.setSelection(TextSelection.create(tr.doc, from, to))
    } catch {
      // leave as-is
    }
  }

  tr.scrollIntoView()
  return tr
}

/**
 * Get the effective selection range for visual mode operations (y, d, c, x).
 * Returns the from/to positions and whether it's a linewise operation.
 */
export function getVisualRange(
  viewState: EditorState,
  state: VimState,
): { from: number; to: number; linewise: boolean } | null {
  if (state.visualMode.anchor === null) return null

  const { from, to } = viewState.selection

  if (state.mode === 'visual-line') {
    return { from, to, linewise: true }
  }

  return { from, to, linewise: false }
}


export function visualMode(view: EditorView, event: KeyboardEvent, state: VimState, commands: VimEditorCommands) {

  switch(event.key) {
    case "v":
    case "V":
    {
      // TODO: Switch between visual and visual-line mode
      state.mode = 'normal'
      state.operators = []
      state.visualMode = {
        anchor: null,
        head: null,
      }

      const head = view.state.selection.head
      view.dispatch(moveCursor(view.state, head))
      return true
    }
    case "y": {
        const range = getVisualRange(view.state, state)
        if (range)
          executeYank(view.state, range.from, range.to, state, range.linewise)

        state.mode = 'normal'
        state.operators = []
        state.visualMode = {
          anchor: null,
          head: null,
        }

        // Position cursor at start of yanked range, using Selection.findFrom for robustness
        const pos = view.state.selection.head
        let cursorPos = range ? range.from : pos
        if (range) {
          try {
            const $from = view.state.doc.resolve(range.from)
            const sel = Selection.findFrom($from, 1, true)
            if (sel) cursorPos = sel.$from.pos
          } catch {
            /* keep cursorPos */
          }
        }
        view.dispatch(moveCursor(view.state, cursorPos))

      return true
    }
    case "x":
    case "d": {
      const range = getVisualRange(view.state, state)
      if (range) {
        const tr = executeDelete(
          view.state,
          range.from,
          range.to,
          state,
          range.linewise,
        )

        state.mode = 'normal'
        state.operators = []
        state.visualMode = {
          anchor: null,
          head: null,
        }

        tr.scrollIntoView()
        view.dispatch(tr)
      }
      return true
    }
    case "c": {
      const range = getVisualRange(view.state, state)
      if (range) {
        const tr = executeChange(
          view.state,
          range.from,
          range.to,
          state,
          range.linewise,
        )

        state.mode = 'normal'
        state.operators = []
        state.visualMode = {
          anchor: null,
          head: null,
        }

        tr.scrollIntoView()
        view.dispatch(tr)
      }
      return true
    }
    default:
      return true
  }
}

