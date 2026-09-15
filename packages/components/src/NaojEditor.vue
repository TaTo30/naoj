<script setup lang="ts">
import { useEditor, EditorContent} from "@tiptap/vue-3"
import { getMarksBetween } from "@tiptap/core"
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
import { Highlight } from "@tiptap/extension-highlight"
import { Code } from "@tiptap/extension-code"
import { TableKit } from "@tiptap/extension-table"
import { Details, DetailsSummary, DetailsContent } from "@tiptap/extension-details"
import { common, createLowlight } from "lowlight"

import NaojEditorCommand from "./NaojEditorCommand.vue"

import  "./main.css"
import { onMounted, ref, useTemplateRef, watchEffect } from "vue";

const modelValue = defineModel()

const lowlight = createLowlight(common)
const editorContainer = useTemplateRef("editorContainer")

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
I am wanto to check something [^1]

[^1]: This is a footnote.

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
    HardBreak,
    Markdown.configure({
      markedOptions: {
        gfm: true,
        breaks: false,
        pedantic: false
      }
    }),
    // Block content extensions
    Heading,
    ListKit,
    TableKit,
    //details,
    //detailssummary,
    //detailsContent,
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
    Highlight,
    Code,
    Link,
    Emoji
  ],
  contentType: "markdown"
})

const commandTriggerSelection = ref<any>({})
const activeMarks = ref<any>([])

function updateMarks() {
  const { state } = editor.value!
  const { from, to } = state.selection

  activeMarks.value = getMarksBetween(from, to, state.doc)
}

function command() {
  return editor
    .value
    ?.chain()
    .deleteRange(commandTriggerSelection.value)
    .focus()
}

function toggleMark(mark: string, attrs = {}) {
  return editor
    .value
    ?.chain()
    .deleteRange(commandTriggerSelection.value)
    .focus()
    .toggleMark(mark, attrs)
    .run()
}

function toggleNode(node: string, attrs = {}) {
  return editor
    .value
    ?.chain()
    .deleteRange(commandTriggerSelection.value)
    .focus()
    .toggleNode(node, 'paragraph', attrs)
    .run()
}

function toggleWrap(node: string, attrs = {}) {
  return editor
    .value
    ?.chain()
    .deleteRange(commandTriggerSelection.value)
    .focus()
    .toggleWrap(node, attrs)
    .run()
}

function toggleList(node: string, attrs = {}) {
  return editor
    .value
    ?.chain()
    .deleteRange(commandTriggerSelection.value)
    .focus()
    .toggleList(node, 'listItem', true, attrs)
    .run()
}

function shouldshowInline({ state }: any) {
    const { selection } = state
    const { $anchor } = selection

    const textContent = $anchor
      .parent
      .content
      ?.content
      ?.map((node: any) => node.text || "").join("")

    if (textContent.endsWith("/") && textContent !== "/") {
      const parentSize = $anchor.parent.content.size
      const parentOffset = $anchor.parentOffset
      if (parentOffset === parentSize) {
        commandTriggerSelection.value = {
          from: selection.ranges[0].$from.pos - 1,
          to: selection.ranges[0].$to.pos
        }
        return true
      }
    }

    return false
}

function shouldshowBlock({ state }: any) {
    const { selection } = state
    const { $anchor } = selection
    const isRootDepth = $anchor.depth === 1

    const textContent = $anchor.parent.content?.content?.[0]?.text || ""
    if (isRootDepth && textContent === "/") {
      commandTriggerSelection.value = {
        from: selection.ranges[0].$from.pos - 1,
        to: selection.ranges[0].$to.pos
      }
      return true
    }

    return false
}

const vCommandNavigation = {
  mounted(el: HTMLDivElement) {
    document.addEventListener("keydown", (event: KeyboardEvent) => {
      if (event.key === "Tab") {
        const isVisible = el.style.visibility !== "hidden"
        if (isVisible) {
          event.preventDefault()
          event.stopPropagation()
          const currentFocusedCommand = [...el.childNodes]
            .findIndex((val) => (val as HTMLElement).ariaSelected === "true")

          if (currentFocusedCommand === -1) {
            const cel = el.childNodes[0] as HTMLElement
            cel.focus()
            cel.setAttribute("aria-selected", "true")
          } else {
            const nextFocusedCommand = event.shiftKey
              ? (currentFocusedCommand - 1) % el.childNodes.length
              : (currentFocusedCommand + 1) % el.childNodes.length

            const cel = el.childNodes[currentFocusedCommand] as HTMLElement
            const nel = el.childNodes[nextFocusedCommand] as HTMLElement
            nel.focus()
            nel.setAttribute("aria-selected", "true")
            cel.setAttribute("aria-selected", "false")
          }
        }
      } else if (event.key === "Escape") {
        const isVisible = el.style.visibility !== "hidden"
        if (isVisible) {
          event.preventDefault()
          event.stopPropagation()
          editor.value
            ?.chain()
            .deleteRange(commandTriggerSelection.value)
            .focus()
            .run()
        }
      }
    })
  }
}

onMounted(() => {
  editor.value?.on("selectionUpdate", updateMarks)
  editor.value?.on("transaction", updateMarks)
})

</script>

<template>
  <div>
    {{activeMarks}}
  </div>
  <div ref="editorContainer" v-if="editor">
    <EditorContent :editor="editor" />
    <FloatingMenu
      v-command-navigation
      :options="{placement: 'bottom-start'}"
      :appendTo="editorContainer!"
      :editor="editor"
      pluginKey="naoj-editor-block-commands"
      :shouldShow="shouldshowBlock"
      class="flex flex-col gap-2 items-start p-2 bg-stone-800 rounded-lg max-h-2/4 overflow-y-auto"
    >
      <NaojEditorCommand
        icon="lucide:heading-1"
        label="Heading 1"
        command="Ctrl+Alt+1"
        spec="#"
        @click="toggleNode('heading', { level: 1 })"
      >
        <template #header>
          <span class="mt-2 mb-1">
            Block Content
          </span>
        </template>
      </NaojEditorCommand>
      <NaojEditorCommand
        icon="lucide:heading-2"
        label="Heading 2"
        command="Ctrl+Alt+1"
        spec="##"
        @click="toggleNode('heading', { level: 2 })"
      />
      <NaojEditorCommand
        icon="lucide:heading-3"
        label="Heading 3"
        command="Ctrl+Alt+3"
        spec="###"
        @click="toggleNode('heading', { level: 3 })"
      />
      <NaojEditorCommand
        icon="lucide:heading-4"
        label="Heading 4"
        command="Ctrl+Alt+4"
        spec="####"
        @click="toggleNode('heading', { level: 4 })"
      />
      <NaojEditorCommand
        icon="lucide:list"
        label="Bullet List"
        command="Ctrl+Shift+8"
        spec="-"
        @click="toggleList('bulletList')"
      />
      <NaojEditorCommand
        icon="lucide:list-ordered"
        label="Ordered List"
        command="Ctrl+Shift+7"
        spec="1. "
        @click="toggleList('orderedList')"
      />
      <NaojEditorCommand
        icon="lucide:table"
        label="Table"
        @click="editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()"
      />
      <NaojEditorCommand
        icon="lucide:quote"
        label="Blockquote"
        command="Ctrl+Shift+B"
        spec=">"
        @click="toggleWrap('blockquote')"
      />
      <NaojEditorCommand
        icon="lucide:code"
        label="Code Block"
        command="Ctrl+Shift+C"
        spec="```"
        @click="toggleNode('codeBlock')"
      />
      <NaojEditorCommand
        icon="lucide:square-centerline-dashed-vertical"
        label="Horizontal Rule"
        spec="---"
        @click="command()?.setHorizontalRule().run()"
      />
      <NaojEditorCommand
        icon="lucide:italic"
        label="Italic"
        command="Ctrl+I"
        spec="*abc*/_abc_"
        @click="toggleMark('italic')"
      >
        <template #header>
          <span class="mt-2 mb-1">
            Marked Content
          </span>
        </template>
      </NaojEditorCommand>
      <NaojEditorCommand
        icon="lucide:underline"
        label="Underline"
        command="Ctrl+U"
        @click="toggleMark('underline')"
      />
      <NaojEditorCommand
        icon="lucide:code"
        label="Code"
        command="Ctrl+E"
        spec="`abc`"
        @click="toggleMark('code')"
      />
      <NaojEditorCommand
        icon="lucide:bold"
        label="Strike"
        command="Ctrl+Shift+S"
        spec="~~abc~~"
        @click="toggleMark('strike')"
      />

    </FloatingMenu>
    <FloatingMenu
      v-command-navigation
      pluginKey="naoj-editor-inline-commands"
      :options="{placement: 'bottom-start'}"
      :editor="editor"
      :shouldShow="shouldshowInline"
      class="flex flex-col gap-2 items-start p-2 bg-stone-800 rounded-lg"
    >
      <NaojEditorCommand
        icon="lucide:bold"
        label="Bold"
        command="Ctrl+B"
        spec="**abc**"
        @click="toggleMark('bold')"
      />
      <NaojEditorCommand
        icon="lucide:italic"
        label="Italic"
        command="Ctrl+I"
        spec="*abc*/_abc_"
        @click="toggleMark('italic')"
      />
      <NaojEditorCommand
        icon="lucide:underline"
        label="Underline"
        command="Ctrl+U"
        @click="toggleMark('underline')"
      />
      <NaojEditorCommand
        :ariaSelected="editor.isActive('code')"
        class="aria-selected:bg-yellow-500!"
        icon="lucide:code"
        label="Code"
        command="Ctrl+E"
        spec="`abc`"
        @click="toggleMark('code')"
      />
      <NaojEditorCommand
        icon="lucide:bold"
        label="Strike"
        command="Ctrl+Shift+S"
        spec="~~abc~~"
        @click="toggleMark('strike')"
      />
    </FloatingMenu>
  </div>
</template>

