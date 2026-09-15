<script setup lang="ts">
  import { Icon } from "@iconify/vue"

  const props = defineProps<{
    command?: string;
    icon: string;
    label: string;
    spec?: string
  }>()
</script>


<template>
  <button class="flex flex-col w-full" aria-selected="false">
    <div class="flex justify-start opacity-50 font-semibold text-sm ">
      <slot name="header" />
    </div>
    <div class="flex items-center justify-between gap-12">
      <div class="flex items-center justify-start gap-2">
        <div>
          <Icon :icon="props.icon" />
        </div>
        <div>
          {{props.label}}
        </div>
      </div>
      <div class="flex items-center gap-2">
        <div class="text-xs text-stone-400" v-if="props.spec">
          <kbd><i>{{props.spec}}</i></kbd>
        </div>
        <div class="text-xs border rounded px-1 py-0.5 opacity-50 dark:bg-white/15 bg-black/15"
             v-if="props.command">
          <kbd>{{props.command}}</kbd>
        </div>
      </div>
    </div>
  </button>
</template>
