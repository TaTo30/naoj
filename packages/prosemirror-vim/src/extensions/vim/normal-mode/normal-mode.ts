import { EditorView } from "prosemirror-view";

import type { VimEditorCommands, VimOperator, VimState } from "../types";
import { firstNonBlank, lineEndAt, lineStartAt, moveCursor } from "../utils";
import { EditorState, TextSelection, Transaction } from "prosemirror-state";
import { updateVisualSelection } from "../visual-mode/visual-mode";
import { changeLines, deleteLines, executeChange, executeDelete, executeYank, resolveTextObject, yankLines } from "../operators";
import { deleteChar, joinLines, openLineAbove, openLineBelow, pasteFromClipboard, replaceChars } from "../commands";
import { motionDocEnd, motionDocStart, motionDown, motionFindCharBackward, motionFindCharForward, motionFirstNonBlank, motionFirstNonBlankAt, motionFullPageDown, motionFullPageUp, motionHalfPageDown, motionHalfPageUp, motionLeft, motionLineEnd, motionLineStart, motionMatchingBracket, motionParagraphBackward, motionParagraphForward, motionRight, motionTillCharBackward, motionTillCharForward, motionUp, motionWORDBackward, motionWordBackward, motionWORDEnd, motionWordEnd, motionWordEndBackward, motionWORDForward, motionWordForward } from "../motions";

/**
 * Handle operator + motion/text-object combination.
 */
function handleOperatorMotion(
  state: EditorState,
  vimState: VimState,
  from: number,
  to: number,
  linewise: boolean = false,
): Transaction | null {
  const op = vimState.operator
  if (!op) return null

  // Ensure from < to
  const [rangeFrom, rangeTo] = from <= to ? [from, to] : [to, from]

  let tr: Transaction

  switch (op) {
    case "d":
      tr = executeDelete(state, rangeFrom, rangeTo, vimState, linewise)
      break
    case "y":
      executeYank(state, rangeFrom, rangeTo, vimState, linewise)
      tr = state.tr // No document change
      break
    case "c":
      tr = executeChange(state, rangeFrom, rangeTo, vimState, linewise)
      break
    default:
      return null
  }


  vimState.operators = []
  tr.scrollIntoView()
  return tr
}

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
      case "d":
        return motionHalfPageDown(state, pos)
      case "u":
        return motionHalfPageUp(state, pos)
      case "f":
        return motionFullPageDown(state, pos)
      case "b":
        return motionFullPageUp(state, pos)
      default:
        return null
    }
  }

  switch (key) {
    case "h":
      return applyMotionNTimes(state, pos, count, motionLeft)
    case "l":
      return applyMotionNTimes(state, pos, count, motionRight)
    case "j": {
      let current = pos
      for (let i = 0; i < count; i++) {
        current = motionDown(state, current, goalColumn)
      }
      return current
    }
    case "k": {
      let current = pos
      for (let i = 0; i < count; i++) {
        current = motionUp(state, current, goalColumn)
      }
      return current
    }
    case "0":
      return motionLineStart(state, pos)
    case "^":
      return motionFirstNonBlank(state)
    case "$":
      return motionLineEnd(state, pos)
    case "G":
      return motionDocEnd(state)
    case "w":
      return applyMotionNTimes(state, pos, count, motionWordForward)
    case "e":
      return applyMotionNTimes(state, pos, count, motionWordEnd)
    case "b":
      return applyMotionNTimes(state, pos, count, motionWordBackward)
    case "W":
      return applyMotionNTimes(state, pos, count, motionWORDForward)
    case "E":
      return applyMotionNTimes(state, pos, count, motionWORDEnd)
    case "B":
      return applyMotionNTimes(state, pos, count, motionWORDBackward)
    case "{":
      return applyMotionNTimes(state, pos, count, motionParagraphBackward)
    case "}":
      return applyMotionNTimes(state, pos, count, motionParagraphForward)
    case "%":
      return motionMatchingBracket(state, pos)
    case "|": {
      const lineS = motionLineStart(state, pos)
      const lineE = motionLineEnd(state, pos)
      return Math.min(lineS + (count - 1), lineE)
    }
    case "+": {
      let cur = pos
      for (let i = 0; i < count; i++) cur = motionDown(state, cur)
      return motionFirstNonBlankAt(state, cur)
    }
    case "-": {
      let cur = pos
      for (let i = 0; i < count; i++) cur = motionUp(state, cur)
      return motionFirstNonBlankAt(state, cur)
    }
    case "_": {
      let cur = pos
      for (let i = 0; i < count - 1; i++) cur = motionDown(state, cur)
      return motionFirstNonBlankAt(state, cur)
    }
    default:
      return null
  }
}

function replayLastAction(
  view: EditorView,
  vimState: VimState,
  commands: VimEditorCommands,
) {
  const action = vimState.lastAction
  if (!action) return

  const state = view.state
  const pos = state.selection.$head.pos
  const count = vimState.count ?? action.count

  switch (action.type) {
    case "command": {
      switch (action.key) {
        case "x": {
          const tr = deleteChar(state, pos, vimState, count)
          view.dispatch(tr)
          break
        }
        case "p": {
          pasteFromClipboard(view, vimState, count, false)
          break
        }
        case "P": {
          pasteFromClipboard(view, vimState, count, true)
          break
        }
        case "r": {
          if (action.replaceChar) {
            const tr = replaceChars(state, pos, action.replaceChar, count)
            view.dispatch(tr)
          }
          break
        }
        case "J": {
          const tr = joinLines(state, pos, count)
          view.dispatch(tr)
          break
        }
        case "D": {
          const endPos = lineEndAt(state, pos)
          if (pos < endPos) {
            const tr = executeDelete(state, pos, endPos, vimState, false)
            view.dispatch(tr)
          }
          break
        }
        case ">>": {
          for (let i = 0; i < count; i++) {
            commands.indent?.()
          }
          break
        }
        case "<<": {
          for (let i = 0; i < count; i++) {
            commands.outdent?.()
          }
          break
        }
      }
      break
    }
    case "operator-linewise": {
      switch (action.operator) {
        case "d": {
          const tr = deleteLines(state, pos, count, vimState)
          tr.scrollIntoView()
          view.dispatch(tr)
          break
        }
        case "c": {
          const tr = changeLines(state, pos, count, vimState)
          tr.scrollIntoView()
          view.dispatch(tr)
          if (action.insertedText) {
            const ns = view.state
            const itr = ns.tr.insertText(
              action.insertedText,
              ns.selection.$head.pos,
            )
            view.dispatch(itr)
            vimState.mode = "normal"
            const fs = view.state
            const fp = fs.selection.$head.pos
            const ls = lineStartAt(fs, fp)
            view.dispatch(moveCursor(fs, fp > ls ? fp - 1 : fp))
          }
          break
        }
      }
      break
    }
    case "operator-motion": {
      if (!action.operator || !action.motion) break

      let targetPos: number | null = null

      if (action.findMotion && action.findChar) {
        let current = pos
        for (let i = 0; i < count; i++) {
          let result: number | null = null
          switch (action.findMotion) {
            case "f":
              result = motionFindCharForward(state, current, action.findChar)
              break
            case "F":
              result = motionFindCharBackward(state, current, action.findChar)
              break
            case "t":
              result = motionTillCharForward(state, current, action.findChar)
              break
            case "T":
              result = motionTillCharBackward(state, current, action.findChar)
              break
          }
          if (result === null) break
          current = result
        }
        targetPos = current !== pos ? current : null
      } else if (action.motion === "gg") {
        targetPos = motionDocStart(state)
      } else {
        targetPos = resolveMotionKey(state, pos, action.motion, count, false)
      }

      if (targetPos !== null) {
        let from = pos
        let to = targetPos
        if (action.findMotion === "f" || action.findMotion === "t") {
          to = targetPos + 1
        } else if (action.findMotion === "F" || action.findMotion === "T") {
          from = targetPos
          to = pos
        } else if (action.motion === "e" || action.motion === "E") {
          to = targetPos + 1
        }

        vimState.operator = action.operator!
        const tr = handleOperatorMotion(state, vimState, from, to, false)
        if (tr) {
          tr.scrollIntoView()
          view.dispatch(tr)
        }

        if (action.operator === "c" && action.insertedText) {
          const ns = view.state
          const itr = ns.tr.insertText(
            action.insertedText,
            ns.selection.$head.pos,
          )
          view.dispatch(itr)
          vimState.mode = "normal"
          const fs = view.state
          const fp = fs.selection.$head.pos
          const ls = lineStartAt(fs, fp)
          view.dispatch(moveCursor(fs, fp > ls ? fp - 1 : fp))
        }
      }
      break
    }
    case "operator-textobject": {
      if (!action.operator || !action.textObject) break

      const result = resolveTextObject(
        state,
        pos,
        action.textObject.type,
        action.textObject.object,
      )
      if (result) {
        vimState.operator = action.operator!
        const tr = handleOperatorMotion(
          state,
          vimState,
          result.from,
          result.to,
          false,
        )
        if (tr) {
          tr.scrollIntoView()
          view.dispatch(tr)
        }

        if (action.operator === "c" && action.insertedText) {
          const ns = view.state
          const itr = ns.tr.insertText(
            action.insertedText,
            ns.selection.$head.pos,
          )
          view.dispatch(itr)
          vimState.mode = "normal"
          const fs = view.state
          const fp = fs.selection.$head.pos
          const ls = lineStartAt(fs, fp)
          view.dispatch(moveCursor(fs, fp > ls ? fp - 1 : fp))
        }
      }
      break
    }
    case "insert-command": {
      switch (action.key) {
        case "o": {
          const tr = openLineBelow(state, pos, vimState)
          view.dispatch(tr)
          break
        }
        case "O": {
          const tr = openLineAbove(state, pos, vimState)
          view.dispatch(tr)
          break
        }
        case "i": {
          vimState.mode = "insert"
          view.dispatch(state.tr)
          break
        }
        case "a": {
          vimState.mode = "insert"
          const newPos = Math.min(pos + 1, lineEndAt(state, pos))
          view.dispatch(moveCursor(state, newPos))
          break
        }
        case "A": {
          vimState.mode = "insert"
          const endPos = lineEndAt(state, pos)
          view.dispatch(moveCursor(state, endPos))
          break
        }
        case "I": {
          vimState.mode = "insert"
          const fnbPos = firstNonBlank(state)
          view.dispatch(moveCursor(state, fnbPos))
          break
        }
        case "C": {
          const endPos = lineEndAt(state, pos)
          if (pos < endPos) {
            const tr = executeChange(state, pos, endPos, vimState, false)
            view.dispatch(tr)
          } else {
            vimState.mode = "insert"
          }
          break
        }
      }
      // Insert the recorded text and return to normal mode
      if (action.insertedText) {
        const ns = view.state
        const itr = ns.tr.insertText(
          action.insertedText,
          ns.selection.$head.pos,
        )
        view.dispatch(itr)
        vimState.mode = "normal"
        const fs = view.state
        const fp = fs.selection.$head.pos
        const ls = lineStartAt(fs, fp)
        view.dispatch(moveCursor(fs, fp > ls ? fp - 1 : fp))
      }
      break
    }
  }
}



export function normalMode(view: EditorView, event: KeyboardEvent, state: VimState, commands: VimEditorCommands): boolean {

  // Clean all pending operators if Escape or Ctrl+C is pressed
  if (event.key === "Escape" || (event.ctrlKey && event.key === "c")) {
    state.operators = []
    view.dispatch(view.state.tr)
    return true
  }

  // Handle pending operators
  if (state.operators.length > 0) {
    const pos = view.state.selection.$head.pos
    const count = state.count ?? 1

    state.operators.push(event.key as VimOperator)
    const fullOperator = state.operators.join("")
    switch (fullOperator) {
      // dd - Delete line
      case "dd": {
        const tr = deleteLines(view.state, pos, count, state)
        state.lastAction = {
          type: "operator-linewise",
          key: "dd",
          count,
          operator: "d",
        }
        tr.scrollIntoView()
        view.dispatch(tr)

        state.operators = []
        return true
      }
      // yy - Yank lines
      case "yy": {
        yankLines(view.state, pos, count, state)

        state.operators = []
        return true
      }
      // cc - Change lines
      case "cc": {
        const tr = changeLines(view.state, pos, count, state)
        tr.scrollIntoView()
        view.dispatch(tr)
        // startInsertTracking(vimState, {
        //   type: "operator-linewise",
        //   key: "cc",
        //   count,
        //   operator: "c",
        // })
        return true
      }
      // gg - Move to top of document
      case "gg": {
        const targetPos = motionDocStart(view.state)
        const tr = handleOperatorMotion(view.state, state, pos, targetPos, false)
        if (tr) view.dispatch(tr)
      }
      // ge - Move to end of previous word
      case "ge": {
        let cur = pos
        const count = state.count ?? 1
        for (let i = 0; i < count; i++) cur = motionWordEndBackward(view.state, cur)
        const targetPos = cur + 1
        const tr = handleOperatorMotion(view.state, state, pos, targetPos, false)
        if (tr) view.dispatch(tr)
      }
    }
  }

  // Handle all normal mode commands
  switch (event.key) {
    // Insert mode. TODO: track insert mode for repeatable actions.
    case "i": {
      state.mode = "insert";
      state.operators = [];
      state.insertMode =  {
        isTrackingInsert: true,
        insertTextBuffer: "",
      }
      state.lastAction = {
        type: "insert-command",
        key: "i",
        count: 1,
      }

      view.dispatch(view.state.tr)
      return true;
    }
    case "I": {
      state.mode = "insert";
      state.operators = [];
      state.insertMode =  {
        isTrackingInsert: true,
        insertTextBuffer: "",
      }
      state.lastAction = {
        type: "insert-command",
        key: "I",
        count: 1,
      }

      const fnbPos = firstNonBlank(view.state)
      view.dispatch(moveCursor(view.state, fnbPos))

      return true
    }
    case "a": {
      state.mode = "insert";
      state.operators = [];
      state.insertMode =  {
        isTrackingInsert: true,
        insertTextBuffer: "",
      }
      state.lastAction = {
        type: "insert-command",
        key: "a",
        count: 1,
      }

      const pos = view.state.selection.$head.pos
      const newPos = Math.min(pos + 1, lineEndAt(view.state, pos))
      view.dispatch(moveCursor(view.state, newPos))

      return true
    }
    case "A": {
      state.mode = "insert"
      state.operators = []
      state.insertMode =  {
        isTrackingInsert: true,
        insertTextBuffer: "",
      }
      state.lastAction = {
        type: "insert-command",
        key: "A",
        count: 1,
      }

      const pos = view.state.selection.$head.pos
      const endPos = lineEndAt(view.state, pos)
      view.dispatch(moveCursor(view.state, endPos))

      return true
    }
    case "o": {
      state.mode = "insert"
      state.operators = []
      state.insertMode =  {
        isTrackingInsert: true,
        insertTextBuffer: "",
      }
      state.lastAction = {
        type: "insert-command",
        key: "o",
        count: 1,
      }

      const pos = view.state.selection.$head.pos
      const tr = openLineBelow(view.state, pos, state)
      view.dispatch(tr)

      return true
    }
    case "O": {
      state.mode = "insert"
      state.operators = []
      state.insertMode =  {
        isTrackingInsert: true,
        insertTextBuffer: "",
      }
      state.lastAction = {
        type: "insert-command",
        key: "O",
        count: 1,
      }

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

      state.lastAction = { type: "command", key: "D", count: 1 }
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
      state.insertMode =  {
        isTrackingInsert: true,
        insertTextBuffer: "",
      }
      state.lastAction = {
        type: "insert-command",
        key: "C",
        count: 1,
      }

      return true
    }



    // Cursorwise shortcuts
    case "x": { // Delete character under cursor
      const pos = view.state.selection.$head.pos
      const count = state.count ?? 1
      const tr = deleteChar(view.state, pos, state, count)
      view.dispatch(tr)

      state.lastAction = { type: "command", key: "x", count }
      state.operators = []
      return true
    }
    case "P": // Paste from clipboard
    case "p":
    {
      const count = state.count ?? 1
      pasteFromClipboard(view, state, count, false)

      state.lastAction = { type: "command", key: "p", count }
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
          const $pos = view.state.doc.resolve(pos)
          state.goalColumn = pos - $pos.start($pos.depth)
        } catch {
          state.goalColumn = 0
        }
      }
      const savedGoal = state.goalColumn
      const targetPos = resolveMotionKey(
        view.state,
        pos,
        event.key,
        count,
        false,
        savedGoal,
      )
      if (targetPos !== null) {
        view.dispatch(moveCursor(view.state, targetPos))
      }

      state.operators = []
      state.goalColumn = savedGoal
      return true
    }
    case "h":
    case "l":
    case "^":
    case "$":
    case "w":
    case "e":
    case "b":
    case "W":
    case "E":
    case "B":
    case "{":
    case "}":
    case "%":
    case "|":
    case "+":
    case "-":
    case "_": {
      const count = state.count ?? 1
      const pos = view.state.selection.$head.pos
      const targetPos = resolveMotionKey(view.state, pos, event.key, count, false)

      if (targetPos !== null) {
        view.dispatch(moveCursor(view.state, targetPos))
      }

      state.operators = []
      return true
    }
    case "0": {
      // 0 is motion to line start (only when not part of a count)
      const pos = view.state.selection.$head.pos
      const targetPos = motionLineStart(view.state, pos)
      view.dispatch(moveCursor(view.state, targetPos))

      state.operators = []
      return true
    }
    case "G": {
      const targetPos = motionDocEnd(view.state)
      view.dispatch(moveCursor(view.state, targetPos))

      state.operators = []
      return true
    }


    // Operators
    case "g": // gg - move to top of document
    case "d": // dd - delete line
    case "y": // yank operators
    case "c": // cc - change operators
    case "r": // replace a single character
    case ">": // >> - indent operator
    case "<": // << - outdent operator
    {
      state.operators = [event.key]
      return true
    }



    // Dot repeat
    case ".": {
      if (state.lastAction) {
        replayLastAction(view, state, commands)
      }

      state.operators = []
      return true
    }
  }

  return true;
}
