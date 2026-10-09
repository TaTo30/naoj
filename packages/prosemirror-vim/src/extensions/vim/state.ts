import {
  Plugin,
  PluginKey,
  EditorState,
  Selection,
  Transaction,
} from 'prosemirror-state'
import { Decoration, DecorationSet, EditorView } from 'prosemirror-view'
import { VimState, VimEditorCommands, defaultVimState } from './types'
import { findAllMatches } from './utils'
import { normalMode } from './normal-mode'
import { insertMode } from './insert-mode'
import { visualMode } from './visual-mode'

export const vimPluginKey = new PluginKey<VimState>('vimMode')

export function createVimPlugin(commands: VimEditorCommands): Plugin<VimState> {
  const vimState = defaultVimState()

  return new Plugin<VimState>({
    key: vimPluginKey,

    state: {
      init(): VimState {
        return vimState
      },
      apply(tr, value) {
          return value
      },
    },
    props: {
      handleDOMEvents: {
        mouseup: (view: EditorView) => {
          setTimeout(() => {
            const { from, to } = view.state.selection
            if (from !== to && vimState.mode === 'normal') {
              // Native selection in normal mode → enter visual mode
              vimState.mode = 'visual'
              vimState.visualMode.anchor = from
              vimState.visualMode.head = to > from ? to - 1 : from
              view.dispatch(view.state.tr)
            } else if (
              from === to &&
              (vimState.mode === 'visual' || vimState.mode === 'visual-line')
            ) {
              // Click (empty selection) in visual mode → exit to normal
              vimState.mode = 'normal'
              vimState.visualMode.anchor = null
              vimState.visualMode.head = null
              view.dispatch(view.state.tr)
            }
          }, 0)
          return false
        },
      },

      handleKeyDown(view: any, event: any) {
        switch (vimState.mode) {
          case "normal":
            return normalMode(view, event, vimState, commands)
          case "insert":
            return insertMode(view, event, vimState, commands)
          case "visual":
            return visualMode(view, event, vimState, commands)
          default:
            return false;
        }
      },

      handleTextInput(
        _view: EditorView,
        _from: number,
        _to: number,
        text: string,
      ) {
        if (vimState.insertMode.isTrackingInsert) {
          vimState.insertMode.insertTextBuffer += text
        }
        return false
      },

      attributes(_state: any) {
        return {
          'data-vim-mode': vimState.mode,
          class: `vim-mode vim-mode-${vimState.mode}`,
        }
      },

      decorations(state: EditorState) {
        const decorations: Decoration[] = []
        const cursorPos = vimState.visualMode.head ?? state.selection.$head.pos

        if (vimState.mode !== 'insert' && vimState.mode !== 'replace') {
          // Block cursor
          try {
            let $pos = state.doc.resolve(cursorPos)
            // If at document root (depth 0), find nearest textblock
            if ($pos.depth === 0) {
              const sel =
                Selection.findFrom($pos, 1, true) ||
                Selection.findFrom($pos, -1, true)
              if (sel) $pos = sel.$from
            }
            if ($pos.depth > 0) {
              const lineEnd = $pos.end($pos.depth)
              if (cursorPos < lineEnd) {
                decorations.push(
                  Decoration.inline(cursorPos, cursorPos + 1, {
                    class: 'vim-block-cursor',
                  }),
                )
              } else {
                decorations.push(
                  Decoration.widget(
                    cursorPos,
                    () => {
                      const span = document.createElement('span')
                      span.className = 'vim-block-cursor-eol'
                      span.textContent = '\u00a0'
                      return span
                    },
                    { side: 0 },
                  ),
                )
              }
            }
          } catch {
            // Position invalid, skip cursor decoration
          }

          // Visual selection highlight via decoration (more reliable than ::selection)
          if (
            (vimState.mode === 'visual' || vimState.mode === 'visual-line') &&
            state.selection.from < state.selection.to
          ) {
            decorations.push(
              Decoration.inline(state.selection.from, state.selection.to, {
                class: 'vim-visual-selection',
              }),
            )

            // Inline decorations won't visibly highlight empty textblocks, so
            // add a block-level decoration for selected empty lines.
            state.doc.nodesBetween(
              state.selection.from,
              state.selection.to,
              (node, pos) => {
                if (
                  node.isTextblock &&
                  node.content.size === 0 &&
                  state.selection.from <= pos + node.nodeSize &&
                  state.selection.to >= pos
                ) {
                  decorations.push(
                    Decoration.node(pos, pos + node.nodeSize, {
                      class: 'vim-visual-selection-line',
                    }),
                  )
                }
              },
            )
          }
        }

        // Search match highlights (visible in all modes)
        const activeSearchTerm = vimState.searchActive
          ? vimState.searchQuery
          : vimState.searchHighlightsVisible
            ? vimState.searchTerm
            : ''
        if (activeSearchTerm) {
          const wholeWord = !vimState.searchActive && vimState.searchWholeWord
          const matches = findAllMatches(state, activeSearchTerm, wholeWord)
          for (const matchPos of matches) {
            const end = matchPos + activeSearchTerm.length
            if (end <= state.doc.content.size) {
              const isCurrent = matchPos <= cursorPos && cursorPos < end
              decorations.push(
                Decoration.inline(matchPos, end, {
                  class: isCurrent
                    ? 'vim-search-match-current'
                    : 'vim-search-match',
                }),
              )
            }
          }
        }

        return decorations.length > 0
          ? DecorationSet.create(state.doc, decorations)
          : DecorationSet.empty
      },
    },
  })
}

/**
 * Get the current vim state from an EditorState.
 */
export function getVimStateFromEditorState(
  state: EditorState,
): VimState | null {
  return vimPluginKey.getState(state) ?? null
}
