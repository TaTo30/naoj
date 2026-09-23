# vim-prosemirror

Vim keybindings for [Tiptap v3](https://tiptap.dev) and [ProseMirror](https://prosemirror.net). A modal editing layer — normal, insert, visual, visual-line, and replace modes — implemented as a single ProseMirror plugin, with motions, operators, text objects, registers, marks, search, and dot-repeat.

Because every motion resolves against ProseMirror document positions (never raw key codes or pixel offsets), the keybindings behave identically on **Windows, macOS, and Linux**.

## Install

```bash
npm install vim-prosemirror
```

Peer dependencies (you almost certainly already have these): `prosemirror-model`, `prosemirror-state`, `prosemirror-view`, and — for the Tiptap wrapper — `@tiptap/core` (v3+).

## Usage

### Tiptap v3

```ts
import { Editor } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import { VimMode } from 'vim-prosemirror/tiptap'
import 'vim-prosemirror/style.css'

const editor = new Editor({
  extensions: [StarterKit, VimMode],
})
```

Read the current mode / status line (e.g. to render a `-- NORMAL --` indicator):

```ts
import { getVimMode, getVimStatus } from 'vim-prosemirror/tiptap'

editor.on('transaction', () => {
  const mode = getVimMode(editor) // 'normal' | 'insert' | 'visual' | 'visual-line' | 'replace'
  const status = getVimStatus(editor) // e.g. '3/12' during search, 'mark a set'
})
```

### Raw ProseMirror

```ts
import { createVimPlugin, getVimStateFromEditorState } from 'vim-prosemirror'
import 'vim-prosemirror/style.css'

const vimPlugin = createVimPlugin({
  undo: () => myUndo(),
  redo: () => myRedo(),
  indent: () => mySinkListItem(), // optional (for >> and Tab in lists)
  outdent: () => myLiftListItem(), // optional (for <<)
})

// add vimPlugin to your EditorState's plugins, then:
const { mode, statusMessage } = getVimStateFromEditorState(view.state)
```

The host application owns undo/redo and list indentation, so vim-prosemirror stays agnostic about your schema and history plugin.

## Keybindings

### Modes

| Key | Action |
| --- | --- |
| `i` `I` `a` `A` | Insert before / at first non-blank / after / at end of line |
| `o` `O` | Open line below / above and insert |
| `v` `V` | Visual / visual-line |
| `R` | Replace mode |
| `Esc` / `Ctrl-c` | Return to normal mode |

### Motions

| Key | Motion |
| --- | --- |
| `h` `j` `k` `l` | Left, down, up, right |
| `0` `^` `$` | Line start, first non-blank, line end |
| `w` `b` `e` | Word forward, back, end |
| `W` `B` `E` | WORD (whitespace-delimited) forward, back, end |
| `ge` | Backward to end of previous word |
| `f` `F` `t` `T` | Find / till character forward / backward |
| `;` `,` | Repeat last find, same / reversed direction |
| `{` `}` | Paragraph backward / forward |
| `gg` `G` | Document start / end |
| `%` | Matching bracket `()` `[]` `{}` |
| `H` `M` `L` | Top / middle / bottom of viewport |
| `+` `-` | First non-blank of next / previous line |
| `_` `g_` | First / last non-blank of line |
| <code>&#124;</code> | Go to column (e.g. `5|`) |
| `Ctrl-d` `Ctrl-u` | Half page down / up |
| `Ctrl-f` `Ctrl-b` | Full page down / up |
| `zz` | Center the cursor line in the viewport |

All motions accept a count (`3w`, `5j`, `2fx`) and extend the selection in visual mode.

### Operators & editing

| Key | Action |
| --- | --- |
| `d` `c` `y` | Delete / change / yank + motion or text object (`dw`, `ci(`, `y$`) |
| `dd` `cc` `yy` | Linewise delete / change / yank |
| `D` `C` `Y` | Delete / change / yank to end of line |
| `x` | Delete character |
| `p` `P` | Paste after / before |
| `r` `R` | Replace character / replace mode |
| `J` | Join lines |
| `>>` `<<` | Indent / outdent (list items) |
| `u` `Ctrl-r` | Undo / redo |
| `.` | Repeat last change |

### Text objects

Usable after an operator or in visual mode: `iw` `aw`, and pairs `i( a(`, `i[ a[`, `i{ a{`, `i< a<`, `i" a"`, `i' a'`, `` i` `` `` a` ``.

### Marks & search

| Key | Action |
| --- | --- |
| `m{a-zA-Z0-9}` | Set mark |
| `'{mark}` | Jump to mark |
| `/` | Search (case-insensitive) |
| `n` `N` | Next / previous match |
| `*` | Search word under cursor |

## License

MIT © Kevin Christian
