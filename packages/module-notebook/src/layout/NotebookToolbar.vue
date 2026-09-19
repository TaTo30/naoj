<script setup lang="ts">
import { useRouter } from "vue-router";
import { Icon } from "@iconify/vue";
import useNotebook from "../composables/useNotebook";

const router = useRouter()
const { tabs, selectedTab, removeTab } = useNotebook();

</script>

<template>
  <div class="flex justify-between w-full">
    <div class="flex items-center h-full">
      <div
        :aria-selected="note.id === selectedTab!.id"
        class="group flex items-center cursor-pointer h-full hover:bg-crust
         aria-selected:bg-crust aria-selected:rounded-b-xl px-4 py-1 gap-2
         min-w-50 justify-between"
        v-for="note in tabs"
        :key="note.id"
        @click="router.replace({ name: 'note-view', params: { id: note.id } })"
      >
        <div>
          {{ note.name }}
        </div>
        <div @click.stop="removeTab(note.id)" class="flex items-center justify-center text-subtext hover:text-maintext size-6">
          <Icon icon="lucide:x" height="18" />
        </div>
      </div>
    </div>
    <div class="flex items-center bg-primary text-crust rounded-bl-xl h-full">
      <button class="flex items-center justify-center size-8 hover:bg-base/10">
        <Icon icon="lucide:plus" height="18" />
      </button>
      <button class="flex items-center justify-center size-8 hover:bg-base/10">
        <Icon icon="lucide:circle-question-mark" height="18" />
      </button>
    </div>
  </div>
</template>
