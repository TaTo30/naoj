import { EditorView } from "prosemirror-view";

import type { VimEditorCommands } from "../types";
import { firstNonBlank, lineEndAt, moveCursor } from "../utils";
import { EditorState, TextSelection } from "prosemirror-state";
import { updateVisualSelection } from "../visual-mode/visual-mode";
import { executeChange, executeDelete, executeYank } from "../operators";
import { deleteChar, openLineAbove, openLineBelow, pasteFromClipboard } from "../commands";
import { motionDocEnd, motionDown, motionFirstNonBlank, motionFirstNonBlankAt, motionFullPageDown, motionFullPageUp, motionHalfPageDown, motionHalfPageUp, motionLeft, motionLineEnd, motionLineStart, motionMatchingBracket, motionParagraphBackward, motionParagraphForward, motionRight, motionUp, motionWORDBackward, motionWordBackward, motionWORDEnd, motionWordEnd, motionWORDForward, motionWordForward } from "../motions";

/**
 * Apply a motion N times, returning the final position.
 */
function applyMotionNTimes(
  state: EditorState,
  pos: number,
  count: number,
  motionFn: (state: EditorState, pos: number) => number,
): number {
  let current = pos
  for (let i = 0; i < count; i++) {
    current = motionFn(state, current)
  }
  return current
}

/**
 * Process a motion key and return the new position (or null if not a motion key).
 */
function resolveMotionKey(
  state: EditorState,
  pos: number,
  key: string,
  count: number,
  ctrlKey: boolean,
  goalColumn?: number,
): number | null {
  if (ctrlKey) {
    switch (key) {
      case 'd':
        return motionHalfPageDown(state, pos)
      case 'u':
        return motionHalfPageUp(state, pos)
      case 'f':
        return motionFullPageDown(state, pos)
      case 'b':
        return motionFullPageUp(state, pos)
      default:
        return null
    }
  }

  switch (key) {
    case 'h':
      return applyMotionNTimes(state, pos, count, motionLeft)
    case 'l':
      return applyMotionNTimes(state, pos, count, motionRight)
    case 'j': {
      let current = pos
      for (let i = 0; i < count; i++) {
        current = motionDown(state, current, goalColumn)
      }
      return current
    }
    case 'k': {
      let current = pos
      for (let i = 0; i < count; i++) {
        current = motionUp(state, current, goalColumn)
      }
      return current
    }
    case '0':
      return motionLineStart(state, pos)
    case '^':
      return motionFirstNonBlank(state)
    case '$':
      return motionLineEnd(state, pos)
    case 'G':
      return motionDocEnd(state)
    case 'w':
      return applyMotionNTimes(state, pos, count, motionWordForward)
    case 'e':
      return applyMotionNTimes(state, pos, count, motionWordEnd)
    case 'b':
      return applyMotionNTimes(state, pos, count, motionWordBackward)
    case 'W':
      return applyMotionNTimes(state, pos, count, motionWORDForward)
    case 'E':
      return applyMotionNTimes(state, pos, count, motionWORDEnd)
    case 'B':
      return applyMotionNTimes(state, pos, count, motionWORDBackward)
    case '{':
      return applyMotionNTimes(state, pos, count, motionParagraphBackward)
    case '}':
      return applyMotionNTimes(state, pos, count, motionParagraphForward)
    case '%':
      return motionMatchingBracket(state, pos)
    case '|': {
      const lineS = motionLineStart(state, pos)
      const lineE = motionLineEnd(state, pos)
      return Math.min(lineS + (count - 1), lineE)
    }
    case '+': {
      let cur = pos
      for (let i = 0; i < count; i++) cur = motionDown(state, cur)
      return motionFirstNonBlankAt(state, cur)
    }
    case '-': {
      let cur = pos
      for (let i = 0; i < count; i++) cur = motionUp(state, cur)
      return motionFirstNonBlankAt(state, cur)
    }
    case '_': {
      let cur = pos
      for (let i = 0; i < count - 1; i++) cur = motionDown(state, cur)
      return motionFirstNonBlankAt(state, cur)
    }
    default:
      return null
  }
}

export function normalMode(view: EditorView, event: KeyboardEvent, state: state, commands: VimEditorCommands): boolean {
  switch (event.key) {
    // Insert mode. TODO: track insert mode for repeatable actions.
    case "i": {
      state.mode = "insert";
      state.operators = [];

      view.dispatch(view.state.tr)

      return true;
    }
    case "I": {
      state.mode = "insert";
      state.operators = [];

      const fnbPos = firstNonBlank(view.state)
      view.dispatch(moveCursor(view.state, fnbPos))

      return true
    }
    case "a": {
      state.mode = "insert";
      state.operators = [];

      const pos = view.state.selection.$head.pos
      const newPos = Math.min(pos + 1, lineEndAt(view.state, pos))
      view.dispatch(moveCursor(view.state, newPos))

      return true
    }
    case 'A': {
      state.mode = 'insert'
      state.operators = []

      const pos = view.state.selection.$head.pos
      const endPos = lineEndAt(view.state, pos)
      view.dispatch(moveCursor(view.state, endPos))

      return true
    }
    case 'o': {
      state.mode = 'insert'
      state.operators = []

      const pos = view.state.selection.$head.pos
      const tr = openLineBelow(view.state, pos, state)
      view.dispatch(tr)

      return true
    }
    case 'O': {
      state.mode = 'insert'
      state.operators = []

      const pos = view.state.selection.$head.pos
      const tr = openLineAbove(view.state, pos, state)
      view.dispatch(tr)

      return true
    }



    // Visual mode commands
    case "v": {
      state.mode = "visual";
      state.operators = [];

      // Set the initial selection in the current cursor position
      const pos = view.state.selection.$head.pos
      const tr = view.state.tr
      state.visualMode = {
        anchor: pos,
        head: pos,
      }

      try {
        tr.setSelection(
          TextSelection.create(
            tr.doc,
            pos,
            Math.min(pos + 1, view.state.doc.content.size),
          ),
        )
      } catch {
        // leave as-is
      }

      view.dispatch(tr)
      return true
    }
    case "V": {
      state.mode = "visual-line";
      state.operators = [];

      const pos = view.state.selection.$head.pos
      state.visualMode = {
        anchor: pos,
        head: pos,
      }
      // TODO: Check if transaction work fine
      updateVisualSelection(view.state, view.state.tr, state, pos)
      view.dispatch(view.state.tr)
      return true
    }



    // Linewise shortcuts
    case "D": { // Delete to end of line
      const pos = view.state.selection.$head.pos
      const endPos = lineEndAt(view.state, pos)
      if (pos < endPos) {
        const tr = executeDelete(view.state, pos, endPos, state, false)
        view.dispatch(tr)
      }

      state.lastAction = { type: 'command', key: 'D', count: 1 }
      state.operators = []
      return true
    }
    case "Y": { // Yank to end of line
      const pos = view.state.selection.$head.pos
      const endPos = lineEndAt(view.state, pos)
      executeYank(view.state, pos, endPos, state, false)

      state.operators = []
      return true
    }
    case "C": { // Change to end of line
      const pos = view.state.selection.$head.pos
      const endPos = lineEndAt(view.state, pos)
      if (pos < endPos) {
        // TODO: Check this method
        const tr = executeChange(view.state, pos, endPos, state, false)
        view.dispatch(tr)
      }

      state.mode = "insert"
      state.operators = []
      return true
    }



    // Cursorwise shortcuts
    case 'x': { // Delete character under cursor
      const pos = view.state.selection.$head.pos
      const count = state.count ?? 1
      const tr = deleteChar(view.state, pos, state, count)
      view.dispatch(tr)

      state.lastAction = { type: 'command', key: 'x', count }
      state.operators = []
      return true
    }
    case 'P': // Paste from clipboard
    case 'p':
    {
      const count = state.count ?? 1
      pasteFromClipboard(view, state, count, false)

      state.lastAction = { type: 'command', key: 'p', count }
      state.operators = []
      return true
    }
    case "u": { // Undo
      const count = state.count ?? 1
      for (let i = 0; i < count; i++)
        commands.undo()

      state.operators = []
      return true
    }


    // Motions
    case "j":
    case "k": {
      const count = state.count ?? 1
      const pos = view.state.selection.$head.pos

      if (state.goalColumn === null) {
        try {
          const $pos = state.doc.resolve(pos)
          state.goalColumn = pos - $pos.start($pos.depth)
        } catch {
          state.goalColumn = 0
        }
      }
      const savedGoal = state.goalColumn
      const targetPos = resolveMotionKey(
        state,
        pos,
        event.key,
        count,
        false,
        savedGoal,
      )
      if (targetPos !== null) {
        view.dispatch(moveCursor(state, targetPos))
      }
      clearPendingState(state)
      state.goalColumn = savedGoal
      return true
    }
    case 'h':
    case 'l':
    case '^':
    case '$':
    case 'w':
    case 'e':
    case 'b':
    case 'W':
    case 'E':
    case 'B':
    case '{':
    case '}':
    case '%':
    case '|':
    case '+':
    case '-':
    case '_': {
      const targetPos = resolveMotionKey(state, pos, key, count, false)
      if (targetPos !== null) {
        view.dispatch(moveCursor(state, targetPos))
      }
      clearPendingState(state)
      return true
    }
    case '0': {
      // 0 is motion to line start (only when not part of a count)
      const targetPos = motionLineStart(state, pos)
      view.dispatch(moveCursor(state, targetPos))
      clearPendingState(state)
      return true
    }
    case 'G': {
      const targetPos = motionDocEnd(state)
      view.dispatch(moveCursor(state, targetPos))
      clearPendingState(state)
      return true
    }
  }



  return true;
}
