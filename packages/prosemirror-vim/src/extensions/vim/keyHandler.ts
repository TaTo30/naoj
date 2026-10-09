import {
  editorstate,
  transaction,
  textselection,
  selection,
} from 'prosemirror-state'
import { editorview } from 'prosemirror-view'
import { vimstate, vimeditorcommands, repeatableaction } from './types'
import {
  motionleft,
  motionright,
  motiondown,
  motionup,
  motionlinestart,
  motionfirstnonblank,
  motionlineend,
  motiondocstart,
  motiondocend,
  motionwordforward,
  motionwordbackward,
  motionwordend,
  motionwordforward,
  motionwordbackward,
  motionwordend,
  motionwordendbackward,
  motionfirstnonblankat,
  motionlastnonblankat,
  motionparagraphforward,
  motionparagraphbackward,
  motionmatchingbracket,
  motionfindcharforward,
  motionfindcharbackward,
  motiontillcharforward,
  motiontillcharbackward,
  motionhalfpagedown,
  motionhalfpageup,
  motionfullpagedown,
  motionfullpageup,
} from './motions'
import {
  resolvetextobject,
  executedelete,
  executeyank,
  executechange,
  deletelines,
  yanklines,
  changelines,
} from './operators'
import {
  replacechars,
} from './commands'
import { updatevisualselection, getvisualrange } from './visual'
import {
  linestartat,
  lineendat,
  findallmatches,
} from './utils'
import {
  setclipboardserializerfromview,
} from './clipboard'

function clearpendingstate(vimstate: vimstate) {
  vimstate.count = null
  vimstate.operator = null
  vimstate.findpending = false
  vimstate.findmotion = null
  vimstate.ggpending = false
  vimstate.goalcolumn = null
  vimstate.zzpending = false
  vimstate.shiftrightpending = false
  vimstate.shiftleftpending = false
  vimstate.markpending = false
  vimstate.gotomarkpending = false
  vimstate.replacependingcount = null
}

function geteffectivecount(vimstate: vimstate): number {
  return vimstate.count ?? 1
}

function getreplaceinputchar(event: keyboardevent): string | null {
  if (event.key === 'tab') return '\t'
  if (event.key.length === 1 && !event.ctrlkey && !event.metakey) {
    return event.key
  }
  return null
}

// function updatestatus(view: editorview, vimstate: vimstate, status: string) {
//   vimstate.statusmessage = status
//   view.dispatch(view.state.tr)
// }
//
// function sameclipboardtext(a: string, b: string): boolean {
//   const normalizenewlines = (text: string) => text.replace(/\r\n?/g, '\n')
//   return normalizenewlines(a) === normalizenewlines(b)
// }
//
// function pastefromclipboard(
//   view: editorview,
//   vimstate: vimstate,
//   count: number,
//   before: boolean,
// ) {
//   const readstate = view.state
//   const internalclipboard = getlastinternalclipboardcontent()
//   void readsystemclipboardcontent(readstate).then((systemclipboard) => {
//     let clipboard: clipboardcontent | null = systemclipboard
//     if (clipboard === null) {
//       clipboard = internalclipboard
//       if (clipboard === null) {
//         updatestatus(view, vimstate, 'clipboard unavailable')
//         return
//       }
//     } else if (
//       internalclipboard?.slice &&
//       sameclipboardtext(clipboard.text, internalclipboard.text)
//     ) {
//       // prefer the rich structure from the most recent vim copy/delete/change
//       // whenever the plain text matches. the system read may expose only plain
//       // text, or a lossy markdown-reparsed slice that drops marks (highlight,
//       // color, underline) on headings and list items; the internal slice is the
//       // lossless source of truth for same-session paste. the comparison ignores
//       // line-ending differences because some platforms (e.g. windows) normalize
//       // `\n` to `\r\n` on a clipboard round-trip.
//       clipboard = {
//         text: clipboard.text,
//         linewise: internalclipboard.linewise,
//         slice: internalclipboard.slice,
//       }
//     }
//
//     if (!clipboard.text && !clipboard.slice) return
//
//     const state = view.state
//     const pos = state.selection.$head.pos
//     const tr = before
//       ? pastebefore(state, pos, clipboard, count)
//       : pasteafter(state, pos, clipboard, count)
//     if (tr.docchanged || tr.selectionset) {
//       view.dispatch(tr)
//     }
//   })
// }
//
/**
 * apply a motion n times, returning the final position.
 */
function applymotionntimes(
  state: editorstate,
  pos: number,
  count: number,
  motionfn: (state: editorstate, pos: number) => number,
): number {
  let current = pos
  for (let i = 0; i < count; i++) {
    current = motionfn(state, current)
  }
  return current
}

/**
 * move cursor to position, clamping to valid range.
 */
function movecursor(state: editorstate, pos: number): transaction {
  const clamped = math.max(0, math.min(pos, state.doc.content.size))
  const tr = state.tr
  try {
    tr.setselection(textselection.create(tr.doc, clamped))
  } catch {
    // if position is invalid (e.g. inside a node boundary), try to find nearest valid position
    try {
      const $pos = state.doc.resolve(clamped)
      tr.setselection(textselection.create(tr.doc, $pos.pos))
    } catch {
      // leave selection unchanged
    }
  }
  tr.scrollintoview()
  return tr
}

/**
 * find the nearest scrollable ancestor of an element (including the element
 * itself), stopping short of the document body/root so the outer page is never
 * scrolled. the editable element rarely scrolls itself — the surrounding app
 * usually wraps it in an `overflow: auto` container — so `zz`, search, and mark
 * recentering must target that ancestor rather than `view.dom`.
 */
function getscrollableancestor(el: htmlelement): htmlelement | null {
  const doc = el.ownerdocument
  const win = doc.defaultview
  if (!win) return null
  const body = doc.body
  const root = doc.documentelement

  let node: htmlelement | null = el
  while (node && node !== body && node !== root) {
    const overflowy = win.getcomputedstyle(node).overflowy
    if (
      (overflowy === 'auto' ||
        overflowy === 'scroll' ||
        overflowy === 'overlay') &&
      node.scrollheight > node.clientheight
    ) {
      return node
    }
    node = node.parentelement
  }
  return null
}

/**
 * center the cursor vertically within the editor's scroll container.
 * only adjusts the scroll container — never scrolls the outer page.
 */
function centercursorineditor(view: editorview, pos: number) {
  try {
    const scroller = getscrollableancestor(view.dom as htmlelement)
    if (!scroller) return
    const coords = view.coordsatpos(pos)
    const rect = scroller.getboundingclientrect()
    const cursorfromtop = coords.top - rect.top
    const centertarget = scroller.clientheight / 2
    scroller.scrolltop += cursorfromtop - centertarget
  } catch {
    // ignore
  }
}

/**
 * resolve the document position at the top (`h`), middle (`m`), or bottom (`l`)
 * of the visible editor viewport. uses `posatcoords`, so it maps a screen point
 * to a document position identically across platforms and browsers.
 */
function screenlinepos(
  view: editorview,
  where: 'h' | 'm' | 'l',
): number | null {
  try {
    const dom = view.dom as htmlelement
    const domrect = dom.getboundingclientrect()
    const scroller = getscrollableancestor(dom)
    const rect = scroller ? scroller.getboundingclientrect() : domrect
    const left = domrect.left + math.min(24, math.max(1, domrect.width / 2))
    let top: number
    if (where === 'h') top = rect.top + 8
    else if (where === 'l') top = rect.bottom - 8
    else top = rect.top + rect.height / 2
    const clampedtop = math.min(
      math.max(top, domrect.top + 1),
      domrect.bottom - 1,
    )
    const coords = view.posatcoords({ left, top: clampedtop })
    return coords ? coords.pos : null
  } catch {
    return null
  }
}

/**
 * handle operator + motion/text-object combination.
 */
function handleoperatormotion(
  state: editorstate,
  vimstate: vimstate,
  from: number,
  to: number,
  linewise: boolean = false,
): transaction | null {
  const op = vimstate.operator
  if (!op) return null

  // ensure from < to
  const [rangefrom, rangeto] = from <= to ? [from, to] : [to, from]

  let tr: transaction

  switch (op) {
    case 'd':
      tr = executedelete(state, rangefrom, rangeto, vimstate, linewise)
      break
    case 'y':
      executeyank(state, rangefrom, rangeto, vimstate, linewise)
      tr = state.tr // no document change
      break
    case 'c':
      tr = executechange(state, rangefrom, rangeto, vimstate, linewise)
      break
    default:
      return null
  }

  clearpendingstate(vimstate)
  tr.scrollintoview()
  return tr
}

/**
 * process a motion key and return the new position (or null if not a motion key).
 */
function resolvemotionkey(
  state: editorstate,
  pos: number,
  key: string,
  count: number,
  ctrlkey: boolean,
  goalcolumn?: number,
): number | null {
  if (ctrlkey) {
    switch (key) {
      case 'd':
        return motionhalfpagedown(state, pos)
      case 'u':
        return motionhalfpageup(state, pos)
      case 'f':
        return motionfullpagedown(state, pos)
      case 'b':
        return motionfullpageup(state, pos)
      default:
        return null
    }
  }

  switch (key) {
    case 'h':
      return applymotionntimes(state, pos, count, motionleft)
    case 'l':
      return applymotionntimes(state, pos, count, motionright)
    case 'j': {
      let current = pos
      for (let i = 0; i < count; i++) {
        current = motiondown(state, current, goalcolumn)
      }
      return current
    }
    case 'k': {
      let current = pos
      for (let i = 0; i < count; i++) {
        current = motionup(state, current, goalcolumn)
      }
      return current
    }
    case '0':
      return motionlinestart(state, pos)
    case '^':
      return motionfirstnonblank(state)
    case '$':
      return motionlineend(state, pos)
    case 'g':
      return motiondocend(state)
    case 'w':
      return applymotionntimes(state, pos, count, motionwordforward)
    case 'e':
      return applymotionntimes(state, pos, count, motionwordend)
    case 'b':
      return applymotionntimes(state, pos, count, motionwordbackward)
    case 'w':
      return applymotionntimes(state, pos, count, motionwordforward)
    case 'e':
      return applymotionntimes(state, pos, count, motionwordend)
    case 'b':
      return applymotionntimes(state, pos, count, motionwordbackward)
    case '{':
      return applymotionntimes(state, pos, count, motionparagraphbackward)
    case '}':
      return applymotionntimes(state, pos, count, motionparagraphforward)
    case '%':
      return motionmatchingbracket(state, pos)
    case '|': {
      const lines = motionlinestart(state, pos)
      const linee = motionlineend(state, pos)
      return math.min(lines + (count - 1), linee)
    }
    case '+': {
      let cur = pos
      for (let i = 0; i < count; i++) cur = motiondown(state, cur)
      return motionfirstnonblankat(state, cur)
    }
    case '-': {
      let cur = pos
      for (let i = 0; i < count; i++) cur = motionup(state, cur)
      return motionfirstnonblankat(state, cur)
    }
    case '_': {
      let cur = pos
      for (let i = 0; i < count - 1; i++) cur = motiondown(state, cur)
      return motionfirstnonblankat(state, cur)
    }
    default:
      return null
  }
}


// function replaylastaction(
//   view: editorview,
//   vimstate:vimstate,
//   commands: vimeditorcommands,
// ) {
//   const action = vimstate.lastaction
//   if (!action) return
//
//   const state = view.state
//   const pos = state.selection.$head.pos
//   const count = vimstate.count ?? action.count
//
//   switch (action.type) {
//     case 'command': {
//       switch (action.key) {
//         case 'x': {
//           const tr = deletechar(state, pos, vimstate, count)
//           view.dispatch(tr)
//           break
//         }
//         case 'p': {
//           pastefromclipboard(view, vimstate, count, false)
//           break
//         }
//         case 'p': {
//           pastefromclipboard(view, vimstate, count, true)
//           break
//         }
//         case 'r': {
//           if (action.replacechar) {
//             const tr = replacechars(state, pos, action.replacechar, count)
//             view.dispatch(tr)
//           }
//           break
//         }
//         case 'j': {
//           const tr = joinlines(state, pos, count)
//           view.dispatch(tr)
//           break
//         }
//         case 'd': {
//           const endpos = lineendat(state, pos)
//           if (pos < endpos) {
//             const tr = executedelete(state, pos, endpos, vimstate, false)
//             view.dispatch(tr)
//           }
//           break
//         }
//         case '>>': {
//           for (let i = 0; i < count; i++) {
//             commands.indent?.()
//           }
//           break
//         }
//         case '<<': {
//           for (let i = 0; i < count; i++) {
//             commands.outdent?.()
//           }
//           break
//         }
//       }
//       break
//     }
//     case 'operator-linewise': {
//       switch (action.operator) {
//         case 'd': {
//           const tr = deletelines(state, pos, count, vimstate)
//           tr.scrollintoview()
//           view.dispatch(tr)
//           break
//         }
//         case 'c': {
//           const tr = changelines(state, pos, count, vimstate)
//           tr.scrollintoview()
//           view.dispatch(tr)
//           if (action.insertedtext) {
//             const ns = view.state
//             const itr = ns.tr.inserttext(
//               action.insertedtext,
//               ns.selection.$head.pos,
//             )
//             view.dispatch(itr)
//             vimstate.mode = 'normal'
//             const fs = view.state
//             const fp = fs.selection.$head.pos
//             const ls = linestartat(fs, fp)
//             view.dispatch(movecursor(fs, fp > ls ? fp - 1 : fp))
//           }
//           break
//         }
//       }
//       break
//     }
//     case 'operator-motion': {
//       if (!action.operator || !action.motion) break
//
//       let targetpos: number | null = null
//
//       if (action.findmotion && action.findchar) {
//         let current = pos
//         for (let i = 0; i < count; i++) {
//           let result: number | null = null
//           switch (action.findmotion) {
//             case 'f':
//               result = motionfindcharforward(state, current, action.findchar)
//               break
//             case 'f':
//               result = motionfindcharbackward(state, current, action.findchar)
//               break
//             case 't':
//               result = motiontillcharforward(state, current, action.findchar)
//               break
//             case 't':
//               result = motiontillcharbackward(state, current, action.findchar)
//               break
//           }
//           if (result === null) break
//           current = result
//         }
//         targetpos = current !== pos ? current : null
//       } else if (action.motion === 'gg') {
//         targetpos = motiondocstart(state)
//       } else {
//         targetpos = resolvemotionkey(state, pos, action.motion, count, false)
//       }
//
//       if (targetpos !== null) {
//         let from = pos
//         let to = targetpos
//         if (action.findmotion === 'f' || action.findmotion === 't') {
//           to = targetpos + 1
//         } else if (action.findmotion === 'f' || action.findmotion === 't') {
//           from = targetpos
//           to = pos
//         } else if (action.motion === 'e' || action.motion === 'e') {
//           to = targetpos + 1
//         }
//
//         vimstate.operator = action.operator!
//         const tr = handleoperatormotion(state, vimstate, from, to, false)
//         if (tr) {
//           tr.scrollintoview()
//           view.dispatch(tr)
//         }
//
//         if (action.operator === 'c' && action.insertedtext) {
//           const ns = view.state
//           const itr = ns.tr.inserttext(
//             action.insertedtext,
//             ns.selection.$head.pos,
//           )
//           view.dispatch(itr)
//           vimstate.mode = 'normal'
//           const fs = view.state
//           const fp = fs.selection.$head.pos
//           const ls = linestartat(fs, fp)
//           view.dispatch(movecursor(fs, fp > ls ? fp - 1 : fp))
//         }
//       }
//       break
//     }
//     case 'operator-textobject': {
//       if (!action.operator || !action.textobject) break
//
//       const result = resolvetextobject(
//         state,
//         pos,
//         action.textobject.type,
//         action.textobject.object,
//       )
//       if (result) {
//         vimstate.operator = action.operator!
//         const tr = handleoperatormotion(
//           state,
//           vimstate,
//           result.from,
//           result.to,
//           false,
//         )
//         if (tr) {
//           tr.scrollintoview()
//           view.dispatch(tr)
//         }
//
//         if (action.operator === 'c' && action.insertedtext) {
//           const ns = view.state
//           const itr = ns.tr.inserttext(
//             action.insertedtext,
//             ns.selection.$head.pos,
//           )
//           view.dispatch(itr)
//           vimstate.mode = 'normal'
//           const fs = view.state
//           const fp = fs.selection.$head.pos
//           const ls = linestartat(fs, fp)
//           view.dispatch(movecursor(fs, fp > ls ? fp - 1 : fp))
//         }
//       }
//       break
//     }
//     case 'insert-command': {
//       switch (action.key) {
//         case 'o': {
//           const tr = openlinebelow(state, pos, vimstate)
//           view.dispatch(tr)
//           break
//         }
//         case 'o': {
//           const tr = openlineabove(state, pos, vimstate)
//           view.dispatch(tr)
//           break
//         }
//         case 'i': {
//           vimstate.mode = 'insert'
//           view.dispatch(state.tr)
//           break
//         }
//         case 'a': {
//           vimstate.mode = 'insert'
//           const newpos = math.min(pos + 1, lineendat(state, pos))
//           view.dispatch(movecursor(state, newpos))
//           break
//         }
//         case 'a': {
//           vimstate.mode = 'insert'
//           const endpos = lineendat(state, pos)
//           view.dispatch(movecursor(state, endpos))
//           break
//         }
//         case 'i': {
//           vimstate.mode = 'insert'
//           const fnbpos = firstnonblank(state)
//           view.dispatch(movecursor(state, fnbpos))
//           break
//         }
//         case 'c': {
//           const endpos = lineendat(state, pos)
//           if (pos < endpos) {
//             const tr = executechange(state, pos, endpos, vimstate, false)
//             view.dispatch(tr)
//           } else {
//             vimstate.mode = 'insert'
//           }
//           break
//         }
//       }
//       // insert the recorded text and return to normal mode
//       if (action.insertedtext) {
//         const ns = view.state
//         const itr = ns.tr.inserttext(
//           action.insertedtext,
//           ns.selection.$head.pos,
//         )
//         view.dispatch(itr)
//         vimstate.mode = 'normal'
//         const fs = view.state
//         const fp = fs.selection.$head.pos
//         const ls = linestartat(fs, fp)
//         view.dispatch(movecursor(fs, fp > ls ? fp - 1 : fp))
//       }
//       break
//     }
//   }
// }

/**
 * main key handler for the vim plugin.
 */
export function handlekeydown(
  view: editorview,
  event: keyboardevent,
  vimstate: vimstate,
  commands: vimeditorcommands,
): boolean {
  setclipboardserializerfromview(view)
  const state = view.state
  // clear status message from previous action
  vimstate.statusmessage = ''
  // in visual modes, use the tracked visual head (not $head.pos which is the exclusive selection end)
  const pos =
    (vimstate.mode === 'visual' || vimstate.mode === 'visual-line') &&
    vimstate.visualhead !== null
      ? vimstate.visualhead
      : state.selection.$head.pos
  const key = event.key
  // const ctrlkey = event.ctrlkey || event.metakey
  const ctrlkey = event.ctrlkey


  // ── replace mode (r) ──

  // replace mode
  if (vimstate.mode === 'replace') {
    if (key === 'escape' || (ctrlkey && key === 'c')) {
      vimstate.mode = 'normal'
      clearpendingstate(vimstate)
      view.dispatch(state.tr)
      return true
    }

    const replacechar = getreplaceinputchar(event)
    if (replacechar !== null) {
      const linee = lineendat(state, pos)
      const tr =
        pos < linee
          ? state.tr.inserttext(replacechar, pos, pos + 1)
          : state.tr.inserttext(replacechar, pos)
      const nextpos = math.min(pos + replacechar.length, tr.doc.content.size)
      try {
        tr.setselection(textselection.create(tr.doc, nextpos))
      } catch {
        // leave as-is
      }
      view.dispatch(tr)
      return true
    }

    return false
  }


  // ── esc / ctrl-c (normal/visual) ──
  if (key === 'escape' || (ctrlkey && key === 'c')) {
    // -- visual mode --
    if (vimstate.mode === 'visual' || vimstate.mode === 'visual-line') {
      const restorepos = pos
      vimstate.mode = 'normal'
      vimstate.visualanchor = null
      vimstate.visualhead = null
      clearpendingstate(vimstate)
      vimstate.searchhighlightsvisible = false
      // collapse selection to the visual head position
      view.dispatch(movecursor(state, restorepos))
      return true
    }
    // -- normal mode --
    clearpendingstate(vimstate)
    // clear search highlights (searchterm preserved for n/n)
    vimstate.searchhighlightsvisible = false
    view.dispatch(state.tr) // trigger decoration update
    return true
  }

  // ── single replace pending (r + char) ──
  // -- replace mode --
  if (vimstate.replacependingcount !== null) {
    if (
      key === 'shift' ||
      key === 'control' ||
      key === 'alt' ||
      key === 'meta'
    ) {
      return true
    }

    const replacecount = vimstate.replacependingcount
    vimstate.replacependingcount = null

    const replacechar = getreplaceinputchar(event)
    if (replacechar === null) {
      clearpendingstate(vimstate)
      return true
    }

    const tr = replacechars(state, pos, replacechar, replacecount)
    view.dispatch(tr)
    vimstate.lastaction = {
      type: 'command',
      key: 'r',
      count: replacecount,
      replacechar,
    }
    clearpendingstate(vimstate)
    return true
  }

  // ── text object resolution (when operator + i/a is pending) ──
  if ((vimstate as any)._textobjecttype) {
    // ignore modifier-only keys — wait for the actual character
    if (
      key === 'shift' ||
      key === 'control' ||
      key === 'alt' ||
      key === 'meta'
    ) {
      return true
    }

    const objecttype = (vimstate as any)._textobjecttype as 'i' | 'a'
    delete (vimstate as any)._textobjecttype
    vimstate.findpending = false

    if (key.length !== 1) {
      clearpendingstate(vimstate)
      return true
    }

    const result = resolvetextobject(state, pos, objecttype, key)
    if (result) {
      if (vimstate.operator) {
        const savedop = vimstate.operator
        const savedcount = geteffectivecount(vimstate)
        const tr = handleoperatormotion(
          state,
          vimstate,
          result.from,
          result.to,
          false,
        )
        if (tr) view.dispatch(tr)
        // record lastaction for dot repeat
        if (savedop !== 'y') {
          const action: repeatableaction = {
            type: 'operator-textobject',
            key: `${savedop}${objecttype}${key}`,
            count: savedcount,
            operator: savedop,
            textobject: { type: objecttype, object: key },
          }
          if (savedop === 'c') {
            startinserttracking(vimstate, action)
          } else {
            vimstate.lastaction = action
          }
        }
        clearpendingstate(vimstate)
      } else if (
        vimstate.mode === 'visual' ||
        vimstate.mode === 'visual-line'
      ) {
        vimstate.visualanchor = result.from
        vimstate.visualhead =
          result.to > result.from ? result.to - 1 : result.from
        const tr = state.tr
        try {
          tr.setselection(textselection.create(tr.doc, result.from, result.to))
        } catch {
          // leave as-is
        }
        view.dispatch(tr)
      }
    } else {
      clearpendingstate(vimstate)
    }
    return true
  }


  // ── digit accumulation ── (skip when waiting for a mark character)
  if (!vimstate.markpending && !vimstate.gotomarkpending) {
    if (key >= '1' && key <= '9') {
      vimstate.count = (vimstate.count ?? 0) * 10 + parseint(key)
      return true
    }
    if (key === '0' && vimstate.count !== null) {
      vimstate.count = vimstate.count * 10
      return true
    }
  }

  // ── g-prefix pending (gg, ge, g_) ──
  // -- visual and normal mode --
  if (vimstate.ggpending) {
    vimstate.ggpending = false
    const gcount = geteffectivecount(vimstate)
    let targetpos: number | null = null
    let inclusive = false

    if (key === 'g') {
      targetpos = motiondocstart(state)
    } else if (key === 'e') {
      let cur = pos
      for (let i = 0; i < gcount; i++) cur = motionwordendbackward(state, cur)
      targetpos = cur
      inclusive = true
    } else if (key === '_') {
      let cur = pos
      for (let i = 0; i < gcount - 1; i++) cur = motiondown(state, cur)
      targetpos = motionlastnonblankat(state, cur)
      inclusive = true
    }

    if (targetpos === null) {
      clearpendingstate(vimstate)
      return true
    }

    if (vimstate.operator) {
      const to = inclusive && targetpos >= pos ? targetpos + 1 : targetpos
      const tr = handleoperatormotion(state, vimstate, pos, to, false)
      if (tr) view.dispatch(tr)
    } else if (vimstate.mode === 'visual' || vimstate.mode === 'visual-line') {
      const tr = state.tr
      updatevisualselection(state, tr, vimstate, targetpos)
      vimstate.visualhead = targetpos
      view.dispatch(tr)
    } else {
      view.dispatch(movecursor(state, targetpos))
    }
    clearpendingstate(vimstate)
    return true
  }

  // ── zz pending ──
  // -- normal mode --
  if (vimstate.zzpending) {
    if (key === 'z') {
      vimstate.zzpending = false
      centercursorineditor(view, pos)
      clearpendingstate(vimstate)
      return true
    }
    vimstate.zzpending = false
    clearpendingstate(vimstate)
    return true
  }


  // ── shift right pending (>>) ──
  // -- normal mode --
  if (vimstate.shiftrightpending) {
    if (key === '>') {
      vimstate.shiftrightpending = false
      const indentcount = geteffectivecount(vimstate)
      for (let i = 0; i < indentcount; i++) {
        commands.indent?.()
      }
      vimstate.lastaction = { type: 'command', key: '>>', count: indentcount }
      clearpendingstate(vimstate)
      return true
    }
    vimstate.shiftrightpending = false
    clearpendingstate(vimstate)
    return true
  }

  // ── shift left pending (<<) ──
  if (vimstate.shiftleftpending) {
    if (key === '<') {
      vimstate.shiftleftpending = false
      const outdentcount = geteffectivecount(vimstate)
      for (let i = 0; i < outdentcount; i++) {
        commands.outdent?.()
      }
      vimstate.lastaction = { type: 'command', key: '<<', count: outdentcount }
      clearpendingstate(vimstate)
      return true
    }
    vimstate.shiftleftpending = false
    clearpendingstate(vimstate)
    return true
  }





  // ── normal + visual mode dispatch ──
  const count = geteffectivecount(vimstate)

  // ── ctrl key combinations ──
  if (ctrlkey) {
    switch (key) {
      case 'r': {
        // redo
        for (let i = 0; i < count; i++) {
          commands.redo()
        }
        clearpendingstate(vimstate)
        return true
      }
      case 'd':
      case 'u':
      case 'f':
      case 'b': {
        const targetpos = resolvemotionkey(state, pos, key, count, true)
        if (targetpos !== null) {
          if (vimstate.mode === 'visual' || vimstate.mode === 'visual-line') {
            const tr = state.tr
            updatevisualselection(state, tr, vimstate, targetpos)
            vimstate.visualhead = targetpos
            view.dispatch(tr)
          } else {
            view.dispatch(movecursor(state, targetpos))
          }
        }
        clearpendingstate(vimstate)
        return true
      }
      case 'c': {
        // ctrl-c acts as escape
        return false // already handled above
      }
    }
    return false
  }


  // ── NORMAL MODE DISPATCH ──



  }

  // ── Normal mode key dispatch ──
  // switch (key) {
  //   // Mode switching
  //
  //   case 'R': {
  //     vimState.mode = 'replace'
  //     clearPendingState(vimState)
  //     view.dispatch(state.tr)
  //     return true
  //   }
  //
  // }

  // Consume all remaining keys in normal mode to prevent them from inserting text
  if (key.length === 1) {
    return true
  }

  return false
}
