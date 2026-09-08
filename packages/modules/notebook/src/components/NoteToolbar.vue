<script setup lang="ts">
import { computed } from "vue";
import { useRoute } from "vue-router";
import { Icon } from "@iconify/vue";
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
  <div class="flex items-center gap-1.5 px-1 h-full text-sm min-w-0">
    <Icon
      icon="material-symbols:edit-note-rounded"
      height="15"
      class="text-orange-400 flex-shrink-0"
    />
    <span v-if="activeNote" class="font-medium text-stone-600 dark:text-stone-300 truncate">
      {{ activeNote.title || "Untitled" }}
    </span>
    <span v-else class="text-stone-400 dark:text-stone-500">Notebook</span>
  </div>
</template>
