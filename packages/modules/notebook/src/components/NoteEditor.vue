<script setup lang="ts">
import { ref, watch, computed, nextTick, onBeforeUnmount } from "vue";
import { useRoute, useRouter } from "vue-router";
import { NotebookPen, Trash2 } from "lucide-vue-next";
import { NaojEditor } from "@naoj/components";
import { useNotes } from "../composables/useNotes.ts";
import type { INote } from "../composables/useNotes.ts";

const route = useRoute();
const router = useRouter();
const { getNoteById, updateNote, deleteNote } = useNotes();

const note = ref<INote | null>(null);
const titleInput = ref("");
const contentValue = ref("");
let _saveTimer: ReturnType<typeof setTimeout> | undefined;

const noteId = computed(() => {
  const id = route.params["id"];
  return id ? Number(id) : null;
});

async function loadNote(id: number) {
  note.value = await getNoteById(id);
  if (note.value) {
    titleInput.value = note.value.title;
    contentValue.value = note.value.content;
  }
  // Cancel the save the watcher scheduled during data load
  await nextTick();
  clearTimeout(_saveTimer);
}

function scheduleSave() {
  clearTimeout(_saveTimer);
  if (!note.value) return;
  _saveTimer = setTimeout(async () => {
    if (!note.value) return;
    await updateNote(note.value.id, {
      title: titleInput.value,
      content: contentValue.value,
    });
  }, 800);
}

watch(
  noteId,
  async (id) => {
    if (id !== null) await loadNote(id);
    else note.value = null;
  },
  { immediate: true },
);

watch([titleInput, contentValue], scheduleSave);

async function handleDelete() {
  if (!note.value) return;
  const id = note.value.id;
  await deleteNote(id);
  await router.push({ name: "notes" });
}

onBeforeUnmount(() => clearTimeout(_saveTimer));
</script>

<template>
  <div class="flex flex-col h-full bg-white dark:bg-stone-950">
    <!-- Empty state -->
    <div
      v-if="!note"
      class="flex flex-col items-center justify-center h-full gap-4 text-stone-200 dark:text-stone-700"
    >
      <NotebookPen :size="48" :stroke-width="1" />
      <div class="text-center">
        <p class="text-sm font-medium text-stone-400 dark:text-stone-500">No note selected</p>
        <p class="text-xs text-stone-300 dark:text-stone-600 mt-1">
          Pick one from the list or create a new one
        </p>
      </div>
    </div>

    <!-- Editor -->
    <template v-else>
      <div class="px-8 pt-7 pb-3 flex-shrink-0 border-b border-stone-100 dark:border-stone-800">
        <input
          v-model="titleInput"
          type="text"
          placeholder="Untitled Note"
          class="w-full text-2xl font-bold bg-transparent border-none outline-none text-stone-900 dark:text-stone-50 placeholder-stone-200 dark:placeholder-stone-700"
        />
      </div>

      <div class="flex-1 overflow-y-auto px-8 py-5 text-stone-800 dark:text-stone-200">
        <NaojEditor v-model="contentValue" />
      </div>

      <!-- Delete footer -->
      <div
        class="flex justify-end px-6 py-2 border-t border-stone-100 dark:border-stone-800 flex-shrink-0"
      >
        <button
          class="flex items-center gap-1.5 text-xs text-stone-300 dark:text-stone-600 hover:text-red-500 dark:hover:text-red-400 transition-colors"
          @click="handleDelete"
        >
          <Trash2 :size="12" />
          Delete note
        </button>
      </div>
    </template>
  </div>
</template>
