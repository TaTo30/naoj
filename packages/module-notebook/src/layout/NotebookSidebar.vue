<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useRouter } from "vue-router"

import { Icon } from "@iconify/vue";
import { Dropdown } from "floating-vue"

import  NaojTreeView  from "../components/NaojTreeView.vue";

import  useNotebook from "../composables/useNotebook";

const { files, isLoading, refresh } = useNotebook();
const { push } = useRouter()

const actions = ref({
  create: false
})

const notesPath = computed(() => {
  return files.value.map(val => {
    return {
      id: val.id.toString(),
      path: val.path
    }
  })
})

async function handleCreate(evt: Event) {
  const target = evt.target as HTMLFormElement
  const formData = new FormData(target)

  // await createNote(formData.get("input-create-note") as string)

  actions.value.create = false
}

onMounted(refresh);
</script>

<template>
  <div
    class="flex flex-col h-full select-none"
  >
    <!-- Sidebar header -->
    <div class="flex items-center justify-center">
      <button
        :aria-selected="actions.create"
        @click.stop="actions.create= !actions.create"
        class="size-8 rounded-xs flex items-center justify-center text-foreground
        hover:bg-foreground/10 aria-selected:bg-foreground/10"
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
          <button class="flex items-center justify-center size-8 rounded text-foreground hover:bg-foreground/10" title="Create note" type="submit">
            <Icon icon="lucide:plus" height="16" />
          </button>
        </form>
        <div class="text-xs italic opacity-60">
          Use '/' to create directories. (eg. 'directory/myNote')
        </div>
      </div>
    </div>

    <!-- Tree -->
    <div class="flex-1 min-h-0 overflow-y-auto py-2 px-1 text-foreground">
      <NaojTreeView :items="notesPath">
        <template #directory="props">
          <summary
            class="flex items-center justify-between cursor-pointer py-0.5 pr-1 rounded
            hover:bg-foreground/10"
            :style="{paddingLeft: 4 + 16 * props.level + 'px'}"
          >
            <div class="flex items-center justify-start gap-2">
              <Icon v-if="!props.isOpen" icon="lucide:chevron-right" size="20" />
              <Icon v-else icon="lucide:chevron-down" size="20" />
              <div>
                {{ props.label }}
              </div>
            </div>
            <Dropdown :distance="6" placement="bottom-start">
              <button class="btn size-6 rounded z-50">
                <Icon icon="lucide:ellipsis-vertical" />
              </button>
              <template #popper>
                hola mundo
              </template>
            </Dropdown>
          </summary>
        </template>
        <template #file="props">
          <div
              @click="push({ name: 'note-view', params: { id: props.id } })"
            class="flex items-center justify-between cursor-pointer py-0.5 px-1 rounded
            hover:bg-foreground/10"
            :style="{paddingLeft: 4 + 16 * props.level + 'px'}"
          >
            <div class="flex items-center justify-start gap-2">
              <Icon icon="lucide:square-dashed-text" />
              <div>
                {{ props.label }}
              </div>
            </div>
          </div>
        </template>
      </NaojTreeView>

      <!-- Empty state -->
      <div
        v-if="!files.length && !isLoading"
        class="mt-4 flex flex-col items-center gap-2 py-6 text-foreground"
      >
        <Icon icon="material-symbols:edit-note-outline-rounded" height="28" />
        <p class="text-xs text-foreground">No notes yet</p>
      </div>
    </div>
  </div>

</template>
