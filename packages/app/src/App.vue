<script setup lang="ts">
import { ref } from "vue";
import { Icon } from "@iconify/vue";

import ModuleSelector from "./components/ModuleSelector.vue";
import EmptySidebar from "./components/EmptySidebar.vue";
import EmptyStatusBar from "./components/EmptyStatusBar.vue";

// Default open on md+ screens, closed on mobile
const sidebarOpen = ref(window.innerWidth >= 768);
</script>

<template>
  <div
    class="flex h-dvh overflow-hidden bg-stone-50 dark:bg-stone-950 text-stone-900 dark:text-stone-100"
  >
    <!-- Activity bar -->
    <aside
      class="w-12 flex flex-col items-center gap-1 bg-stone-100 dark:bg-stone-900 border-r border-stone-200 dark:border-stone-800 shrink-0 z-20 py-2"
    >
      <ModuleSelector />
    </aside>

    <!-- Sidebar panel -->
    <aside
      class="flex flex-col bg-stone-50 dark:bg-stone-900 border-r border-stone-200 dark:border-stone-800 shrink-0 overflow-hidden transition-all duration-200"
      :class="sidebarOpen ? 'w-64' : 'w-0'"
    >
      <router-view v-slot="{ Component }" name="sidebar">
        <component :is="Component ?? EmptySidebar" />
      </router-view>
    </aside>

    <!-- Main content -->
    <main class="flex-1 flex flex-col overflow-hidden min-w-0">
      <!-- Toolbar -->
      <header class="header">
        <button
          :title="sidebarOpen ? 'Hide sidebar' : 'Show sidebar'"
          class="btn w-9 h-9 rounded-lg"
          @click="sidebarOpen = !sidebarOpen"
        >
          <Icon icon="lucide:panel-left" />
        </button>
        <div class="flex-1 overflow-hidden">
          <router-view name="toolbar" />
        </div>
      </header>

      <!-- Content -->
      <div class="flex-1 overflow-hidden">
        <router-view />
      </div>

      <!-- Status bar -->
      <footer
        class="h-6 shrink-0 bg-stone-100 dark:bg-stone-900 border-t border-stone-200 dark:border-stone-800"
      >
        <router-view v-slot="{ Component }" name="status-bar">
          <component :is="Component ?? EmptyStatusBar" />
        </router-view>
      </footer>
    </main>
  </div>
</template>
