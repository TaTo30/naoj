<script setup lang="ts">
import { ref } from "vue";

import ModuleSelector from "./components/ModuleSelector.vue";
import DefaultSidebar from "./components/DefaultSidebar.vue";
import DefaultStatusbar from "./components/DefaultStatusbar.vue";

// Default open on md+ screens, closed on mobile
const sidebarOpen = ref(window.innerWidth >= 768);
</script>

<template>
  <div
    class="flex h-dvh bg-crust text-maintext p-2"
    :class="sidebarOpen ? 'gap-2' : 'gap-0'"
  >
    <div
      class="flex shrink-0 overflow-hidden h-full rounded"
      :class="sidebarOpen ? 'w-fit' : 'w-0'"
    >
      <aside class="flex flex-col items-center shrink-0 z-20 rounded-l rounded-t bg-mantle">
        <ModuleSelector />
      </aside>
      <aside class="flex flex-col rounded-r w-64 bg-base">
        <router-view v-slot="{ Component }" name="sidebar">
          <component :is="Component ?? DefaultSidebar" />
        </router-view>
      </aside>
    </div>

    <div class="flex size-full rounded">
      <main class="flex-1 flex flex-col overflow-hidden rounded bg-mantle">
        <header class="h-8">
          <div class="flex overflow-hidden">
            <button
              :title="sidebarOpen ? 'Hide sidebar' : 'Show sidebar'"
              class="hover:text-primary hover:bg-crust px-2"
              @click="sidebarOpen = !sidebarOpen"
            >
              <span v-if="!sidebarOpen" class="text-2xl leading-none" data-glyph="ec02" data-glyph-name="nf-cod-layout_sidebar_left_off">
                
              </span>
              <span v-else class="text-2xl leading-none text" data-glyph="ebf3" data-glyph-name="nf-cod-layout_sidebar_left">
                
              </span>
            </button>
            <router-view name="toolbar" />
          </div>
        </header>

        <div class="flex-1 overflow-hidden">
          <router-view />
        </div>

        <footer class="flex shrink-0 items-center justify-between text-xs">
          <div class="flex items-center">
            <div class="bg-info text-crust pl-2 py-1 pr-4 rounded-r-xl">
              Module Name
            </div>
          </div>
          <router-view v-slot="{ Component }" name="status-bar">
            <component :is="Component ?? DefaultStatusbar" />
          </router-view>
        </footer>
      </main>
    </div>
  </div>
</template>
