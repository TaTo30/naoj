# Changelog

All notable changes to this project will be documented in this file.

## Unreleased

## 0.2.0 - 2026-07-13

### Added

- `W` / `B` / `E` — WORD-wise (whitespace-delimited) motions, the counterparts to `w` / `b` / `e`. `E` is inclusive as an operator motion (`dE`, `cE`).
- `;` / `,` — repeat the last `f` / `F` / `t` / `T`, in the same (`;`) or reversed (`,`) direction. Count-aware, and `t` / `T` no longer stick when the cursor is already at the stop.
- `{` / `}` — jump backward / forward by paragraph (blank line).
- `%` — jump to the matching bracket (`()`, `[]`, `{}`), respecting nesting. Inclusive as an operator motion (`d%`).
- `ge` — move backward to the end of the previous word.
- `g_` — move to the last non-blank character of the line.
- `H` / `M` / `L` — move the cursor to the top / middle / bottom of the visible viewport.
- `+` / `-` — first non-blank of the next / previous line; `_` — first non-blank of the current line; `|` — go to a column by count (`5|`).

All motions work in normal and visual mode, compose with operators (`d`, `c`, `y`) and counts where applicable, and are resolved against ProseMirror document positions, so they behave identically on Windows, macOS, and Linux.

## 0.1.0 - 2026-07-13

### Added

- `e` motion — move to the end of the current or next word. Works as a standalone motion in normal and visual mode, as an inclusive operator motion (`de`, `ce`, `ye`), with counts (`3e`), and with dot-repeat. Runs of word characters and runs of punctuation are treated as separate words, and the motion skips across line boundaries.

### Fixed

- `zz` now recenters the cursor. Centering (also used by search `/`, `n`, `N`, `*` and mark jumps) adjusted `scrollTop` on the ProseMirror editable element, which is typically not the scroll container — host apps usually wrap the editor in an `overflow: auto` ancestor. Centering now walks up to the nearest scrollable ancestor (never the page body), so it works regardless of where the app puts the scroll boundary.

## 0.0.4 - 2026-07-12

### Fixed

- Strip carriage returns when reading the system clipboard. On Windows the clipboard round-trips text with `\r\n` line endings, which left stray `\r` characters in pasted content (rendering as extra line breaks under `white-space: pre-wrap`) and split linewise paste incorrectly. Clipboard text is now normalized to `\n` on read, so vim paste of externally-copied text behaves the same across platforms.

## 0.0.3 - 2026-07-11

### Fixed

- Vim paste (`p`/`P`) now ignores line-ending differences when matching the system clipboard against the most recent Vim yank/delete/change. Windows rewrites `\n` as `\r\n` on a clipboard round-trip, which defeated the exact-text comparison and fell back to the lossy plain-text slice, dropping marks such as highlight, text color, and underline on headings and list items.

## 0.0.2 - 2026-07-11

No functional changes. Republished with a `dist/` byte-identical to `0.0.1`; the `0.0.1` tarball already contained `vim-mode.css` and the `vim-prosemirror/style.css` import resolved correctly.

## 0.0.1 - 2026-07-11

### Added

- Initial npm publish as `vim-prosemirror`, continuing the unmaintained `vim-prose` package.

### Fixed

- Vim paste (`p`/`P`) no longer strips marks that Markdown cannot represent — such as highlight, text color, and underline — from headings and list items. When the clipboard text matches the most recent Vim yank/delete/change, the lossless internal slice is now always preferred over a Markdown-reparsed slice.

---

Pre-fork history from the upstream `vim-prose` package:

## 0.3.1 - 2026-03-28

### Fixed

- Rich yank/paste now preserves heading, list, and inline formatting structure more reliably.
- Ordered list items copied linewise no longer paste back as unordered list items.
- External markdown clipboard text is now parsed into editor structure (for example `###` headings and `1.` lists) instead of always pasting as literal text.
- Markdown parsing now runs in both `clipboard.read()` and `readText()` fallback paths.

### Changed

- Clipboard writes now include richer multi-format payloads (`text/html`, `text/markdown`, `text/x-markdown`, custom ProseMirror payload).
- `text/plain` output now prefers markdown syntax when structured content is present, improving interoperability with markdown-aware destinations.
- Paste can recover rich structure from internal clipboard memory when browsers only expose plain text on clipboard read.

## 0.3.0 - 2026-03-27

### Added

- `r` single-character replace command with count support (for example `3rx`).
- `R` replace mode for continuous character replacement until `Esc`/`Ctrl-c`.

### Changed

- Clipboard behavior now uses the system clipboard (`navigator.clipboard`) for yank/delete/change/cut and paste commands.
- `p`/`P` now paste from system clipboard text, including linewise paste when clipboard text ends with a trailing newline.

## 0.2.0 - 2026-03-23

### Fixed

- Visual and visual-line selection highlighting now includes selected empty lines.
- Switching from visual-line mode to visual mode now updates the UI immediately.
- Vim-style search is now case-insensitive for `/`, `n`, `N`, and search highlights.
