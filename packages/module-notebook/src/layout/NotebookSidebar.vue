<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useRouter } from "vue-router"

import { Icon } from "@iconify/vue";
import { Dropdown } from "floating-vue"

import NaojTreeView from "../components/NaojTreeView.vue";
import useNotebook from "../composables/useNotebook";

const { notes, isLoading, refresh, createNote, removePath, duplicateNote, moveNotePath } = useNotebook();
const { push } = useRouter()

const actions = ref({
  create: false,
  rename: {
    active: false,
    id: null as number | null,
    currentPath: ''
  }
})

const notesPath = computed(() => {
  return notes.value.map(val => ({
    id: val.id.toString(),
    path: val.path
  }))
})

async function handleCreate(evt: Event) {
  const target = evt.target as HTMLFormElement
  const formData = new FormData(target)
  const notePath = formData.get("input-create-note") as string
  await createNote(notePath)
  actions.value.create = false
  target.reset()
}

function startRename(id: string, path: string) {
  actions.value.create = false
  actions.value.rename = { active: true, id: Number(id), currentPath: path }
}

function cancelRename() {
  actions.value.rename = { active: false, id: null, currentPath: '' }
}

async function handleRename(evt: Event) {
  const target = evt.target as HTMLFormElement
  const formData = new FormData(target)
  const newPath = formData.get("input-rename-note") as string
  if (actions.value.rename.id !== null) {
    await moveNotePath(actions.value.rename.id, newPath)
  }
  cancelRename()
}

async function handleDuplicate(id: string) {
  await duplicateNote(Number(id))
}

async function handleRemoveNote(path: string) {
  await removePath(path)
}

async function handleRemoveDirectory(path: string) {
  const confirmed = window.confirm(`Delete directory "${path}" and all its notes? This cannot be undone.`)
  if (confirmed) {
    await removePath(path)
  }
}

onMounted(refresh);
</script>

<template>
  <div class="flex flex-col h-full select-none">
    <!-- Sidebar header -->
    <div class="flex items-center justify-center">
      <button
        :aria-selected="actions.create"
        @click.stop="actions.create = !actions.create; cancelRename()"
        class="size-8 rounded-xs flex items-center justify-center text-foreground
        hover:bg-crust aria-selected:bg-crust/10"
        title="Create note"
      >
        <Icon icon="lucide:plus" height="16" />
      </button>
    </div>

    <div class="px-2 py-1">
      <!-- Create form -->
      <div v-if="actions.create" class="flex flex-col">
        <form @submit.prevent="handleCreate" class="flex items-center gap-2">
          <input
            name="input-create-note"
            type="text"
            placeholder="Note title..."
            class="w-full p-2 text-sm focus:outline-none"
            required
            autofocus
          />
          <button
            class="flex items-center justify-center size-8 rounded text-foreground hover:bg-secondary/10"
            title="Create note"
            type="submit"
          >
            <Icon icon="lucide:plus" height="16" />
          </button>
          <button
            type="button"
            class="flex items-center justify-center size-8 rounded text-foreground hover:bg-secondary/10"
            title="Cancel"
            @click="actions.create = false"
          >
            <Icon icon="lucide:x" height="16" />
          </button>
        </form>
        <div class="text-xs italic opacity-60">
          Use '/' to create directories. (eg. 'directory/myNote')
        </div>
      </div>

      <!-- Rename form -->
      <div v-if="actions.rename.active" class="flex flex-col">
        <form @submit.prevent="handleRename" class="flex items-center gap-2">
          <input
            name="input-rename-note"
            type="text"
            :value="actions.rename.currentPath"
            placeholder="New path..."
            class="w-full p-2 text-sm focus:outline-none"
            required
            autofocus
          />
          <button
            class="flex items-center justify-center size-8 rounded text-foreground hover:bg-secondary/10"
            title="Rename note"
            type="submit"
          >
            <Icon icon="lucide:check" height="16" />
          </button>
          <button
            type="button"
            class="flex items-center justify-center size-8 rounded text-foreground hover:bg-secondary/10"
            title="Cancel"
            @click="cancelRename"
          >
            <Icon icon="lucide:x" height="16" />
          </button>
        </form>
        <div class="text-xs italic opacity-60">
          Use '/' to move to a directory. (eg. 'directory/myNote')
        </div>
      </div>
    </div>

    <!-- Tree -->
    <div class="flex-1 min-h-0 overflow-y-auto py-2 px-1 text-foreground">
      <NaojTreeView :items="notesPath">
        <template #directory="props">
          <summary
            class="flex items-center justify-between cursor-pointer py-0.5 pr-1 rounded
            hover:bg-secondary/10"
            :style="{paddingLeft: 4 + 16 * props.level + 'px'}"
          >
            <div class="flex items-center justify-start gap-2">
              <Icon v-if="!props.isOpen" icon="lucide:chevron-right" size="20" />
              <Icon v-else icon="lucide:chevron-down" size="20" />
              <div>{{ props.label }}</div>
            </div>
            <Dropdown :distance="6" placement="bottom-start">
              <button class="btn size-6 rounded z-50" @click.stop>
                <Icon icon="lucide:ellipsis-vertical" />
              </button>
              <template #popper>
                <div class="flex flex-col py-1 min-w-32 text-sm">
                  <button
                    v-close-popper
                    class="flex items-center gap-2 px-3 py-1.5 hover:bg-secondary/10 text-left"
                    @click="handleRemoveDirectory(props.path)"
                  >
                    <Icon icon="lucide:trash-2" height="14" class="text-red-400" />
                    <span class="text-red-400">Delete directory</span>
                  </button>
                </div>
              </template>
            </Dropdown>
          </summary>
        </template>

        <template #file="props">
          <div
            @click="push({ name: 'note-view', params: { id: props.id } })"
            class="group flex items-center justify-between cursor-pointer py-0.5 px-1 rounded
            hover:bg-secondary/10"
            :style="{paddingLeft: 4 + 16 * props.level + 'px'}"
          >
            <div class="flex items-center justify-start gap-2">
              <Icon icon="lucide:square-dashed-text" />
              <div>{{ props.label }}</div>
            </div>
            <Dropdown :distance="6" placement="bottom-start">
              <button
                class="btn size-6 rounded z-50 hidden group-hover:flex items-center"
                @click.stop
              >
                <Icon icon="lucide:ellipsis-vertical" />
              </button>
              <template #popper>
                <div class="flex flex-col py-1 min-w-36 text-sm">
                  <button
                    v-close-popper
                    class="flex items-center gap-2 px-3 py-1.5 hover:bg-secondary/10 text-left"
                    @click="startRename(props.id, props.path)"
                  >
                    <Icon icon="lucide:pencil" height="14" />
                    Rename
                  </button>
                  <button
                    v-close-popper
                    class="flex items-center gap-2 px-3 py-1.5 hover:bg-secondary/10 text-left"
                    @click="handleDuplicate(props.id)"
                  >
                    <Icon icon="lucide:copy" height="14" />
                    Duplicate
                  </button>
                  <hr class="my-1 border-secondary/20" />
                  <button
                    v-close-popper
                    class="flex items-center gap-2 px-3 py-1.5 hover:bg-secondary/10 text-left"
                    @click="handleRemoveNote(props.path)"
                  >
                    <Icon icon="lucide:trash-2" height="14" class="text-red-400" />
                    <span class="text-red-400">Delete</span>
                  </button>
                </div>
              </template>
            </Dropdown>
          </div>
        </template>
      </NaojTreeView>

      <!-- Empty state -->
      <div
        v-if="!notes.length && !isLoading"
        class="mt-4 flex flex-col items-center gap-2 py-6 text-foreground"
      >
        <Icon icon="material-symbols:edit-note-outline-rounded" height="28" />
        <p class="text-xs text-foreground">No notes yet</p>
      </div>
    </div>
  </div>
</template>

