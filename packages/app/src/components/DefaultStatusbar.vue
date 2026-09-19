<script setup lang="ts">
</script>

<template>
  <div class="flex items-center *:py-1">
    <div class="empty:hidden px-2 translate-x-8 z-0">
      <slot name="info-3"></slot>
    </div>
    <div class="bg-surface empty:hidden pr-6 pl-4 rounded-l-xl translate-x-8 z-1">
      <slot name="info-2">Surface</slot>
    </div>
    <div class="bg-secondary text-crust empty:hidden pr-6 pl-4 rounded-l-xl translate-x-4 z-2">
      <slot name="info"></slot>
    </div>
    <div class="bg-primary text-crust empty:hidden pr-2 pl-4 rounded-l-xl z-3">
      <slot></slot>
    </div>
  </div>
</template>
