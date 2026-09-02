<script setup lang="ts">
import { Layers } from "lucide-vue-next";
</script>

<template>
  <div
    class="flex flex-col items-center justify-center h-full gap-3 text-stone-300 dark:text-stone-600 select-none"
  >
    <Layers :size="28" />
    <p class="text-xs text-center leading-relaxed text-stone-400 dark:text-stone-500">
      Select a module<br />from the activity bar
    </p>
  </div>
</template>
