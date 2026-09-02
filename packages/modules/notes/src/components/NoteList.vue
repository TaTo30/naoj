<script setup lang="ts">
import { ref, computed, nextTick, onMounted } from "vue";
import { useRouter, useRoute } from "vue-router";
import {
  FileText,
  Folder,
  MoreHorizontal,
  Plus,
  Pencil,
  Trash2,
  Copy,
  Download,
} from "lucide-vue-next";
import { useNotes } from "../composables/useNotes.ts";
import type { INote } from "../composables/useNotes.ts";

const router = useRouter();
const route = useRoute();
const { notes, isLoading, loadNotes, createNote, updateNote, deleteNote, duplicateNote } =
  useNotes();

const activeNoteId = computed(() => {
  const id = route.params["id"];
  return id ? Number(id) : null;
});

// Inline rename state
const renamingId = ref<number | null>(null);
const renamingTitle = ref("");

// Options menu state
const menuOpenId = ref<number | null>(null);

// Group notes by path: directories (alphabetical) first, root notes last
const noteGroups = computed((): [string, INote[]][] => {
  const groups = new Map<string, INote[]>();
  for (const note of notes.value) {
    const p = note.path ?? "/";
    if (!groups.has(p)) groups.set(p, []);
    groups.get(p)!.push(note);
  }
  // Sort notes within each group case-insensitively
  for (const list of groups.values()) {
    list.sort((a, b) =>
      (a.title || "Untitled").localeCompare(b.title || "Untitled", undefined, {
        sensitivity: "base",
      }),
    );
  }
  // Directories first (alphabetical), root last
  return [...groups.entries()].sort(([a], [b]) => {
    if (a === "/" && b !== "/") return 1;
    if (b === "/" && a !== "/") return -1;
    return a.localeCompare(b);
  });
});

function toggleMenu(id: number, event: MouseEvent) {
  event.stopPropagation();
  if (menuOpenId.value === id) {
    menuOpenId.value = null;
    return;
  }
  menuOpenId.value = id;
  // Close when user clicks anywhere outside the dropdown
  setTimeout(
    () => document.addEventListener("click", () => (menuOpenId.value = null), { once: true }),
    0,
  );
}

async function startRename(note: INote) {
  renamingId.value = note.id;
  renamingTitle.value = note.title;
  menuOpenId.value = null;
  await nextTick();
  const el = document.getElementById(`rename-${note.id}`);
  if (el instanceof HTMLInputElement) {
    el.focus();
    el.select();
  }
}

async function commitRename(id: number) {
  if (renamingId.value !== id) return;
  const trimmed = renamingTitle.value.trim();
  if (trimmed) await updateNote(id, { title: trimmed });
  renamingId.value = null;
}

async function handleDelete(id: number) {
  menuOpenId.value = null;
  await deleteNote(id);
  if (activeNoteId.value === id) await router.push({ name: "notes" });
}

async function handleDuplicate(note: INote) {
  menuOpenId.value = null;
  const id = await duplicateNote(note.id);
  await router.push({ name: "note-view", params: { id } });
}

function handleExport(note: INote) {
  menuOpenId.value = null;
  const blob = new Blob([note.content], { type: "text/markdown" });
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement("a"), {
    href: url,
    download: `${note.title || "untitled"}.md`,
  });
  a.click();
  URL.revokeObjectURL(url);
}

async function handleCreate() {
  const id = await createNote();
  await router.push({ name: "note-view", params: { id } });
}

// Strip leading slash for display, e.g. "/food" → "food"
function pathLabel(path: string): string {
  return path.replace(/^\//, "") || path;
}

onMounted(loadNotes);
</script>

<template>
  <div
    class="flex flex-col h-full bg-stone-50 dark:bg-stone-900 select-none"
    @click="menuOpenId = null"
  >
    <!-- Header -->
    <div
      class="flex items-center gap-2 px-4 py-3 border-b border-stone-200 dark:border-stone-800 flex-shrink-0"
    >
      <FileText :size="14" class="text-orange-500 flex-shrink-0" />
      <span class="text-sm font-semibold text-stone-700 dark:text-stone-200">Notes</span>
    </div>

    <!-- Note tree -->
    <div class="flex-1 overflow-y-auto">
      <!-- Loading -->
      <div
        v-if="isLoading"
        class="flex items-center justify-center py-10 text-stone-400 dark:text-stone-500 text-sm"
      >
        Loading…
      </div>

      <!-- Empty state -->
      <div
        v-else-if="notes.length === 0"
        class="flex flex-col items-center justify-center py-10 gap-2 text-stone-300 dark:text-stone-600"
      >
        <FileText :size="24" />
        <p class="text-xs">No notes yet</p>
      </div>

      <!-- Groups -->
      <template v-else>
        <template v-for="[path, groupNotes] in noteGroups" :key="path">
          <!-- Directory header (skip for root) -->
          <div
            v-if="path !== '/'"
            class="flex items-center gap-1.5 px-4 pt-3 pb-1 text-xs font-semibold text-stone-400 dark:text-stone-500 uppercase tracking-wider"
          >
            <Folder :size="12" />
            {{ pathLabel(path) }}
          </div>

          <!-- Notes in group -->
          <div
            v-for="note in groupNotes"
            :key="note.id"
            class="group relative flex items-center border-b border-stone-100 dark:border-stone-800 last:border-b-0"
          >
            <!-- Rename mode -->
            <div v-if="renamingId === note.id" class="flex-1 px-3 py-2" @click.stop>
              <input
                :id="`rename-${note.id}`"
                v-model="renamingTitle"
                class="w-full text-sm bg-white dark:bg-stone-800 border border-orange-400 rounded px-2 py-0.5 text-stone-900 dark:text-stone-100 outline-none"
                @keydown.enter.prevent="commitRename(note.id)"
                @keydown.escape.prevent="renamingId = null"
                @blur="commitRename(note.id)"
              />
            </div>

            <!-- Normal row -->
            <button
              v-else
              class="flex-1 min-w-0 text-left py-2.5 transition-colors relative"
              :class="[
                path !== '/' ? 'pl-7 pr-3' : 'pl-4 pr-3',
                activeNoteId === note.id
                  ? 'bg-orange-50 dark:bg-orange-950/20'
                  : 'hover:bg-stone-100 dark:hover:bg-stone-800/60',
              ]"
              @click="router.push({ name: 'note-view', params: { id: note.id } })"
            >
              <!-- Active bar -->
              <span
                v-if="activeNoteId === note.id"
                class="absolute left-0 top-2 bottom-2 w-0.5 bg-orange-500 rounded-r"
              />
              <span class="block text-sm font-medium text-stone-800 dark:text-stone-100 truncate">
                {{ note.title || "Untitled" }}
              </span>
            </button>

            <!-- Options button + dropdown -->
            <div
              v-if="renamingId !== note.id"
              class="relative flex-shrink-0 pr-1.5"
              @click.stop
            >
              <button
                class="p-1 rounded text-stone-300 dark:text-stone-600 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors"
                :class="
                  menuOpenId === note.id
                    ? 'text-stone-700 dark:text-stone-200 bg-stone-200 dark:bg-stone-700'
                    : ''
                "
                @click="toggleMenu(note.id, $event)"
              >
                <MoreHorizontal :size="14" />
              </button>

              <!-- Dropdown -->
              <div
                v-if="menuOpenId === note.id"
                class="absolute right-0 top-full mt-0.5 z-50 w-44 rounded-lg bg-white dark:bg-stone-800 shadow-lg ring-1 ring-stone-200 dark:ring-stone-700 py-1 text-sm"
                @click.stop
              >
                <button
                  class="w-full flex items-center gap-2.5 px-3 py-1.5 text-stone-700 dark:text-stone-200 hover:bg-stone-50 dark:hover:bg-stone-700/60 transition-colors"
                  @click="startRename(note)"
                >
                  <Pencil :size="13" class="text-stone-400" />
                  Rename
                </button>
                <button
                  class="w-full flex items-center gap-2.5 px-3 py-1.5 text-stone-700 dark:text-stone-200 hover:bg-stone-50 dark:hover:bg-stone-700/60 transition-colors"
                  @click="handleDuplicate(note)"
                >
                  <Copy :size="13" class="text-stone-400" />
                  Duplicate
                </button>
                <button
                  class="w-full flex items-center gap-2.5 px-3 py-1.5 text-stone-700 dark:text-stone-200 hover:bg-stone-50 dark:hover:bg-stone-700/60 transition-colors"
                  @click="handleExport(note)"
                >
                  <Download :size="13" class="text-stone-400" />
                  Export as .md
                </button>
                <div class="mx-2 my-1 border-t border-stone-100 dark:border-stone-700" />
                <button
                  class="w-full flex items-center gap-2.5 px-3 py-1.5 text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                  @click="handleDelete(note.id)"
                >
                  <Trash2 :size="13" />
                  Delete
                </button>
              </div>
            </div>
          </div>
        </template>
      </template>
    </div>

    <!-- New note button -->
    <div class="flex-shrink-0 border-t border-stone-200 dark:border-stone-800 p-2">
      <button
        class="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium text-stone-500 dark:text-stone-400 hover:text-orange-500 dark:hover:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-950/20 transition-colors"
        @click.stop="handleCreate"
      >
        <Plus :size="15" />
        New note
      </button>
    </div>
  </div>
</template>
