<script setup lang="ts">
import { ref } from "vue";
import { Icon } from "@iconify/vue";

import ModuleSelector from "./components/ModuleSelector.vue";
import DefaultSidebar from "./components/DefaultSidebar.vue";
import DefaultStatusbar from "./components/DefaultStatusbar.vue";

// Default open on md+ screens, closed on mobile
const sidebarOpen = ref(window.innerWidth >= 768);
</script>

<template>
  <div class="flex h-dvh bg-neutral p-2 gap-2">
    <div class="flex h-full border border-foreground/20 rounded">
      <aside class="flex flex-col items-center shrink-0 z-20 rounded-l rounded-t bg-background">
          <button
            :title="sidebarOpen ? 'Hide sidebar' : 'Show sidebar'"
            class="text-foreground hover:bg-foreground/25 p-2 size-12 flex justify-center items-center"
            @click="sidebarOpen = !sidebarOpen"
          >
            <Icon icon="lucide:panel-left" :height="24" />
          </button>
        <ModuleSelector />
      </aside>

      <aside
        class="flex flex-col shrink-0 overflow-hidden transition-all duration-200 rounded-r bg-background/50"
        :class="sidebarOpen ? 'w-64' : 'w-0'"
      >
        <router-view v-slot="{ Component }" name="sidebar">
          <component :is="Component ?? DefaultSidebar" />
        </router-view>
      </aside>
    </div>


    <div class="flex size-full border border-foreground/20 rounded">
      <main class="flex-1 flex flex-col overflow-hidden rounded bg-background/30">
        <header class="header">
          <div class="flex-1 overflow-hidden">
            <router-view name="toolbar" />
          </div>
        </header>

        <div class="flex-1 overflow-hidden">
          <router-view />
        </div>

        <footer class="h-6 shrink-0">
          <router-view v-slot="{ Component }" name="status-bar">
            <component :is="Component ?? DefaultStatusbar" />
          </router-view>
        </footer>
      </main>
    </div>
  </div>
</template>
