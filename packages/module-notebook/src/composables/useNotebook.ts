import { computed, readonly, ref, watchEffect } from "vue"
import { useRoute } from "vue-router"

import { useDatabase } from "@naoj/core";

interface NoteTab {
  id: number,
  name: string,
  fullpath: string
}

export interface INote {
  id: number;
  title: string;
  content: string;
  tags: string;
  path: string;
  created_at: string;
  updated_at: string;
  deleted: number;
}

const _tabs = ref<NoteTab[]>([])
const _selectedTab = ref<NoteTab | null>(null)
const _selectedNote = ref<INote | null>(null)
const _notes = ref<INote[]>([])
const _isLoading = ref(false)

export default function () {
  const route = useRoute()
  const core = useDatabase();

  const currentNoteId = computed<number | null>(() => {
    return Number(route.params["id"]) || null
  })

  async function _getNoteById(id: number): Promise<INote | null> {
    return core
      .from<INote>("notebook_notes")
      .where("id", "=", id)
      .where("deleted", "=", 0)
      .first();
  }

  async function selectTab(noteId: number) {
    const note = await _getNoteById(noteId)
    if (note) {
      const checkTab = _tabs.value.find(tab => tab.id === noteId)
      if (!checkTab)
        _tabs.value.push({ id: noteId, name: note.title, fullpath: note.path })

      _selectedTab.value = { id: noteId, name: note.title, fullpath: note.path }
      _selectedNote.value = note
    }
    // TODO: Error handling if note is not found
  }

  async function removeTab(noteId: number) {
    const index = _tabs.value.findIndex(tab => tab.id === noteId)
    if (index !== -1) {
      _tabs.value.splice(index, 1)
      if (_selectedTab.value?.id === noteId) {
        if (_tabs.value.length > 0) {
          await selectTab(_tabs.value[0]!.id)
        } else {
          _selectedTab.value = null
          _selectedNote.value = null
        }
      }
    }
  }

  async function refresh(): Promise<void> {
    try {
      _isLoading.value = true;
      _notes.value = await core
        .from<INote>("notebook_notes")
        .where("deleted", "=", 0)
        .orderBy("title", "ASC")
        .all();
    } finally {
      _isLoading.value = false;
    }
  }

  watchEffect(async () => {
    if (currentNoteId.value){
      await selectTab(currentNoteId.value)
    }
  })

  return {
    notes: readonly(_notes),
    tabs: readonly(_tabs),
    selectedTab: readonly(_selectedTab),
    selectedNote: readonly(_selectedNote),
    isLoading: readonly(_isLoading),
    selectTab,
    removeTab,
    refresh,
    query: () => core.from<INote>("notebook_notes"),
  }
}
