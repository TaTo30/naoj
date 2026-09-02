<script setup lang="ts">
import { watch, onBeforeUnmount } from 'vue'
import { useEditor, EditorContent } from "@tiptap/vue-3"
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
import { common, createLowlight } from "lowlight"

const props = withDefaults(defineProps<{ modelValue?: string }>(), { modelValue: '' })
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

const lowlight = createLowlight(common)

const editor = useEditor({
  content: props.modelValue,
  onUpdate: ({ editor: e }) => {
    const md = (e.storage.markdown as unknown as { getMarkdown: () => string } | undefined)?.getMarkdown() ?? e.getText()
    emit('update:modelValue', md)
  },

  extensions: [
    Document,
    Paragraph,
    Heading,
    Text,
    TextStyleKit,
    HardBreak,
    Underline,
    Italic,
    Bold,
    CodeBlockLowlight.configure({
      lowlight
    }),
    Markdown
  ],
  contentType: "markdown"
})

watch(() => props.modelValue, (newVal) => {
  if (!editor.value) return
  const current = (editor.value.storage.markdown as unknown as { getMarkdown: () => string } | undefined)?.getMarkdown() ?? ''
  if (newVal !== current) {
    editor.value.commands.setContent(newVal ?? '')
  }
})

defineExpose({ editor })

onBeforeUnmount(() => editor.value?.destroy())
</script>

<template>
  <editor-content :editor="editor" />
</template>
