<script setup lang="ts">
import { ref, computed, nextTick, onMounted } from "vue";
import { useRouter, useRoute } from "vue-router";
import { Icon } from "@iconify/vue";
import { useNotes } from "../composables/useNotes.ts";
import type { INote } from "../composables/useNotes.ts";

import { NaojTreeView } from "@naoj/components";

const router = useRouter();
const route = useRoute();
const { notes, isLoading, loadNotes, createNote, updateNote, deleteNote, duplicateNote } =
  useNotes();

const activeNoteId = computed(() => {
  const id = route.params["id"];
  return id ? Number(id) : null;
});

// Inline rename state
const renamingId = ref<number | null>(null);
const renamingTitle = ref("");

const notesTreeview = computed(() => {
  return notes.value.map((note) => {
    return {
      path: note.path || "untitled",
      id: note.id
    }
  })
})

// Options menu state
const menuOpenId = ref<number | null>(null);

function toggleMenu(id: number, event: MouseEvent) {
  event.stopPropagation();
  if (menuOpenId.value === id) {
    menuOpenId.value = null;
    return;
  }
  menuOpenId.value = id;
  // Close when user clicks anywhere outside the dropdown
  setTimeout(
    () => document.addEventListener("click", () => (menuOpenId.value = null), { once: true }),
    0,
  );
}

async function startRename(note: INote) {
  renamingId.value = note.id;
  renamingTitle.value = note.title;
  menuOpenId.value = null;
  await nextTick();
  const el = document.getElementById(`rename-${note.id}`);
  if (el instanceof HTMLInputElement) {
    el.focus();
    el.select();
  }
}

async function commitRename(id: number) {
  if (renamingId.value !== id) return;
  const trimmed = renamingTitle.value.trim();
  if (trimmed) await updateNote(id, { title: trimmed });
  renamingId.value = null;
}

async function handleDelete(id: number) {
  menuOpenId.value = null;
  await deleteNote(id);
  if (activeNoteId.value === id) await router.push({ name: "notes" });
}

async function handleDuplicate(note: INote) {
  menuOpenId.value = null;
  const id = await duplicateNote(note.id);
  await router.push({ name: "note-view", params: { id } });
}

function handleExport(note: INote) {
  menuOpenId.value = null;
  const blob = new Blob([note.content], { type: "text/markdown" });
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement("a"), {
    href: url,
    download: `${note.title || "untitled"}.md`,
  });
  a.click();
  URL.revokeObjectURL(url);
}

async function handleCreate() {
  const id = await createNote();
  console.log("Created note with ID:", id);
  await router.push({ name: "note-view", params: { id } });
}

onMounted(loadNotes);
</script>

<template>
  <div
    class="flex flex-col h-full bg-stone-50 dark:bg-stone-900 select-none"
    @click="menuOpenId = null"
  >

  <div class="flex-1 min-h-0 overflow-y-auto px-2 py-2">
    <NaojTreeView
      :items="notesTreeview"
      class="rounded-xl border border-stone-200/70 bg-white/80 p-2 shadow-sm
             dark:border-stone-700/60 dark:bg-stone-900/80"
    >
      <template #item="{ label, level, id, isDir }">
        <div
          class="group relative flex min-w-0 cursor-pointer items-center gap-2
                 rounded-lg px-2 py-1.5 text-sm
                 text-stone-600 transition-all duration-150
                 hover:bg-stone-100 hover:text-stone-900
                 dark:text-stone-400 dark:hover:bg-stone-800/80 dark:hover:text-stone-100"
          :style="{ marginLeft: `${level * 16}px` }"
        >
          <!-- Indentation guide -->
          <div
            v-if="level > 0"
            class="pointer-events-none absolute -left-2 top-0 bottom-0 w-px
                   bg-stone-200 dark:bg-stone-700"
          />

          <!-- Icon -->
          <span
            class="flex h-5 w-5 shrink-0 items-center justify-center
                   text-stone-400 transition-colors
                   group-hover:text-stone-600
                   dark:text-stone-500 dark:group-hover:text-stone-300"
          >
            <Icon
              v-if="isDir"
              icon="material-symbols:folder-rounded"
              height="18"
            />

            <Icon
              v-else
              icon="material-symbols:insert-drive-file-rounded"
              height="18"
            />
          </span>

          <!-- Name -->
          <span class="min-w-0 truncate">
            {{ label }}
          </span>
        </div>
      </template>
    </NaojTreeView>
  </div>



    <!-- New note button -->
    <div class="flex-shrink-0 border-t border-stone-200 dark:border-stone-800 p-2">
      <button
        class="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium text-stone-500 dark:text-stone-400 hover:text-orange-500 dark:hover:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-950/20 transition-colors"
        @click.stop="handleCreate"
      >
        <Plus :size="15" />
        New note
      </button>
    </div>
  </div>
</template>
