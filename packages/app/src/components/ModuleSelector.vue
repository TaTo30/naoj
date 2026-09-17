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
  <div class="flex flex-col items-center gap-0.5">
    <button
      v-for="mod in modules"
      :key="mod.manifest.name"
      :title="mod.manifest.description ?? mod.manifest.name"
      class="text-foreground hover:bg-foreground/25 p-2 size-12 flex justify-center items-center"
      :class="{'bg-foreground/25': isActive(mod.manifest.primaryRoute)}"
      @click="mod.manifest.primaryRoute && router.push(mod.manifest.primaryRoute)"
    >
      <Icon :icon="mod.manifest.icon!" :height="24" />
    </button>
  </div>
</template>
