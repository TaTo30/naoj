<script setup lang="ts">
import { Circle } from "lucide-vue-next";
</script>

<template>
  <div class="flex items-center gap-2 px-4 h-full text-xs text-stone-500 dark:text-stone-400">
    <Circle :size="7" class="fill-emerald-500 text-emerald-500 flex-shrink-0" />
    <span>Ready</span>
  </div>
</template>
