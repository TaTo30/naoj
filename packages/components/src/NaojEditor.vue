<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, useTemplateRef } from "vue";

import { useEditor, EditorContent} from "@tiptap/vue-3"
import { Extension, getMarksBetween } from "@tiptap/core"
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

import { common, createLowlight } from "lowlight"
import { Icon } from "@iconify/vue"

import NaojEditorCommand from "./NaojEditorCommand.vue"

import  "./main.css"
import "highlight.js/styles/github-dark.css"

const lowlight = createLowlight(common)
console.log(common)

const keymaps = Extension.create({
  name: "naojKeymaps",
  // @ts-ignore
  addKeyboardShortcuts() {
    return {
      "Escape": ({editor}) => {
        if (activeMarks.value.length > 0){
          activeMarks.value.forEach((val: any) => {
            const activeMark = val.mark.type.name
            editor.chain().focus().toggleMark(activeMark).run()
          })
          editor.commands.insertContent(" ", { updateSelection: true })
        }
      }
    }
  }
})

const modelValue = defineModel<string>({ required: true, default: "" })

const editorContainer = useTemplateRef("editorContainer")
const linkPrompt = useTemplateRef("link-prompt")
const editor = useEditor({
  content: modelValue.value,
  extensions: [
    keymaps,
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
    CodeBlockLowlight.configure({
      lowlight,
      defaultLanguage: "plaintext"
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
const linkRequested = ref({
  type: "link",
  requested: false,
  prompt: ""
})

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

function promptLink(type: string) {
  if (editor.value!.isActive('link')) {
    return toggleLink()
  }

  linkRequested.value = {
    type,
    requested: true,
    prompt: ""
  }

  command()!.run()
  setTimeout(() => {
    linkPrompt.value?.focus()
  }, 0)
}

function closePromptLink(){
  linkRequested.value = {
    type: "link",
    requested: false,
    prompt: ""
  }

  command()!.run()
}

function toggleLink() {
  if (linkRequested.value.type === "link") {
    if (editor.value?.isActive('link')) {
      editor.value
        ?.chain()
        .focus()
        .extendMarkRange('link')
        .unsetLink()
        .run()
    } else {
      editor.value
        ?.chain()
        .focus()
        .extendMarkRange('link')
        .setLink({ href: linkRequested.value.prompt })
        .run()
    }
  } else if (linkRequested.value.type === "image") {
    editor.value
      ?.chain()
      .focus()
      .setImage({ src: linkRequested.value.prompt })
      .setTextSelection(editor.value!.state.selection.from + 1)
      .run()
  }

  linkRequested.value = {
    type: "link",
    requested: false,
    prompt: ""
  }
}

function toggleMark(mark: string, attrs = {}) {
  return command()
    ?.toggleMark(mark, attrs)
    .run()
}

function toggleNode(node: string, attrs = {}) {
  return command()
    ?.toggleNode(node, 'paragraph', attrs)
    .run()
}

function toggleWrap(node: string, attrs = {}) {
  return command()
    ?.toggleWrap(node, attrs)
    .run()
}

function toggleList(node: string, attrs = {}) {
  return command()
    ?.toggleList(node, 'listItem', true, attrs)
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
          const childNodes = [...el.childNodes].filter(val => (val as HTMLElement).tagName === "BUTTON")
          const currentFocusedCommand = childNodes.findIndex((val) => (val as HTMLElement).ariaSelected === "true")

          if (currentFocusedCommand === -1) {
            const cel = childNodes[0] as HTMLElement
            cel.focus()
            cel.setAttribute("aria-selected", "true")
          } else {
            const nextFocusedCommand = event.shiftKey
              ? (currentFocusedCommand - 1) % childNodes.length
              : (currentFocusedCommand + 1) % childNodes.length

            const cel = childNodes[currentFocusedCommand] as HTMLElement
            const nel = childNodes[nextFocusedCommand] as HTMLElement
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

const markedCommands = [
  {
    icon: "lucide:bold",
    label: "Bold",
    command: "Ctrl+B",
    spec: "**abc**",
    action: () => toggleMark('bold')
  },
  {
    icon: "lucide:italic",
    label: "Italic",
    command: "Ctrl+I",
    spec: "*abc*/_abc_",
    action: () => toggleMark('italic')
  },
  {
    icon: "lucide:underline",
    label: "Underline",
    command: "Ctrl+U",
    action: () => toggleMark('underline')
  },
  {
    icon: "lucide:code",
    label: "Code",
    command: "Ctrl+E",
    spec: "`abc`",
    action: () => toggleMark('code')
  },
  {
    icon: "lucide:link",
    label: "Link",
    action: () => promptLink('link')
  }
]

const blockCommands = [
  {
    icon: "lucide:heading-1",
    label: "Heading 1",
    command: "Ctrl+Alt+1",
    spec: "#",
    action: () => toggleNode('heading', { level: 1 })
  },
  {
    icon: "lucide:heading-2",
    label: "Heading 2",
    command: "Ctrl+Alt+2",
    spec: "##",
    action: () => toggleNode('heading', { level: 2 })
  },
  {
    icon: "lucide:heading-3",
    label: "Heading 3",
    command: "Ctrl+Alt+3",
    spec: "###",
    action: () => toggleNode('heading', { level: 3 })
  },
  {
    icon: "lucide:list",
    label: "Bullet List",
    command: "Ctrl+Shift+8",
    spec: "-",
    action: () => toggleList('bulletList')
  },
  {
    icon: "lucide:list-ordered",
    label: "Ordered List",
    command: "Ctrl+Shift+7",
    spec: "1. ",
    action: () => toggleList('orderedList')
  },
  {
    icon: "lucide:table",
    label: "Table",
    action: () => command()?.insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
  },
  {
    icon: "lucide:image",
    label: "Image",
    action: () => promptLink('image')
  },
  {
    icon: "lucide:quote",
    label: "Blockquote",
    command: "Ctrl+Shift+B",
    spec: ">",
    action: () => toggleWrap('blockquote')
  },
  {
    icon: "lucide:code",
    label: "Code Block",
    command: "Ctrl+Shift+C",
    spec: "```",
    action: () => {
        const currentPos = editor.value!.state.selection.from
        command()
        ?.insertContent("```plaintext", { updateSelection: true })
        .setTextSelection({ from: currentPos + 2, to: currentPos + 12 })
        .run()
    }
  },
  {
    icon: "lucide:square-centerline-dashed-vertical",
    label: "Horizontal Rule",
    spec: "---",
    action: () => command()?.setHorizontalRule().run()
  },
]

onMounted(() => {
  editor.value?.on("selectionUpdate", updateMarks)
  editor.value?.on("transaction", updateMarks)
})

onBeforeUnmount(() => {
  editor.value?.off("selectionUpdate", updateMarks)
  editor.value?.off("transaction", updateMarks)
})

</script>

<template>
  <div>
    {{activeMarks}}
  </div>
  <div ref="editorContainer" v-if="editor">
    <EditorContent :editor="editor" />
    <FloatingMenu
      :appendTo="editorContainer!"
      :editor="editor"
      pluginKey="naoj-editor-link-prompt"
      :shouldShow="() => linkRequested.requested"
    >
      <div class="flex gap-2 items-center p-2 rounded justify-between">
        <div>
          <input
            v-model="linkRequested.prompt"
            type="text"
            ref="link-prompt"
            placeholder="Enter link URL"
            class="p-1 rounded w-64"
            @keypress.enter="toggleLink"
          />
        </div>
        <div class="flex gap-2">
          <Icon @click="toggleLink" icon="lucide:check" height="20" class="cursor-pointer" />
          <button @click="closePromptLink" >
            <Icon icon="lucide:x" height="20" class="cursor-pointer" />
          </button>
        </div>
      </div>
    </FloatingMenu>
    <FloatingMenu
      v-command-navigation
      :options="{placement: 'bottom-start'}"
      :appendTo="editorContainer!"
      :editor="editor"
      pluginKey="naoj-editor-block-commands"
      :shouldShow="shouldshowBlock"
      class="flex flex-col gap-2 items-start p-2 bg-stone-800 rounded-lg overflow-y-auto"
    >
      <div class="flex justify-start opacity-50 font-semibold text-sm">
        Block Content
      </div>
      <NaojEditorCommand
        v-for="command in blockCommands"
        :key="command.label"
        :icon="command.icon"
        :label="command.label"
        :command="command.command"
        :spec="command.spec"
        @click="command.action()"
      />
      <div class="flex justify-start opacity-50 font-semibold text-sm mt-2">
        Marked Content
      </div>
      <NaojEditorCommand
        v-for="command in markedCommands"
        :key="command.label"
        :icon="command.icon"
        :label="command.label"
        :command="command.command"
        :spec="command.spec"
        @click="command.action()"
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
        v-for="command in markedCommands"
        :key="command.label"
        :icon="command.icon"
        :label="command.label"
        :command="command.command"
        :spec="command.spec"
        @click="command.action()"
      />
    </FloatingMenu>
  </div>
</template>

