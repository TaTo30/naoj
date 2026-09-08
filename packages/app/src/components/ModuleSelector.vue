<script setup lang="ts">
import { useRouter, useRoute } from "vue-router";
import { useModuleRegistry } from "@naoj/core";
import { Icon } from "@iconify/vue";

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
      class="btn size-9 rounded-lg relative group"
      :class="
        isActive(mod.manifest.primaryRoute)
          ? 'text-white bg-orange-500 shadow-md shadow-orange-500/30'
          : ''
      "
      @click="mod.manifest.primaryRoute && router.push(mod.manifest.primaryRoute)"
    >
      <Icon :icon="mod.manifest.icon!" :height="18" />
    </button>
  </div>
</template>
