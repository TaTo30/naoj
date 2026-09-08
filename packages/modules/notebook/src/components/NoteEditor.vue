<script setup lang="ts">
import { ref, watch, computed, nextTick, onBeforeUnmount, watchEffect } from "vue";
import { useRoute, useRouter } from "vue-router";
import { Icon } from "@iconify/vue";
import { NaojEditor } from "@naoj/components";
import { useNotes } from "../composables/useNotes.ts";
import type { INote } from "../composables/useNotes.ts";

const route = useRoute();
const router = useRouter();
const { getNoteById } = useNotes();

const note = ref<INote | null>(null);
const contentValue = ref("");

const noteId = computed(() => {
  const id = route.params["id"];
  return id ? Number(id) : null;
});

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
      <div class="flex justify-center mt-24">
        <div class="flex flex-col w-[920px] border border-yellow-200 overflow-auto">
          <div>
            commands
          </div>
          <div>
            <NaojEditor v-model="contentValue" />
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
