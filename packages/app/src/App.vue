<script setup lang="ts">
import { ref } from "vue";
import { PanelLeft } from "lucide-vue-next";
import ModuleSelector from "./components/ModuleSelector.vue";
import ThemeToggle from "./components/ThemeToggle.vue";
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
      class="w-12 flex flex-col items-center gap-1 bg-stone-100 dark:bg-stone-900 border-r border-stone-200 dark:border-stone-800 flex-shrink-0 z-20 py-2"
    >
      <ModuleSelector />
      <div class="mt-auto">
        <ThemeToggle />
      </div>
    </aside>

    <!-- Sidebar panel -->
    <aside
      class="flex flex-col bg-stone-50 dark:bg-stone-900 border-r border-stone-200 dark:border-stone-800 flex-shrink-0 overflow-hidden transition-all duration-200"
      :class="sidebarOpen ? 'w-64' : 'w-0'"
    >
      <router-view v-slot="{ Component }" name="sidebar">
        <component :is="Component ?? EmptySidebar" />
      </router-view>
    </aside>

    <!-- Main content -->
    <main class="flex-1 flex flex-col overflow-hidden min-w-0">
      <!-- Toolbar -->
      <header
        class="h-10 flex-shrink-0 flex items-center gap-2 px-2 bg-white dark:bg-stone-900 border-b border-stone-200 dark:border-stone-800"
      >
        <button
          :title="sidebarOpen ? 'Hide sidebar' : 'Show sidebar'"
          class="p-1.5 rounded-md text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors flex-shrink-0"
          @click="sidebarOpen = !sidebarOpen"
        >
          <PanelLeft :size="16" />
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
        class="h-6 flex-shrink-0 bg-stone-100 dark:bg-stone-900 border-t border-stone-200 dark:border-stone-800"
      >
        <router-view v-slot="{ Component }" name="status-bar">
          <component :is="Component ?? EmptyStatusBar" />
        </router-view>
      </footer>
    </main>
  </div>
</template>
