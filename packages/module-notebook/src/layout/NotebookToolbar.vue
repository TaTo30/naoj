<script setup lang="ts">
import { useRouter } from "vue-router";
import { Icon } from "@iconify/vue";
import useNotebook from "../composables/useNotebook";

const router = useRouter()
const { notes, selectedNote } = useNotebook();

</script>

<template>
  <div class="flex items-center text-foreground">
    <div
      :aria-selected="note.id === selectedNote!.id"
      class="flex items-center cursor-pointer hover:bg-background bg-background/50
       aria-selected:bg-background/0 px-2 py-1 gap-2"
      v-for="note in notes"
      :key="note.id"
      @click="router.replace({ name: 'note-view', params: { id: note.id } })"
    >
      <div>
        <Icon
          icon="lucide:circle-dashed"
          height="12"
        />
      </div>
      <div>
        Notes name {{ note.id }}
      </div>
    </div>
  </div>
</template>
