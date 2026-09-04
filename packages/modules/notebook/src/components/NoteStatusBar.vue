<script setup lang="ts">
import { computed } from "vue";
import { useNotes } from "../composables/useNotes.ts";
import { useRoute } from "vue-router";
import { NotebookText, Hash } from "lucide-vue-next";

const route = useRoute();
const { notes, noteCount } = useNotes();

const activeNote = computed(() => {
  const id = route.params["id"];
  if (!id) return null;
  return notes.value.find((n) => n.id === Number(id)) ?? null;
});

const wordCount = computed(() => {
  if (!activeNote.value?.content) return 0;
  return activeNote.value.content.trim().split(/\s+/).filter(Boolean).length;
});
</script>

<template>
  <div class="flex items-center gap-4 px-4 h-full text-xs text-stone-500 dark:text-stone-400">
    <span class="flex items-center gap-1">
      <NotebookText :size="11" />
      {{ noteCount }} {{ noteCount === 1 ? "note" : "notes" }}
    </span>
    <span v-if="activeNote" class="flex items-center gap-1">
      <Hash :size="11" />
      {{ wordCount }} {{ wordCount === 1 ? "word" : "words" }}
    </span>
  </div>
</template>
