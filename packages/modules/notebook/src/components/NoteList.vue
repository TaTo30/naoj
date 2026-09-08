<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useRouter } from "vue-router"

import { Icon } from "@iconify/vue";
import { Dropdown } from "floating-vue"

import { NaojTreeView } from "@naoj/components";

import { useNotes } from "../composables/useNotes.ts";

const { notes, isLoading, loadNotes, createNote } = useNotes();
const { push } = useRouter()

const actions = ref({
  create: false
})

const notesPath = computed(() => {
  return notes.value.map(val => {
    return {
      id: val.id.toString(),
      path: val.path
    }
  })
})

async function handleCreate(evt: Event) {
  const target = evt.target as HTMLFormElement
  const formData = new FormData(target)

  await createNote(formData.get("input-create-note") as string)

  actions.value.create = false
}

onMounted(loadNotes);
</script>

<template>
  <div
    class="flex flex-col h-full bg-stone-50 dark:bg-stone-900 select-none"
  >
    <!-- Sidebar header -->
    <div class="header justify-center">

      <button
        :aria-selected="actions.create" @click.stop="actions.create= !actions.create"
        class="btn size-8 rounded"
        title="Create note"
      >
        <Icon icon="lucide:plus" height="16" />
      </button>
    </div>

    <div class="px-2 py-1">
      <div v-if="actions.create" class="flex flex-col">
        <form @submit.prevent="handleCreate" class="flex items-center gap-2">
          <input
            ref="ref-create-note"
            name="input-create-note"
            type="text"
            placeholder="Note title..."
            class="w-full p-2 text-sm focus:outline-none"
            required
          />
          <button class="btn size-8 rounded" title="Create note" type="submit">
            <Icon icon="lucide:plus" height="16" />
          </button>
        </form>
        <div class="text-xs italic opacity-60">
          Use '/' to create the notes under a directory. (eg. 'directory/note')
        </div>
      </div>
    </div>

    <!-- Tree -->
    <div class="flex-1 min-h-0 overflow-y-auto px-2 py-2">
      <NaojTreeView :items="notesPath">
        <template #directory="props">
          <summary
            class="flex items-center justify-between cursor-pointer hover:bg-black/10
                   dark:hover:bg-white/10 py-0.5 pr-1 rounded"
            :style="{paddingLeft: 4 + 16 * props.level + 'px'}"
          >
            <div class="flex items-center justify-start gap-2 group">
              <Icon icon="lucide:folder" size="16" />
              <div>
                {{ props.label }}
              </div>
            </div>
            <!-- <Dropdown :distance="6" placement="bottom-start"> -->
            <!--   <button class="btn size-6 rounded z-50"> -->
            <!--     <Icon icon="lucide:ellipsis-vertical" /> -->
            <!--   </button> -->
            <!--   <template #popper> -->
            <!--     hola mundo -->
            <!--   </template> -->
            <!-- </Dropdown> -->
          </summary>
        </template>
        <template #file="props">
          <div
              @click="push({ name: 'note-view', params: { id: props.id } })"
            class="flex items-center justify-between cursor-pointer hover:bg-black/10 dark:hover:bg-white/10 py-0.5 px-1 rounded"
            :style="{paddingLeft: 4 + 16 * props.level + 'px'}"
          >
            <div class="flex items-center justify-start gap-2">
              <Icon icon="lucide:file-text" />
              <div>
                {{ props.label }}
              </div>
            </div>
          </div>
        </template>
      </NaojTreeView>

      <!-- Empty state -->
      <div
        v-if="!notes.length && !isLoading"
        class="mt-4 flex flex-col items-center gap-2 py-6 text-stone-300 dark:text-stone-700"
      >
        <Icon icon="material-symbols:edit-note-outline-rounded" height="28" />
        <p class="text-xs text-stone-400 dark:text-stone-500">No notes yet</p>
      </div>
    </div>
  </div>

</template>
