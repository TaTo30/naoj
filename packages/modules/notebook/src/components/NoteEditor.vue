<script setup lang="ts">
import { ref, computed,  watchEffect, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { Icon } from "@iconify/vue";
import { NaojEditor } from "@naoj/components";
import { useNotes } from "../composables/useNotes.ts";
import type { INote } from "../composables/useNotes.ts";

const route = useRoute();
const router = useRouter();
const { getNoteById, createNote, updateNote } = useNotes();

const note = ref<INote | null>(null);
const contentValue = ref("");

const noteId = computed(() => {
  const id = route.params["id"];
  return id ? Number(id) : null;
});

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

// Load the content of the selected note each time it changes
watchEffect(async () => {
  if (noteId.value !== null){
    note.value = await getNoteById(noteId.value)
    if (note.value){
      contentValue.value = note.value.content;
    }
  } else {
    note.value = null;
  }
})

onMounted(async () => {
  const id = await createNote("/sample")

  updateNote(id, {
    content: sample,
    title: "Sample Note",
  })
})
</script>

<template>
  <div class="flex flex-col h-full bg-white dark:bg-stone-950  overflow-y-auto">
    <!-- Empty state -->
    <div v-if="!note" class="flex flex-col items-center justify-center h-full gap-3 select-none">
      <div
        class="p-5 rounded-2xl bg-stone-100 dark:bg-stone-900 text-stone-300 dark:text-stone-600"
      >
        <Icon icon="material-symbols:edit-note-rounded" height="40" />
      </div>
      <div class="text-center">
        <p class="text-sm font-medium text-stone-400 dark:text-stone-500">No note selected</p>
        <p class="text-xs text-stone-300 dark:text-stone-600 mt-1">
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
