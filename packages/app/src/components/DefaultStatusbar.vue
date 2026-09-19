<script setup lang="ts">
</script>

<template>
  <div class="flex items-center *:px-2 *:py-1">
    <div class="empty:hidden">
      <slot name="info-3"></slot>
    </div>
    <div class="bg-surface empty:hidden">
      <slot name="info-2"></slot>
    </div>
    <div class="bg-secondary text-crust empty:hidden">
      <slot name="info"></slot>
    </div>
    <div class="bg-primary text-crust empty:hidden">
      <slot></slot>
    </div>
  </div>
</template>
