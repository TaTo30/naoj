<script setup lang="ts">
// @ts-ignore
import DefaultStatusbar from "../../../app/src/components/DefaultStatusbar.vue"

import useNotebook from "../composables/useNotebook";
import useNotebookEditor from "../composables/useNotebookEditor";

const { selectedNote } = useNotebook();
const { characterCount, activeMarks} = useNotebookEditor();

</script>

<template>
  <DefaultStatusbar>
    {{activeMarks}}
    <template #info-3>
      {{selectedNote?.path}}
    </template>
    <template #info>
      {{characterCount}}
    </template>
  </DefaultStatusbar>
</template>
