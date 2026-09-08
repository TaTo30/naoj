<script setup lang="ts">
import { useRouter } from "vue-router";
import { useModuleRegistry } from "@naoj/core";
import { Icon } from "@iconify/vue";

const router = useRouter();
const registry = useModuleRegistry();
const modules = registry.getAll();

function isIconify(icon: string | undefined): icon is string {
  return !!icon && icon.includes(":");
}
</script>

<template>
  <div class="flex flex-col items-center justify-center h-full bg-stone-50 dark:bg-stone-950 px-6">
    <div class="w-full max-w-md text-center">
      <!-- Brand -->
      <div class="mb-10">
        <h1 class="text-5xl font-black tracking-tight text-stone-900 dark:text-stone-50">
          n<span class="text-orange-500">a</span>oj
        </h1>
        <p class="mt-2 text-stone-400 dark:text-stone-500 text-sm">
          Your personal knowledge workspace
        </p>
      </div>

      <!-- Module cards -->
      <div class="flex flex-col gap-2">
        <button
          v-for="mod in modules"
          :key="mod.manifest.name"
          class="group flex items-center gap-4 w-full p-4 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 hover:border-orange-300 dark:hover:border-orange-700 hover:shadow-md dark:hover:shadow-stone-900 transition-all text-left"
          @click="mod.manifest.primaryRoute && router.push(mod.manifest.primaryRoute)"
        >
          <span
            class="text-2xl flex-shrink-0 w-9 h-9 flex items-center justify-center text-stone-500 dark:text-stone-400"
          >
            <Icon v-if="isIconify(mod.manifest.icon)" :icon="mod.manifest.icon" height="24" />
            <span v-else>{{ mod.manifest.icon ?? "📦" }}</span>
          </span>
          <div class="flex-1 min-w-0">
            <p class="font-semibold text-stone-800 dark:text-stone-100 capitalize">
              {{ mod.manifest.name }}
            </p>
            <p class="text-sm text-stone-400 dark:text-stone-500 truncate">
              {{ mod.manifest.description ?? "No description" }}
            </p>
          </div>
          <Icon
            icon="material-symbols:chevron-right-rounded"
            height="18"
            class="flex-shrink-0 text-stone-300 dark:text-stone-600 group-hover:text-orange-400 transition-colors"
          />
        </button>

        <!-- Empty state -->
        <div
          v-if="modules.length === 0"
          class="flex flex-col items-center gap-3 py-12 text-stone-300 dark:text-stone-600"
        >
          <Icon icon="material-symbols:package-2-outline-rounded" height="36" />
          <p class="text-sm">No modules loaded</p>
        </div>
      </div>
    </div>
  </div>
</template>
