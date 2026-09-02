<script setup lang="ts">
import { computed } from "vue";
import { useRoute } from "vue-router";
import { FileText } from "lucide-vue-next";
import { useNotes } from "../composables/useNotes.ts";

const route = useRoute();
const { notes } = useNotes();

const activeNote = computed(() => {
  const id = route.params["id"];
  if (!id) return null;
  return notes.value.find((n) => n.id === Number(id)) ?? null;
});
</script>

<template>
  <div class="flex items-center gap-2 px-3 h-full text-sm">
    <FileText :size="14" class="text-orange-400 flex-shrink-0" />
    <span v-if="activeNote" class="font-medium text-stone-700 dark:text-stone-200 truncate">
      {{ activeNote.title || "Untitled" }}
    </span>
    <span v-else class="text-stone-400 dark:text-stone-500">Notes</span>
  </div>
</template>
