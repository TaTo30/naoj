import { useDatabase } from "@naoj/core";
import { computed, readonly, ref, watchEffect } from "vue"
import { useRoute } from "vue-router"

interface NoteTab {
  id: number,
  name: string
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

const _notes = ref<NoteTab[]>([])
const _files = ref<INote[]>([])
const _isLoading = ref(false)

export default function () {
  const route = useRoute()
  const core = useDatabase();

  // TODO: Use vueuse computedasync
  const currentNoteId = computed<number | null>(() => {
    return Number(route.params["id"]) || null
  })

  const selectedNote = computed(async () => {
    if (currentNoteId.value) {
      const result = await getNoteById(currentNoteId.value)
      return result
    }
    return null
  })

  async function refresh(): Promise<void> {
    try {
      _files.value = await core
        .from<INote>("notebook_notes")
        .where("deleted", "=", 0)
        .orderBy("title", "ASC")
        .all();
    } finally {
      // _isLoading.value = false;
    }
  }

  async function getNoteById(id: number): Promise<INote | null> {
      return core
        .from<INote>("notebook_notes")
        .where("id", "=", id)
        .where("deleted", "=", 0)
        .first();
    }

  watchEffect(() => {
    if (currentNoteId.value){
      const findVal = _notes.value.find(val => val.id == currentNoteId.value)
      if (!findVal) {
        _notes.value.push({ id: currentNoteId.value, name: "name" })
      }
    }
  })


  return {
    files: readonly(_files),
    notes: readonly(_notes),
    selectedNote,
    isLoading: readonly(_isLoading),
    refresh
  }
}
