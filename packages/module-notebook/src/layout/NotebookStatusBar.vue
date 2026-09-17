<script setup lang="ts">
import { computed } from "vue";
import { useRoute } from "vue-router";
import { Icon } from "@iconify/vue";

import useNotebook from "../composables/useNotebook";

const route = useRoute();
const { files } = useNotebook();

const activeNote = computed(() => {
  const id = route.params["id"];
  if (!id) return null;
  return files.value.find((n) => n.id === Number(id)) ?? null;
});

const wordCount = computed(() => {
  if (!activeNote.value?.content) return 0;
  return activeNote.value.content.trim().split(/\s+/).filter(Boolean).length;
});
</script>

<template>
  <div class="flex items-center gap-3 px-4 h-full text-xs text-stone-400 dark:text-stone-500">
    <span class="flex items-center gap-1">
      <Icon icon="material-symbols:library-books-outline-rounded" height="12" />
      {{ files.length }} {{ files.length === 1 ? "note" : "notes" }}
    </span>
    <template v-if="activeNote">
      <span class="text-stone-300 dark:text-stone-700">·</span>
      <span class="flex items-center gap-1">
        <Icon icon="material-symbols:format-size-rounded" height="12" />
        {{ wordCount }} {{ wordCount === 1 ? "word" : "words" }}
      </span>
    </template>
  </div>
</template>
