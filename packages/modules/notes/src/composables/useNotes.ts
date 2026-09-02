import { ref, computed, readonly } from "vue";
import { useCoreAPI } from "@naoj/core";

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

// Module-level shared state — all components calling useNotes() see the same data
const _notes = ref<INote[]>([]);
const _isLoading = ref(false);

export function useNotes() {
  const core = useCoreAPI();

  async function loadNotes(): Promise<void> {
    _isLoading.value = true;
    try {
      _notes.value = await core
        .from<INote>("notes")
        .where("deleted", "=", 0)
        .orderBy("title", "ASC")
        .all();
    } finally {
      _isLoading.value = false;
    }
  }

  async function createNote(path = "/"): Promise<number> {
    const id = await core.from<INote>("notes").insert({
      title: "Untitled",
      content: "",
      tags: "[]",
      path,
      deleted: 0,
    });
    await loadNotes();
    return Number(id);
  }

  async function updateNote(
    id: number,
    data: Partial<Omit<INote, "id" | "created_at" | "updated_at" | "deleted">>,
  ): Promise<void> {
    await core
      .from<INote>("notes")
      .where("id", "=", id)
      .update({ ...data, updated_at: new Date().toISOString() });
    await loadNotes();
  }

  async function deleteNote(id: number): Promise<void> {
    await core.from<INote>("notes").where("id", "=", id).update({ deleted: 1 });
    await loadNotes();
  }

  async function duplicateNote(id: number): Promise<number> {
    const original = await getNoteById(id);
    if (!original) throw new Error(`Note ${id} not found`);
    const newId = await core.from<INote>("notes").insert({
      title: `${original.title} (copy)`,
      content: original.content,
      tags: original.tags,
      path: original.path,
      deleted: 0,
    });
    await loadNotes();
    return Number(newId);
  }

  async function getNoteById(id: number): Promise<INote | null> {
    return core.from<INote>("notes").where("id", "=", id).where("deleted", "=", 0).first();
  }

  const noteCount = computed(() => _notes.value.length);

  return {
    notes: readonly(_notes),
    isLoading: readonly(_isLoading),
    noteCount,
    loadNotes,
    createNote,
    updateNote,
    deleteNote,
    duplicateNote,
    getNoteById,
  };
}
