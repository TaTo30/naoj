import {
  EditorState,
  Transaction,
  TextSelection,
  Selection,
} from 'prosemirror-state'
import { EditorView } from 'prosemirror-view'
import { VimState, VimEditorCommands, RepeatableAction } from './types'
import {
  motionLeft,
  motionRight,
  motionDown,
  motionUp,
  motionLineStart,
  motionFirstNonBlank,
  motionLineEnd,
  motionDocStart,
  motionDocEnd,
  motionWordForward,
  motionWordBackward,
  motionWordEnd,
  motionWORDForward,
  motionWORDBackward,
  motionWORDEnd,
  motionWordEndBackward,
  motionFirstNonBlankAt,
  motionLastNonBlankAt,
  motionParagraphForward,
  motionParagraphBackward,
  motionMatchingBracket,
  motionFindCharForward,
  motionFindCharBackward,
  motionTillCharForward,
  motionTillCharBackward,
  motionHalfPageDown,
  motionHalfPageUp,
  motionFullPageDown,
  motionFullPageUp,
} from './motions'
import {
  resolveTextObject,
  executeDelete,
  executeYank,
  executeChange,
  deleteLines,
  yankLines,
  changeLines,
} from './operators'
import {
  deleteChar,
  pasteAfter,
  pasteBefore,
  replaceChars,
  openLineBelow,
  openLineAbove,
  joinLines,
} from './commands'
import { updateVisualSelection, getVisualRange } from './visual'
import {
  lineStartAt,
  lineEndAt,
  firstNonBlank,
  findAllMatches,
  findNextMatch,
  findPrevMatch,
  wordUnderCursor,
} from './utils'
import {
  ClipboardContent,
  getLastInternalClipboardContent,
  readSystemClipboardContent,
  setClipboardSerializerFromView,
} from './clipboard'

function clearPendingState(vimState: VimState) {
  vimState.count = null
  vimState.operator = null
  vimState.findPending = false
  vimState.findMotion = null
  vimState.ggPending = false
  vimState.goalColumn = null
  vimState.zzPending = false
  vimState.shiftRightPending = false
  vimState.shiftLeftPending = false
  vimState.markPending = false
  vimState.gotoMarkPending = false
  vimState.replacePendingCount = null
}

function getEffectiveCount(vimState: VimState): number {
  return vimState.count ?? 1
}

function getReplaceInputChar(event: KeyboardEvent): string | null {
  if (event.key === 'Tab') return '\t'
  if (event.key.length === 1 && !event.ctrlKey && !event.metaKey) {
    return event.key
  }
  return null
}

function updateStatus(view: EditorView, vimState: VimState, status: string) {
  vimState.statusMessage = status
  view.dispatch(view.state.tr)
}

function sameClipboardText(a: string, b: string): boolean {
  const normalizeNewlines = (text: string) => text.replace(/\r\n?/g, '\n')
  return normalizeNewlines(a) === normalizeNewlines(b)
}

function pasteFromClipboard(
  view: EditorView,
  vimState: VimState,
  count: number,
  before: boolean,
) {
  const readState = view.state
  const internalClipboard = getLastInternalClipboardContent()
  void readSystemClipboardContent(readState).then((systemClipboard) => {
    let clipboard: ClipboardContent | null = systemClipboard
    if (clipboard === null) {
      clipboard = internalClipboard
      if (clipboard === null) {
        updateStatus(view, vimState, 'clipboard unavailable')
        return
      }
    } else if (
      internalClipboard?.slice &&
      sameClipboardText(clipboard.text, internalClipboard.text)
    ) {
      // Prefer the rich structure from the most recent Vim copy/delete/change
      // whenever the plain text matches. The system read may expose only plain
      // text, or a lossy Markdown-reparsed slice that drops marks (highlight,
      // color, underline) on headings and list items; the internal slice is the
      // lossless source of truth for same-session paste. The comparison ignores
      // line-ending differences because some platforms (e.g. Windows) normalize
      // `\n` to `\r\n` on a clipboard round-trip.
      clipboard = {
        text: clipboard.text,
        linewise: internalClipboard.linewise,
        slice: internalClipboard.slice,
      }
    }

    if (!clipboard.text && !clipboard.slice) return

    const state = view.state
    const pos = state.selection.$head.pos
    const tr = before
      ? pasteBefore(state, pos, clipboard, count)
      : pasteAfter(state, pos, clipboard, count)
    if (tr.docChanged || tr.selectionSet) {
      view.dispatch(tr)
    }
  })
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
 * Move cursor to position, clamping to valid range.
 */
function moveCursor(state: EditorState, pos: number): Transaction {
  const clamped = Math.max(0, Math.min(pos, state.doc.content.size))
  const tr = state.tr
  try {
    tr.setSelection(TextSelection.create(tr.doc, clamped))
  } catch {
    // If position is invalid (e.g. inside a node boundary), try to find nearest valid position
    try {
      const $pos = state.doc.resolve(clamped)
      tr.setSelection(TextSelection.create(tr.doc, $pos.pos))
    } catch {
      // leave selection unchanged
    }
  }
  tr.scrollIntoView()
  return tr
}

/**
 * Find the nearest scrollable ancestor of an element (including the element
 * itself), stopping short of the document body/root so the outer page is never
 * scrolled. The editable element rarely scrolls itself — the surrounding app
 * usually wraps it in an `overflow: auto` container — so `zz`, search, and mark
 * recentering must target that ancestor rather than `view.dom`.
 */
function getScrollableAncestor(el: HTMLElement): HTMLElement | null {
  const doc = el.ownerDocument
  const win = doc.defaultView
  if (!win) return null
  const body = doc.body
  const root = doc.documentElement

  let node: HTMLElement | null = el
  while (node && node !== body && node !== root) {
    const overflowY = win.getComputedStyle(node).overflowY
    if (
      (overflowY === 'auto' ||
        overflowY === 'scroll' ||
        overflowY === 'overlay') &&
      node.scrollHeight > node.clientHeight
    ) {
      return node
    }
    node = node.parentElement
  }
  return null
}

/**
 * Center the cursor vertically within the editor's scroll container.
 * Only adjusts the scroll container — never scrolls the outer page.
 */
function centerCursorInEditor(view: EditorView, pos: number) {
  try {
    const scroller = getScrollableAncestor(view.dom as HTMLElement)
    if (!scroller) return
    const coords = view.coordsAtPos(pos)
    const rect = scroller.getBoundingClientRect()
    const cursorFromTop = coords.top - rect.top
    const centerTarget = scroller.clientHeight / 2
    scroller.scrollTop += cursorFromTop - centerTarget
  } catch {
    // ignore
  }
}

/**
 * Resolve the document position at the top (`H`), middle (`M`), or bottom (`L`)
 * of the visible editor viewport. Uses `posAtCoords`, so it maps a screen point
 * to a document position identically across platforms and browsers.
 */
function screenLinePos(
  view: EditorView,
  where: 'H' | 'M' | 'L',
): number | null {
  try {
    const dom = view.dom as HTMLElement
    const domRect = dom.getBoundingClientRect()
    const scroller = getScrollableAncestor(dom)
    const rect = scroller ? scroller.getBoundingClientRect() : domRect
    const left = domRect.left + Math.min(24, Math.max(1, domRect.width / 2))
    let top: number
    if (where === 'H') top = rect.top + 8
    else if (where === 'L') top = rect.bottom - 8
    else top = rect.top + rect.height / 2
    const clampedTop = Math.min(
      Math.max(top, domRect.top + 1),
      domRect.bottom - 1,
    )
    const coords = view.posAtCoords({ left, top: clampedTop })
    return coords ? coords.pos : null
  } catch {
    return null
  }
}

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
    case 'd':
      tr = executeDelete(state, rangeFrom, rangeTo, vimState, linewise)
      break
    case 'y':
      executeYank(state, rangeFrom, rangeTo, vimState, linewise)
      tr = state.tr // No document change
      break
    case 'c':
      tr = executeChange(state, rangeFrom, rangeTo, vimState, linewise)
      break
    default:
      return null
  }

  clearPendingState(vimState)
  tr.scrollIntoView()
  return tr
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

function reverseFind(motion: 'f' | 'F' | 't' | 'T'): 'f' | 'F' | 't' | 'T' {
  if (motion === 'f') return 'F'
  if (motion === 'F') return 'f'
  if (motion === 't') return 'T'
  return 't'
}

/**
 * Resolve a single find/till repeat (`;`/`,`). For `t`/`T`, skips the current
 * stop so a repeat makes progress instead of staying put.
 */
function findOnce(
  state: EditorState,
  pos: number,
  motion: 'f' | 'F' | 't' | 'T',
  char: string,
): number | null {
  switch (motion) {
    case 'f':
      return motionFindCharForward(state, pos, char)
    case 'F':
      return motionFindCharBackward(state, pos, char)
    case 't': {
      const immediate = motionFindCharForward(state, pos, char)
      const start = immediate !== null && immediate === pos + 1 ? pos + 1 : pos
      const found = motionFindCharForward(state, start, char)
      return found !== null ? found - 1 : null
    }
    case 'T': {
      const immediate = motionFindCharBackward(state, pos, char)
      const start = immediate !== null && immediate === pos - 1 ? pos - 1 : pos
      const found = motionFindCharBackward(state, start, char)
      return found !== null ? found + 1 : null
    }
  }
  return null
}

function repeatFind(
  state: EditorState,
  pos: number,
  motion: 'f' | 'F' | 't' | 'T',
  char: string,
  count: number,
): number | null {
  let current = pos
  for (let i = 0; i < count; i++) {
    const next = findOnce(state, current, motion, char)
    if (next === null) return null
    current = next
  }
  return current
}

function startInsertTracking(vimState: VimState, action: RepeatableAction) {
  vimState.lastAction = action
  vimState.isTrackingInsert = true
  vimState.insertTextBuffer = ''
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
    case 'command': {
      switch (action.key) {
        case 'x': {
          const tr = deleteChar(state, pos, vimState, count)
          view.dispatch(tr)
          break
        }
        case 'p': {
          pasteFromClipboard(view, vimState, count, false)
          break
        }
        case 'P': {
          pasteFromClipboard(view, vimState, count, true)
          break
        }
        case 'r': {
          if (action.replaceChar) {
            const tr = replaceChars(state, pos, action.replaceChar, count)
            view.dispatch(tr)
          }
          break
        }
        case 'J': {
          const tr = joinLines(state, pos, count)
          view.dispatch(tr)
          break
        }
        case 'D': {
          const endPos = lineEndAt(state, pos)
          if (pos < endPos) {
            const tr = executeDelete(state, pos, endPos, vimState, false)
            view.dispatch(tr)
          }
          break
        }
        case '>>': {
          for (let i = 0; i < count; i++) {
            commands.indent?.()
          }
          break
        }
        case '<<': {
          for (let i = 0; i < count; i++) {
            commands.outdent?.()
          }
          break
        }
      }
      break
    }
    case 'operator-linewise': {
      switch (action.operator) {
        case 'd': {
          const tr = deleteLines(state, pos, count, vimState)
          tr.scrollIntoView()
          view.dispatch(tr)
          break
        }
        case 'c': {
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
            vimState.mode = 'normal'
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
    case 'operator-motion': {
      if (!action.operator || !action.motion) break

      let targetPos: number | null = null

      if (action.findMotion && action.findChar) {
        let current = pos
        for (let i = 0; i < count; i++) {
          let result: number | null = null
          switch (action.findMotion) {
            case 'f':
              result = motionFindCharForward(state, current, action.findChar)
              break
            case 'F':
              result = motionFindCharBackward(state, current, action.findChar)
              break
            case 't':
              result = motionTillCharForward(state, current, action.findChar)
              break
            case 'T':
              result = motionTillCharBackward(state, current, action.findChar)
              break
          }
          if (result === null) break
          current = result
        }
        targetPos = current !== pos ? current : null
      } else if (action.motion === 'gg') {
        targetPos = motionDocStart(state)
      } else {
        targetPos = resolveMotionKey(state, pos, action.motion, count, false)
      }

      if (targetPos !== null) {
        let from = pos
        let to = targetPos
        if (action.findMotion === 'f' || action.findMotion === 't') {
          to = targetPos + 1
        } else if (action.findMotion === 'F' || action.findMotion === 'T') {
          from = targetPos
          to = pos
        } else if (action.motion === 'e' || action.motion === 'E') {
          to = targetPos + 1
        }

        vimState.operator = action.operator!
        const tr = handleOperatorMotion(state, vimState, from, to, false)
        if (tr) {
          tr.scrollIntoView()
          view.dispatch(tr)
        }

        if (action.operator === 'c' && action.insertedText) {
          const ns = view.state
          const itr = ns.tr.insertText(
            action.insertedText,
            ns.selection.$head.pos,
          )
          view.dispatch(itr)
          vimState.mode = 'normal'
          const fs = view.state
          const fp = fs.selection.$head.pos
          const ls = lineStartAt(fs, fp)
          view.dispatch(moveCursor(fs, fp > ls ? fp - 1 : fp))
        }
      }
      break
    }
    case 'operator-textobject': {
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

        if (action.operator === 'c' && action.insertedText) {
          const ns = view.state
          const itr = ns.tr.insertText(
            action.insertedText,
            ns.selection.$head.pos,
          )
          view.dispatch(itr)
          vimState.mode = 'normal'
          const fs = view.state
          const fp = fs.selection.$head.pos
          const ls = lineStartAt(fs, fp)
          view.dispatch(moveCursor(fs, fp > ls ? fp - 1 : fp))
        }
      }
      break
    }
    case 'insert-command': {
      switch (action.key) {
        case 'o': {
          const tr = openLineBelow(state, pos, vimState)
          view.dispatch(tr)
          break
        }
        case 'O': {
          const tr = openLineAbove(state, pos, vimState)
          view.dispatch(tr)
          break
        }
        case 'i': {
          vimState.mode = 'insert'
          view.dispatch(state.tr)
          break
        }
        case 'a': {
          vimState.mode = 'insert'
          const newPos = Math.min(pos + 1, lineEndAt(state, pos))
          view.dispatch(moveCursor(state, newPos))
          break
        }
        case 'A': {
          vimState.mode = 'insert'
          const endPos = lineEndAt(state, pos)
          view.dispatch(moveCursor(state, endPos))
          break
        }
        case 'I': {
          vimState.mode = 'insert'
          const fnbPos = firstNonBlank(state)
          view.dispatch(moveCursor(state, fnbPos))
          break
        }
        case 'C': {
          const endPos = lineEndAt(state, pos)
          if (pos < endPos) {
            const tr = executeChange(state, pos, endPos, vimState, false)
            view.dispatch(tr)
          } else {
            vimState.mode = 'insert'
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
        vimState.mode = 'normal'
        const fs = view.state
        const fp = fs.selection.$head.pos
        const ls = lineStartAt(fs, fp)
        view.dispatch(moveCursor(fs, fp > ls ? fp - 1 : fp))
      }
      break
    }
  }
}

/**
 * Main key handler for the vim plugin.
 */
export function handleKeyDown(
  view: EditorView,
  event: KeyboardEvent,
  vimState: VimState,
  commands: VimEditorCommands,
): boolean {
  setClipboardSerializerFromView(view)
  const state = view.state
  // Clear status message from previous action
  vimState.statusMessage = ''
  // In visual modes, use the tracked visual head (not $head.pos which is the exclusive selection end)
  const pos =
    (vimState.mode === 'visual' || vimState.mode === 'visual-line') &&
    vimState.visualHead !== null
      ? vimState.visualHead
      : state.selection.$head.pos
  const key = event.key
  // const ctrlKey = event.ctrlKey || event.metaKey
  const ctrlKey = event.ctrlKey

  // ── SEARCH ACTIVE (typing search query) ──
  if (vimState.searchActive) {
    if (key === 'Escape' || (ctrlKey && key === 'c')) {
      vimState.searchActive = false
      vimState.searchQuery = ''
      view.dispatch(state.tr) // trigger decoration update
      return true
    }
    if (key === 'Enter') {
      vimState.searchActive = false
      vimState.searchTerm = vimState.searchQuery
      vimState.searchQuery = ''
      vimState.searchWholeWord = false
      vimState.searchHighlightsVisible = true
      // Find and go to first match
      const matches = findAllMatches(state, vimState.searchTerm, false)
      if (matches.length > 0) {
        let idx = matches.findIndex((m) => m > pos)
        if (idx === -1) idx = 0 // wrap around
        vimState.statusMessage = `${idx + 1}/${matches.length}`
        view.dispatch(moveCursor(state, matches[idx]))
        centerCursorInEditor(view, matches[idx])
      } else {
        vimState.statusMessage = 'pattern not found'
        view.dispatch(state.tr)
      }
      return true
    }
    if (key === 'Backspace') {
      vimState.searchQuery = vimState.searchQuery.slice(0, -1)
      view.dispatch(state.tr) // trigger decoration update
      return true
    }
    if (key.length === 1 && !ctrlKey) {
      vimState.searchQuery += key
      view.dispatch(state.tr) // trigger decoration update
      return true
    }
    return true // consume all keys in search mode
  }

  // ── REPLACE MODE (R) ──
  if (vimState.mode === 'replace') {
    if (key === 'Escape' || (ctrlKey && key === 'c')) {
      vimState.mode = 'normal'
      clearPendingState(vimState)
      view.dispatch(state.tr)
      return true
    }

    const replaceChar = getReplaceInputChar(event)
    if (replaceChar !== null) {
      const lineE = lineEndAt(state, pos)
      const tr =
        pos < lineE
          ? state.tr.insertText(replaceChar, pos, pos + 1)
          : state.tr.insertText(replaceChar, pos)
      const nextPos = Math.min(pos + replaceChar.length, tr.doc.content.size)
      try {
        tr.setSelection(TextSelection.create(tr.doc, nextPos))
      } catch {
        // leave as-is
      }
      view.dispatch(tr)
      return true
    }

    return false
  }

  // ── INSERT MODE ──
  if (vimState.mode === 'insert') {
    if (key === 'Escape' || (ctrlKey && key === 'c')) {
      vimState.mode = 'normal'
      clearPendingState(vimState)
      // Finalize insert text tracking for dot repeat
      if (vimState.isTrackingInsert && vimState.lastAction) {
        vimState.lastAction.insertedText = vimState.insertTextBuffer
        vimState.isTrackingInsert = false
        vimState.insertTextBuffer = ''
      }
      // Move cursor one left (vim behavior) but don't cross line boundary
      const lineS = lineStartAt(state, pos)
      const newPos = pos > lineS ? pos - 1 : pos
      view.dispatch(moveCursor(state, newPos))
      return true
    }
    // Track backspace for dot repeat
    if (key === 'Backspace' && vimState.isTrackingInsert) {
      vimState.insertTextBuffer = vimState.insertTextBuffer.slice(0, -1)
    }
    return false // Let all other keys pass through in insert mode
  }

  // ── ESC / CTRL-C (normal/visual) ──
  if (key === 'Escape' || (ctrlKey && key === 'c')) {
    if (vimState.mode === 'visual' || vimState.mode === 'visual-line') {
      const restorePos = pos
      vimState.mode = 'normal'
      vimState.visualAnchor = null
      vimState.visualHead = null
      clearPendingState(vimState)
      vimState.searchHighlightsVisible = false
      // Collapse selection to the visual head position
      view.dispatch(moveCursor(state, restorePos))
      return true
    }
    clearPendingState(vimState)
    // Clear search highlights (searchTerm preserved for n/N)
    vimState.searchHighlightsVisible = false
    view.dispatch(state.tr) // trigger decoration update
    return true
  }

  // ── SINGLE REPLACE PENDING (r + char) ──
  if (vimState.replacePendingCount !== null) {
    if (
      key === 'Shift' ||
      key === 'Control' ||
      key === 'Alt' ||
      key === 'Meta'
    ) {
      return true
    }

    const replaceCount = vimState.replacePendingCount
    vimState.replacePendingCount = null

    const replaceChar = getReplaceInputChar(event)
    if (replaceChar === null) {
      clearPendingState(vimState)
      return true
    }

    const tr = replaceChars(state, pos, replaceChar, replaceCount)
    view.dispatch(tr)
    vimState.lastAction = {
      type: 'command',
      key: 'r',
      count: replaceCount,
      replaceChar,
    }
    clearPendingState(vimState)
    return true
  }

  // ── TEXT OBJECT RESOLUTION (when operator + i/a is pending) ──
  if ((vimState as any)._textObjectType) {
    // Ignore modifier-only keys — wait for the actual character
    if (
      key === 'Shift' ||
      key === 'Control' ||
      key === 'Alt' ||
      key === 'Meta'
    ) {
      return true
    }

    const objectType = (vimState as any)._textObjectType as 'i' | 'a'
    delete (vimState as any)._textObjectType
    vimState.findPending = false

    if (key.length !== 1) {
      clearPendingState(vimState)
      return true
    }

    const result = resolveTextObject(state, pos, objectType, key)
    if (result) {
      if (vimState.operator) {
        const savedOp = vimState.operator
        const savedCount = getEffectiveCount(vimState)
        const tr = handleOperatorMotion(
          state,
          vimState,
          result.from,
          result.to,
          false,
        )
        if (tr) view.dispatch(tr)
        // Record lastAction for dot repeat
        if (savedOp !== 'y') {
          const action: RepeatableAction = {
            type: 'operator-textobject',
            key: `${savedOp}${objectType}${key}`,
            count: savedCount,
            operator: savedOp,
            textObject: { type: objectType, object: key },
          }
          if (savedOp === 'c') {
            startInsertTracking(vimState, action)
          } else {
            vimState.lastAction = action
          }
        }
        clearPendingState(vimState)
      } else if (
        vimState.mode === 'visual' ||
        vimState.mode === 'visual-line'
      ) {
        vimState.visualAnchor = result.from
        vimState.visualHead =
          result.to > result.from ? result.to - 1 : result.from
        const tr = state.tr
        try {
          tr.setSelection(TextSelection.create(tr.doc, result.from, result.to))
        } catch {
          // leave as-is
        }
        view.dispatch(tr)
      }
    } else {
      clearPendingState(vimState)
    }
    return true
  }

  // ── FIND PENDING (waiting for char after f/F/t/T) ──
  if (vimState.findPending) {
    // Ignore modifier-only keys — wait for the actual character
    if (
      key === 'Shift' ||
      key === 'Control' ||
      key === 'Alt' ||
      key === 'Meta'
    ) {
      return true
    }

    if (key.length !== 1) {
      clearPendingState(vimState)
      return true
    }

    if (vimState.findMotion) {
      vimState.lastFindMotion = vimState.findMotion
      vimState.lastFindChar = key
    }

    const count = getEffectiveCount(vimState)
    let targetPos: number | null = null

    for (let i = 0; i < count; i++) {
      const searchFrom = targetPos ?? pos
      let result: number | null = null
      switch (vimState.findMotion) {
        case 'f':
          result = motionFindCharForward(state, searchFrom, key)
          break
        case 'F':
          result = motionFindCharBackward(state, searchFrom, key)
          break
        case 't':
          result = motionTillCharForward(state, searchFrom, key)
          break
        case 'T':
          result = motionTillCharBackward(state, searchFrom, key)
          break
      }
      if (result === null) break
      targetPos = result
    }

    if (targetPos !== null) {
      if (vimState.operator) {
        const savedOp = vimState.operator
        const savedFindMotion = vimState.findMotion
        // For forward motions (f/t): range is [pos, targetPos+1)
        // For backward motions (F/T): range is [targetPos, pos)
        let rangeFrom: number, rangeTo: number
        if (vimState.findMotion === 'f' || vimState.findMotion === 't') {
          rangeFrom = pos
          rangeTo = targetPos + 1 // inclusive of the target char for f, pos after t-stop for t
        } else {
          rangeFrom = targetPos
          rangeTo = pos
        }

        const tr = handleOperatorMotion(
          state,
          vimState,
          rangeFrom,
          rangeTo,
          false,
        )
        if (tr) view.dispatch(tr)
        // Record lastAction for dot repeat
        if (savedOp !== 'y') {
          const action: RepeatableAction = {
            type: 'operator-motion',
            key: `${savedOp}${savedFindMotion}${key}`,
            count,
            operator: savedOp,
            motion: savedFindMotion || '',
            findMotion: savedFindMotion || undefined,
            findChar: key,
          }
          if (savedOp === 'c') {
            startInsertTracking(vimState, action)
          } else {
            vimState.lastAction = action
          }
        }
      } else if (
        vimState.mode === 'visual' ||
        vimState.mode === 'visual-line'
      ) {
        const tr = state.tr
        updateVisualSelection(state, tr, vimState, targetPos)
        vimState.visualHead = targetPos
        view.dispatch(tr)
      } else {
        view.dispatch(moveCursor(state, targetPos))
      }
    }

    vimState.findPending = false
    vimState.findMotion = null
    vimState.count = null
    if (!vimState.operator) {
      // operator was already cleared by handleOperatorMotion
    }
    return true
  }

  // ── DIGIT ACCUMULATION ── (skip when waiting for a mark character)
  if (!vimState.markPending && !vimState.gotoMarkPending) {
    if (key >= '1' && key <= '9') {
      vimState.count = (vimState.count ?? 0) * 10 + parseInt(key)
      return true
    }
    if (key === '0' && vimState.count !== null) {
      vimState.count = vimState.count * 10
      return true
    }
  }

  // ── G-PREFIX PENDING (gg, ge, g_) ──
  if (vimState.ggPending) {
    vimState.ggPending = false
    const gCount = getEffectiveCount(vimState)
    let targetPos: number | null = null
    let inclusive = false

    if (key === 'g') {
      targetPos = motionDocStart(state)
    } else if (key === 'e') {
      let cur = pos
      for (let i = 0; i < gCount; i++) cur = motionWordEndBackward(state, cur)
      targetPos = cur
      inclusive = true
    } else if (key === '_') {
      let cur = pos
      for (let i = 0; i < gCount - 1; i++) cur = motionDown(state, cur)
      targetPos = motionLastNonBlankAt(state, cur)
      inclusive = true
    }

    if (targetPos === null) {
      clearPendingState(vimState)
      return true
    }

    if (vimState.operator) {
      const to = inclusive && targetPos >= pos ? targetPos + 1 : targetPos
      const tr = handleOperatorMotion(state, vimState, pos, to, false)
      if (tr) view.dispatch(tr)
    } else if (vimState.mode === 'visual' || vimState.mode === 'visual-line') {
      const tr = state.tr
      updateVisualSelection(state, tr, vimState, targetPos)
      vimState.visualHead = targetPos
      view.dispatch(tr)
    } else {
      view.dispatch(moveCursor(state, targetPos))
    }
    clearPendingState(vimState)
    return true
  }

  // ── ZZ PENDING ──
  if (vimState.zzPending) {
    if (key === 'z') {
      vimState.zzPending = false
      centerCursorInEditor(view, pos)
      clearPendingState(vimState)
      return true
    }
    vimState.zzPending = false
    clearPendingState(vimState)
    return true
  }

  // ── SHIFT RIGHT PENDING (>>) ──
  if (vimState.shiftRightPending) {
    if (key === '>') {
      vimState.shiftRightPending = false
      const indentCount = getEffectiveCount(vimState)
      for (let i = 0; i < indentCount; i++) {
        commands.indent?.()
      }
      vimState.lastAction = { type: 'command', key: '>>', count: indentCount }
      clearPendingState(vimState)
      return true
    }
    vimState.shiftRightPending = false
    clearPendingState(vimState)
    return true
  }

  // ── SHIFT LEFT PENDING (<<) ──
  if (vimState.shiftLeftPending) {
    if (key === '<') {
      vimState.shiftLeftPending = false
      const outdentCount = getEffectiveCount(vimState)
      for (let i = 0; i < outdentCount; i++) {
        commands.outdent?.()
      }
      vimState.lastAction = { type: 'command', key: '<<', count: outdentCount }
      clearPendingState(vimState)
      return true
    }
    vimState.shiftLeftPending = false
    clearPendingState(vimState)
    return true
  }

  // ── MARK PENDING (m + char) ──
  if (vimState.markPending) {
    // Ignore modifier-only keys
    if (
      key === 'Shift' ||
      key === 'Control' ||
      key === 'Alt' ||
      key === 'Meta'
    ) {
      return true
    }
    if (key.length === 1 && /[a-zA-Z0-9]/.test(key)) {
      vimState.marks[key] = pos
      vimState.statusMessage = `mark ${key} set`
    }
    vimState.markPending = false
    clearPendingState(vimState)
    view.dispatch(state.tr) // trigger status update
    return true
  }

  // ── GOTO MARK PENDING (' + char) ──
  if (vimState.gotoMarkPending) {
    // Ignore modifier-only keys
    if (
      key === 'Shift' ||
      key === 'Control' ||
      key === 'Alt' ||
      key === 'Meta'
    ) {
      return true
    }
    if (key.length === 1 && /[a-zA-Z0-9]/.test(key)) {
      const markPos = vimState.marks[key]
      if (markPos !== undefined) {
        const clampedPos = Math.min(markPos, state.doc.content.size)
        vimState.statusMessage = `mark ${key}`
        if (vimState.operator) {
          const tr = handleOperatorMotion(
            state,
            vimState,
            pos,
            clampedPos,
            false,
          )
          if (tr) view.dispatch(tr)
        } else {
          view.dispatch(moveCursor(state, clampedPos))
          centerCursorInEditor(view, clampedPos)
        }
      } else {
        vimState.statusMessage = `mark ${key} not set`
        view.dispatch(state.tr) // trigger status update
      }
    }
    vimState.gotoMarkPending = false
    clearPendingState(vimState)
    return true
  }

  // ── OPERATOR PENDING or VISUAL: i/a starts text object ──
  if (
    (vimState.operator ||
      vimState.mode === 'visual' ||
      vimState.mode === 'visual-line') &&
    (key === 'i' || key === 'a')
  ) {
    ;(vimState as any)._textObjectType = key as 'i' | 'a'
    return true
  }

  // ── NORMAL + VISUAL MODE DISPATCH ──
  const count = getEffectiveCount(vimState)

  // ── CTRL key combinations ──
  if (ctrlKey) {
    switch (key) {
      case 'r': {
        // Redo
        for (let i = 0; i < count; i++) {
          commands.redo()
        }
        clearPendingState(vimState)
        return true
      }
      case 'd':
      case 'u':
      case 'f':
      case 'b': {
        const targetPos = resolveMotionKey(state, pos, key, count, true)
        if (targetPos !== null) {
          if (vimState.mode === 'visual' || vimState.mode === 'visual-line') {
            const tr = state.tr
            updateVisualSelection(state, tr, vimState, targetPos)
            vimState.visualHead = targetPos
            view.dispatch(tr)
          } else {
            view.dispatch(moveCursor(state, targetPos))
          }
        }
        clearPendingState(vimState)
        return true
      }
      case 'c': {
        // Ctrl-C acts as escape
        return false // Already handled above
      }
    }
    return false
  }

  // ── VISUAL MODE operations ──
  if (vimState.mode === 'visual' || vimState.mode === 'visual-line') {
    switch (key) {
      case 'v': {
        if (vimState.mode === 'visual') {
          // Toggle off visual mode
          vimState.mode = 'normal'
          vimState.visualAnchor = null
          vimState.visualHead = null
          view.dispatch(moveCursor(state, pos))
        } else {
          // Switch from visual-line to characterwise visual
          vimState.mode = 'visual'
          const tr = state.tr
          updateVisualSelection(state, tr, vimState, pos)
          view.dispatch(tr)
        }
        clearPendingState(vimState)
        return true
      }
      case 'V': {
        if (vimState.mode === 'visual-line') {
          // Toggle off visual-line mode
          vimState.mode = 'normal'
          vimState.visualAnchor = null
          vimState.visualHead = null
          view.dispatch(moveCursor(state, pos))
        } else {
          // Switch to visual-line from characterwise
          vimState.mode = 'visual-line'
          const tr = state.tr
          updateVisualSelection(state, tr, vimState, pos)
          view.dispatch(tr)
        }
        clearPendingState(vimState)
        return true
      }
      case 'y': {
        const range = getVisualRange(state, vimState)
        if (range) {
          executeYank(state, range.from, range.to, vimState, range.linewise)
        }
        vimState.mode = 'normal'
        vimState.visualAnchor = null
        vimState.visualHead = null
        // Position cursor at start of yanked range, using Selection.findFrom for robustness
        let cursorPos = range ? range.from : pos
        if (range) {
          try {
            const $from = state.doc.resolve(range.from)
            const sel = Selection.findFrom($from, 1, true)
            if (sel) cursorPos = sel.$from.pos
          } catch {
            /* keep cursorPos */
          }
        }
        view.dispatch(moveCursor(state, cursorPos))
        clearPendingState(vimState)
        return true
      }
      case 'd':
      case 'x': {
        const range = getVisualRange(state, vimState)
        if (range) {
          const tr = executeDelete(
            state,
            range.from,
            range.to,
            vimState,
            range.linewise,
          )
          vimState.mode = 'normal'
          vimState.visualAnchor = null
          vimState.visualHead = null
          clearPendingState(vimState)
          tr.scrollIntoView()
          view.dispatch(tr)
        }
        return true
      }
      case 'c': {
        const range = getVisualRange(state, vimState)
        if (range) {
          const tr = executeChange(
            state,
            range.from,
            range.to,
            vimState,
            range.linewise,
          )
          vimState.visualAnchor = null
          vimState.visualHead = null
          clearPendingState(vimState)
          tr.scrollIntoView()
          view.dispatch(tr)
        }
        return true
      }
      default: {
        // Try as motion — prepare goalColumn for j/k
        if (key === 'j' || key === 'k') {
          if (vimState.goalColumn === null) {
            try {
              const $pos = state.doc.resolve(pos)
              vimState.goalColumn = pos - $pos.start($pos.depth)
            } catch {
              vimState.goalColumn = 0
            }
          }
        }
        const savedGoal =
          key === 'j' || key === 'k' ? vimState.goalColumn : null
        const targetPos = resolveMotionKey(
          state,
          pos,
          key,
          count,
          false,
          vimState.goalColumn ?? undefined,
        )
        if (targetPos !== null) {
          const tr = state.tr
          updateVisualSelection(state, tr, vimState, targetPos)
          vimState.visualHead = targetPos
          view.dispatch(tr)
          clearPendingState(vimState)
          vimState.goalColumn = savedGoal
          return true
        }

        // gg motion
        if (key === 'g') {
          vimState.ggPending = true
          return true
        }

        // f/F/t/T
        if (key === 'f' || key === 'F' || key === 't' || key === 'T') {
          vimState.findPending = true
          vimState.findMotion = key
          return true
        }

        // ; , repeat last find
        if (key === ';' || key === ',') {
          if (vimState.lastFindMotion && vimState.lastFindChar) {
            const motion =
              key === ';'
                ? vimState.lastFindMotion
                : reverseFind(vimState.lastFindMotion)
            const repeatPos = repeatFind(
              state,
              pos,
              motion,
              vimState.lastFindChar,
              count,
            )
            if (repeatPos !== null) {
              const tr = state.tr
              updateVisualSelection(state, tr, vimState, repeatPos)
              vimState.visualHead = repeatPos
              view.dispatch(tr)
            }
          }
          return true
        }

        // H/M/L screen motions
        if (key === 'H' || key === 'M' || key === 'L') {
          const screenPos = screenLinePos(view, key)
          if (screenPos !== null) {
            const tr = state.tr
            updateVisualSelection(state, tr, vimState, screenPos)
            vimState.visualHead = screenPos
            view.dispatch(tr)
          }
          return true
        }
      }
    }
    return true // Consume all keys in visual mode
  }

  // ── NORMAL MODE DISPATCH ──

  // Operator pending mode: doubled operator = linewise
  if (vimState.operator) {
    if (key === vimState.operator) {
      // dd, yy, cc — linewise operation
      switch (vimState.operator) {
        case 'd': {
          const tr = deleteLines(state, pos, count, vimState)
          vimState.lastAction = {
            type: 'operator-linewise',
            key: 'dd',
            count,
            operator: 'd',
          }
          clearPendingState(vimState)
          tr.scrollIntoView()
          view.dispatch(tr)
          return true
        }
        case 'y': {
          yankLines(state, pos, count, vimState)
          clearPendingState(vimState)
          return true
        }
        case 'c': {
          const tr = changeLines(state, pos, count, vimState)
          clearPendingState(vimState)
          tr.scrollIntoView()
          view.dispatch(tr)
          startInsertTracking(vimState, {
            type: 'operator-linewise',
            key: 'cc',
            count,
            operator: 'c',
          })
          return true
        }
      }
    }

    // Operator + motion — prepare goalColumn for j/k
    const savedOp = vimState.operator
    if (key === 'j' || key === 'k') {
      if (vimState.goalColumn === null) {
        try {
          const $pos = state.doc.resolve(pos)
          vimState.goalColumn = pos - $pos.start($pos.depth)
        } catch {
          vimState.goalColumn = 0
        }
      }
    }
    const targetPos = resolveMotionKey(
      state,
      pos,
      key,
      count,
      false,
      vimState.goalColumn ?? undefined,
    )
    if (targetPos !== null) {
      let from = pos
      let to = targetPos

      // For $ motion with operator, include the end position
      if (key === '$') {
        to = targetPos
      }

      // For w motion with operator, the range is from cursor to target
      if (key === 'w') {
        to = targetPos
      }

      // e/E are inclusive of the word's last character
      if (key === 'e' || key === 'E') {
        to = targetPos + 1
      }

      // % is inclusive of the matched bracket, in either direction
      if (key === '%') {
        if (targetPos >= pos) {
          to = targetPos + 1
        } else {
          from = pos + 1
          to = targetPos
        }
      }

      const tr = handleOperatorMotion(state, vimState, from, to, false)
      if (tr) view.dispatch(tr)
      // Record lastAction for dot repeat
      if (savedOp && savedOp !== 'y') {
        const action: RepeatableAction = {
          type: 'operator-motion',
          key: `${savedOp}${key}`,
          count,
          operator: savedOp,
          motion: key,
        }
        if (savedOp === 'c') {
          startInsertTracking(vimState, action)
        } else {
          vimState.lastAction = action
        }
      }
      return true
    }

    // Operator + gg
    if (key === 'g') {
      vimState.ggPending = true
      return true
    }

    // Operator + f/F/t/T
    if (key === 'f' || key === 'F' || key === 't' || key === 'T') {
      vimState.findPending = true
      vimState.findMotion = key
      return true
    }

    // Operator + text object (i/a already handled above)
    return true
  }

  // ── Normal mode key dispatch ──
  switch (key) {
    // Mode switching
    case 'i': {
      vimState.mode = 'insert'
      clearPendingState(vimState)
      view.dispatch(state.tr) // Trigger view update for mode change
      startInsertTracking(vimState, {
        type: 'insert-command',
        key: 'i',
        count: 1,
      })
      return true
    }
    case 'I': {
      vimState.mode = 'insert'
      const fnbPos = firstNonBlank(state)
      view.dispatch(moveCursor(state, fnbPos))
      clearPendingState(vimState)
      startInsertTracking(vimState, {
        type: 'insert-command',
        key: 'I',
        count: 1,
      })
      return true
    }
    case 'a': {
      vimState.mode = 'insert'
      // Move cursor one right (after current char)
      const newPos = Math.min(pos + 1, lineEndAt(state, pos))
      view.dispatch(moveCursor(state, newPos))
      clearPendingState(vimState)
      startInsertTracking(vimState, {
        type: 'insert-command',
        key: 'a',
        count: 1,
      })
      return true
    }
    case 'A': {
      vimState.mode = 'insert'
      const endPos = lineEndAt(state, pos)
      view.dispatch(moveCursor(state, endPos))
      clearPendingState(vimState)
      startInsertTracking(vimState, {
        type: 'insert-command',
        key: 'A',
        count: 1,
      })
      return true
    }
    case 'v': {
      vimState.mode = 'visual'
      vimState.visualAnchor = pos
      vimState.visualHead = pos
      clearPendingState(vimState)
      // Set initial selection (single character)
      const tr = state.tr
      try {
        tr.setSelection(
          TextSelection.create(
            tr.doc,
            pos,
            Math.min(pos + 1, state.doc.content.size),
          ),
        )
      } catch {
        // leave as-is
      }
      view.dispatch(tr)
      return true
    }
    case 'V': {
      vimState.mode = 'visual-line'
      vimState.visualAnchor = pos
      vimState.visualHead = pos
      clearPendingState(vimState)
      const tr = state.tr
      updateVisualSelection(state, tr, vimState, pos)
      view.dispatch(tr)
      return true
    }

    // Operators
    case 'd': {
      vimState.operator = 'd'
      return true
    }
    case 'y': {
      vimState.operator = 'y'
      return true
    }
    case 'c': {
      vimState.operator = 'c'
      return true
    }

    // Linewise shortcuts
    case 'D': {
      // Delete to end of line
      const endPos = lineEndAt(state, pos)
      if (pos < endPos) {
        const tr = executeDelete(state, pos, endPos, vimState, false)
        view.dispatch(tr)
      }
      vimState.lastAction = { type: 'command', key: 'D', count: 1 }
      clearPendingState(vimState)
      return true
    }
    case 'Y': {
      // Yank to end of line
      const endPos = lineEndAt(state, pos)
      executeYank(state, pos, endPos, vimState, false)
      clearPendingState(vimState)
      return true
    }
    case 'C': {
      // Change to end of line
      const endPos = lineEndAt(state, pos)
      if (pos < endPos) {
        const tr = executeChange(state, pos, endPos, vimState, false)
        view.dispatch(tr)
      } else {
        vimState.mode = 'insert'
      }
      clearPendingState(vimState)
      startInsertTracking(vimState, {
        type: 'insert-command',
        key: 'C',
        count: 1,
      })
      return true
    }

    // Editing commands
    case 'x': {
      const tr = deleteChar(state, pos, vimState, count)
      view.dispatch(tr)
      vimState.lastAction = { type: 'command', key: 'x', count }
      clearPendingState(vimState)
      return true
    }
    case 'p': {
      pasteFromClipboard(view, vimState, count, false)
      vimState.lastAction = { type: 'command', key: 'p', count }
      clearPendingState(vimState)
      return true
    }
    case 'P': {
      pasteFromClipboard(view, vimState, count, true)
      vimState.lastAction = { type: 'command', key: 'P', count }
      clearPendingState(vimState)
      return true
    }
    case 'r': {
      const replaceCount = count
      clearPendingState(vimState)
      vimState.replacePendingCount = replaceCount
      return true
    }
    case 'R': {
      vimState.mode = 'replace'
      clearPendingState(vimState)
      view.dispatch(state.tr)
      return true
    }
    case 'o': {
      const tr = openLineBelow(state, pos, vimState)
      view.dispatch(tr)
      clearPendingState(vimState)
      startInsertTracking(vimState, {
        type: 'insert-command',
        key: 'o',
        count: 1,
      })
      return true
    }
    case 'O': {
      const tr = openLineAbove(state, pos, vimState)
      view.dispatch(tr)
      clearPendingState(vimState)
      startInsertTracking(vimState, {
        type: 'insert-command',
        key: 'O',
        count: 1,
      })
      return true
    }
    case 'J': {
      const tr = joinLines(state, pos, count)
      view.dispatch(tr)
      vimState.lastAction = { type: 'command', key: 'J', count }
      clearPendingState(vimState)
      return true
    }

    // Undo
    case 'u': {
      for (let i = 0; i < count; i++) {
        commands.undo()
      }
      clearPendingState(vimState)
      return true
    }

    // Motions
    case 'j':
    case 'k': {
      if (vimState.goalColumn === null) {
        try {
          const $pos = state.doc.resolve(pos)
          vimState.goalColumn = pos - $pos.start($pos.depth)
        } catch {
          vimState.goalColumn = 0
        }
      }
      const savedGoal = vimState.goalColumn
      const targetPos = resolveMotionKey(
        state,
        pos,
        key,
        count,
        false,
        savedGoal,
      )
      if (targetPos !== null) {
        view.dispatch(moveCursor(state, targetPos))
      }
      clearPendingState(vimState)
      vimState.goalColumn = savedGoal
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
      clearPendingState(vimState)
      return true
    }
    case '0': {
      // 0 is motion to line start (only when not part of a count)
      const targetPos = motionLineStart(state, pos)
      view.dispatch(moveCursor(state, targetPos))
      clearPendingState(vimState)
      return true
    }
    case 'G': {
      const targetPos = motionDocEnd(state)
      view.dispatch(moveCursor(state, targetPos))
      clearPendingState(vimState)
      return true
    }
    case 'g': {
      vimState.ggPending = true
      return true
    }

    // Find/Till
    case 'f':
    case 'F':
    case 't':
    case 'T': {
      vimState.findPending = true
      vimState.findMotion = key
      return true
    }

    // Repeat last find (; same direction, , reversed)
    case ';':
    case ',': {
      if (vimState.lastFindMotion && vimState.lastFindChar) {
        const motion =
          key === ';'
            ? vimState.lastFindMotion
            : reverseFind(vimState.lastFindMotion)
        const targetPos = repeatFind(
          state,
          pos,
          motion,
          vimState.lastFindChar,
          count,
        )
        if (targetPos !== null) view.dispatch(moveCursor(state, targetPos))
      }
      clearPendingState(vimState)
      return true
    }

    // Screen motions (top/middle/bottom of viewport)
    case 'H':
    case 'M':
    case 'L': {
      const targetPos = screenLinePos(view, key)
      if (targetPos !== null) view.dispatch(moveCursor(state, targetPos))
      clearPendingState(vimState)
      return true
    }

    // Center cursor
    case 'z': {
      vimState.zzPending = true
      return true
    }

    // Indent/Outdent
    case '>': {
      vimState.shiftRightPending = true
      return true
    }
    case '<': {
      vimState.shiftLeftPending = true
      return true
    }

    // Marks
    case 'm': {
      vimState.markPending = true
      return true
    }
    case "'": {
      vimState.gotoMarkPending = true
      return true
    }

    // Search
    case '/': {
      vimState.searchActive = true
      vimState.searchQuery = ''
      view.dispatch(state.tr) // trigger decoration update for search bar
      return true
    }
    case 'n': {
      if (vimState.searchTerm) {
        vimState.searchHighlightsVisible = true
        const matches = findAllMatches(
          state,
          vimState.searchTerm,
          vimState.searchWholeWord,
        )
        if (matches.length > 0) {
          let idx = matches.findIndex((m) => m > pos)
          if (idx === -1) idx = 0 // wrap around
          vimState.statusMessage = `${idx + 1}/${matches.length}`
          view.dispatch(moveCursor(state, matches[idx]))
          centerCursorInEditor(view, matches[idx])
        } else {
          vimState.statusMessage = 'pattern not found'
          view.dispatch(state.tr)
        }
      }
      clearPendingState(vimState)
      return true
    }
    case 'N': {
      if (vimState.searchTerm) {
        vimState.searchHighlightsVisible = true
        const matches = findAllMatches(
          state,
          vimState.searchTerm,
          vimState.searchWholeWord,
        )
        if (matches.length > 0) {
          let idx = -1
          for (let i = matches.length - 1; i >= 0; i--) {
            if (matches[i] < pos) {
              idx = i
              break
            }
          }
          if (idx === -1) idx = matches.length - 1 // wrap around
          vimState.statusMessage = `${idx + 1}/${matches.length}`
          view.dispatch(moveCursor(state, matches[idx]))
          centerCursorInEditor(view, matches[idx])
        } else {
          vimState.statusMessage = 'pattern not found'
          view.dispatch(state.tr)
        }
      }
      clearPendingState(vimState)
      return true
    }
    case '*': {
      const word = wordUnderCursor(state, pos)
      if (word) {
        vimState.searchTerm = word
        vimState.searchWholeWord = true
        vimState.searchHighlightsVisible = true
        const matches = findAllMatches(state, word, true)
        if (matches.length > 0) {
          let idx = matches.findIndex((m) => m > pos)
          if (idx === -1) idx = 0 // wrap around
          vimState.statusMessage = `${idx + 1}/${matches.length}`
          view.dispatch(moveCursor(state, matches[idx]))
          centerCursorInEditor(view, matches[idx])
        }
      }
      clearPendingState(vimState)
      return true
    }

    // Dot repeat
    case '.': {
      if (vimState.lastAction) {
        replayLastAction(view, vimState, commands)
      }
      clearPendingState(vimState)
      return true
    }
  }

  // Consume all remaining keys in normal mode to prevent them from inserting text
  if (key.length === 1) {
    return true
  }

  return false
}
