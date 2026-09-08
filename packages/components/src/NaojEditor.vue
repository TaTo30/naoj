<script setup lang="ts">
import { useEditor, EditorContent} from "@tiptap/vue-3"
import { FloatingMenu } from "@tiptap/vue-3/menus"
import { Markdown } from "@tiptap/markdown"
import { Document } from "@tiptap/extension-document";
import { Text } from "@tiptap/extension-text";
import { HardBreak } from "@tiptap/extension-hard-break";
import { Underline } from "@tiptap/extension-underline";
import { Italic } from "@tiptap/extension-italic";
import { Bold } from "@tiptap/extension-bold";
import { Paragraph } from "@tiptap/extension-paragraph";
import { Heading } from "@tiptap/extension-heading";
import { TextStyleKit } from "@tiptap/extension-text-style";
import { CodeBlockLowlight } from "@tiptap/extension-code-block-lowlight"
import { ListKit } from "@tiptap/extension-list"
import { Image } from "@tiptap/extension-image"
import { HorizontalRule } from "@tiptap/extension-horizontal-rule"
import { Blockquote } from "@tiptap/extension-blockquote"
import { Link } from "@tiptap/extension-link"
import { Emoji } from "@tiptap/extension-emoji"
import { Strike } from "@tiptap/extension-strike"
import { Superscript } from "@tiptap/extension-superscript"
import { Subscript } from "@tiptap/extension-subscript"
import { Highlight } from "@tiptap/extension-highlight"
import { Code } from "@tiptap/extension-code"
import { TableKit } from "@tiptap/extension-table"
import { Details, DetailsSummary, DetailsContent } from "@tiptap/extension-details"
import { common, createLowlight } from "lowlight"

import  "./main.css"

const modelValue = defineModel()

const lowlight = createLowlight(common)


const editor = useEditor({
  content: `
# Welcome to the Markdown Demo

This demo showcases **bidirectional** markdown support in Tiptap with extended features.

## Features

- **Bold text** and *italic text*
- ~inline code~ and code blocks
- [Links](https://tiptap.dev)
- Lists and more!

## Extended Features

## Task Lists

- [ ] Incomplete task
  - [ ] Nested incomplete task
  - [x] Completed task
- [x] Completed task
  - [ ] Incomplete task
  - [x] Completed task

<h2>HTML Support</h2>

<p>Markdown support comes with additional HTML support so your content can be easily parsed as well, even if not in Markdown format.</p>

<ul>
  <li>
    <p>
      <strong>Lists</strong>
    </p>
  </li>
  <li>
    <p>and</p>
  </li>
  <li>
    <p>Sublists</p>
    <ul>
      <li>
        <p>See?</p>
      </li>
    </ul>
  </li>
</ul>

### Code

Tiptap supports ~inline code~ and full code blocks:

~~~javascript
import { Editor } from '@tiptap/core'
import { StarterKit } from '@tiptap/starter-kit'

const editor = new Editor({
  extensions: [StarterKit],
  content: '<p>Hello World!</p>',
  element: document.querySelector('#editor'),
})
~~~

### Details

:::details

:::detailsSummary
What features does Tiptap offer?
:::

:::detailsContent

- Rich Text Editing
- Collaborative Editing
- Markdown Support
- Content AI
- Custom Extensions
- More...

:::

:::

:::details

:::detailsSummary
Where can I learn how to use Tiptap?
:::

:::detailsContent

You can learn how to use Tiptap by visiting the [official documentation](https://tiptap.dev/docs).

:::

:::

### Images

![Random Image](https://unsplash.it/400/600 "Tiptap Editor")

### Mentions

Hey, [@ id="Madonna"], have you seen [@ id="Tom Cruise"]?

This demo supports **multi-mention** with different trigger characters:

- User mentions with ~@~: [@ id="Lea Thompson"] and [@ id="Cyndi Lauper"]
- Tag mentions with ~#~: [@ id="bug" char="#"] and [@ id="feature" char="#"]

Try typing ~@~ or ~#~ in the editor to see suggestions!

### Mathematics

Inline math: $E = mc^2$ and $\pi r^2$

Block math:

$$
40*5/38
$$


### Inline Code in Tables

Pipe characters inside backtick code spans in tables should be preserved:

| Expression | Meaning | Example |
| ---------- | ------- | ------- |
| ~||~ | or | ~a || b~ |
| ~&&~ | and | ~a && b~ |

### Try editing the markdown on the left:

1. Edit the markdown text
2. Click "Parse Markdown"
3. See it render in the editor!
  1. Be very happy
  2. Enjoy the parsed content
4. Try adding YouTube videos, mentions, math expressions, and custom components directly in the editor
5. Click "Extract Markdown" to see the serialized output
  1. Be amazed by the fidelity of the conversion
  2. Share your feedback!

You can also edit in the editor and see the markdown update.

  `,
  extensions: [
    // Structural extensions
    Document,
    Paragraph,
    Text,
    TextStyleKit,
    Markdown,
    // Block content extensions
    Heading,
    ListKit,
    TableKit,
    HardBreak,
    Details,
    DetailsSummary,
    DetailsContent,
    CodeBlockLowlight.configure({
      lowlight
    }),
    Image,
    HorizontalRule,
    Blockquote,
    // Inline content extensions
    Underline,
    Italic,
    Bold,
    Strike,
    Superscript,
    Subscript,
    Highlight,
    Code,
    Link,
    Emoji
  ],
  contentType: "markdown"
})

function shouldshow({ state }: { state: any }) {
    const { selection } = state
    const { $anchor } = selection
    const isRootDepth = $anchor.depth === 1

    const textContent = $anchor.parent.content?.content?.[0]?.text || ""

    if (isRootDepth && textContent === "/"){
      return true
    }

    if (textContent.endsWith("/")) {
      const parentSize = $anchor.parent.content.size
      const parentOffset = $anchor.parentOffset
      if (parentOffset === parentSize) {
        return true
      }
    }
    return false
}

</script>

<template>
  <div v-if="editor">
    <editor-content :editor="editor" />
      <FloatingMenu :editor="editor" :shouldShow="shouldshow">
        <button>
          hola
          </button>
      </FloatingMenu>
  </div>
</template>

