import { ref } from "vue";

const activeMarks = ref<any[]>([]);
const characterCount = ref<{words: number, characters: number}>({words: 0, characters: 0});
export default function useNotebookEditor() {
  return {
    activeMarks,
    characterCount
  }
}
