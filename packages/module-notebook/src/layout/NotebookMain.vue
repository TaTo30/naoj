<script setup lang="ts">
import {  onMounted } from "vue";
import { Icon } from "@iconify/vue";
import { useDatabase } from "@naoj/core";

import useNotebook from "../composables/useNotebook";

import  NaojEditor  from "../components/NaojEditor.vue";

const { notes, selectedNote, refresh } = useNotebook()
const db = useDatabase()

const sample = `
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

### Images

![Random Image](https://unsplash.it/400/600 "Tiptap Editor")

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

`

onMounted(async () => {
  await db.from("notebook_notes").insert({
    title: "part1",
    content: sample,
    tags: "[]",
    path: "/note",
    deleted: 0
  })
  await db.from("notebook_notes").insert({
    title: "part2",
    content: sample,
    tags: "[]",
    path: "/directory/subdir/part2",
    deleted: 0
  })

  await refresh()
})


</script>

<template>
  <div class="flex flex-col h-full overflow-y-auto">
    {{notes}}
    {{selectedNote}}
    <!-- Empty state -->
    <div v-if="!selectedNote" class="flex flex-col items-center justify-center h-full gap-3 select-none">
      <div
        class="p-5 rounded-2xl"
      >
        <Icon icon="material-symbols:edit-note-rounded" height="40" />
      </div>
      <div class="text-center">
        <p class="text-sm font-medium">No note selected</p>
        <p class="text-xs mt-1">
          Pick one from the list or create a new one
        </p>
      </div>
    </div>

    <!-- Editor -->
    <template v-else>
      <div
        class="flex shrink-0 justify-center items-center h-10 sticky top-0 dark:bg-stone-950 z-10"
      >
        <div class="w-[920px]">
          commands
        </div>
      </div>
      <div class="flex justify-center my-24">
        <div class="flex flex-col w-[920px] border border-yellow-200 overflow-auto">
          <div>
            <NaojEditor v-model="contentValue" />
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
