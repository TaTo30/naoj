<script setup lang="ts">
import { computed } from "vue";
// @ts-ignore
import DefaultStatusbar from "../../../app/src/components/DefaultStatusbar.vue"

import useNotebook from "../composables/useNotebook";
import useNotebookEditor from "../composables/useNotebookEditor";

const { selectedNote } = useNotebook();
const { characterCount, activeMarks } = useNotebookEditor();

const marks = computed(() => {
  let markNames = activeMarks.value.map((val) => val.mark.type.name);
  if (markNames.length === 0)
    return null
  return markNames.join(" > ");
})

</script>

<template>
  <DefaultStatusbar>
    <span class="font-extrabold">
      {{characterCount.characters}} : {{characterCount.words}}
    </span>
    <template #info-3>
      <span>
        {{selectedNote?.path}}
      </span>
    </template>
    <template  #info>
       <span v-if="marks" class="font-extrabold">
        {{marks}}
      </span>
      <span v-else>
        <i>no marks</i>
      </span>
    </template>
  </DefaultStatusbar>
</template>
