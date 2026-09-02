<script setup lang="ts">
import { useRouter } from "vue-router";
import { useModuleRegistry } from "@naoj/core";
import { ArrowRight, PackageOpen } from "lucide-vue-next";

const router = useRouter();
const registry = useModuleRegistry();
const modules = registry.getAll();
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
          <span class="text-2xl flex-shrink-0 w-9 text-center">{{
            mod.manifest.icon ?? "📦"
          }}</span>
          <div class="flex-1 min-w-0">
            <p class="font-semibold text-stone-800 dark:text-stone-100 capitalize">
              {{ mod.manifest.name }}
            </p>
            <p class="text-sm text-stone-400 dark:text-stone-500 truncate">
              {{ mod.manifest.description ?? "No description" }}
            </p>
          </div>
          <ArrowRight
            :size="16"
            class="flex-shrink-0 text-stone-300 dark:text-stone-600 group-hover:text-orange-400 transition-colors"
          />
        </button>

        <!-- Empty state -->
        <div
          v-if="modules.length === 0"
          class="flex flex-col items-center gap-3 py-12 text-stone-300 dark:text-stone-600"
        >
          <PackageOpen :size="36" />
          <p class="text-sm">No modules loaded</p>
        </div>
      </div>
    </div>
  </div>
</template>
