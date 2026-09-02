<script setup lang="ts">
import { useRouter, useRoute } from "vue-router";
import { useModuleRegistry } from "@naoj/core";

const router = useRouter();
const route = useRoute();
const registry = useModuleRegistry();
const modules = registry.getAll();

function isActive(primaryRoute: string | undefined): boolean {
  if (!primaryRoute) return false;
  return route.path === primaryRoute || route.path.startsWith(`${primaryRoute}/`);
}
</script>

<template>
  <div class="flex flex-col items-center gap-0.5 w-full">
    <button
      v-for="mod in modules"
      :key="mod.manifest.name"
      :title="mod.manifest.description ?? mod.manifest.name"
      class="w-9 h-9 flex items-center justify-center rounded-lg text-xl transition-all duration-150 relative group"
      :class="
        isActive(mod.manifest.primaryRoute)
          ? 'text-white bg-orange-500 shadow-md shadow-orange-500/30'
          : 'text-stone-500 hover:text-stone-900 hover:bg-stone-200 dark:text-stone-400 dark:hover:text-white dark:hover:bg-stone-700'
      "
      @click="mod.manifest.primaryRoute && router.push(mod.manifest.primaryRoute)"
    >
      {{ mod.manifest.icon ?? mod.manifest.name[0]?.toUpperCase() }}
      <!-- Active indicator -->
      <span
        v-if="isActive(mod.manifest.primaryRoute)"
        class="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-[3px] w-0.5 h-5 bg-orange-400 rounded-r"
      />
    </button>
  </div>
</template>
