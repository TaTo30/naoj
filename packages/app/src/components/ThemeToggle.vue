<script setup lang="ts">
import { ref, onMounted, onUnmounted } from "vue";
import { Moon, Sun } from "lucide-vue-next";

const isDark = ref(document.documentElement.classList.contains("dark"));

function toggle() {
  isDark.value = !isDark.value;
  document.documentElement.classList.toggle("dark", isDark.value);
  localStorage.setItem("theme", isDark.value ? "dark" : "light");
}

function onSystemChange(e: MediaQueryListEvent) {
  if (localStorage.getItem("theme")) return;
  isDark.value = e.matches;
  document.documentElement.classList.toggle("dark", isDark.value);
}

const mq = window.matchMedia("(prefers-color-scheme: dark)");
onMounted(() => mq.addEventListener("change", onSystemChange));
onUnmounted(() => mq.removeEventListener("change", onSystemChange));
</script>

<template>
  <button
    :title="isDark ? 'Switch to light mode' : 'Switch to dark mode'"
    class="w-9 h-9 flex items-center justify-center rounded-lg text-stone-500 hover:text-orange-500 hover:bg-stone-200 dark:text-stone-400 dark:hover:text-orange-400 dark:hover:bg-stone-700/60 transition-all duration-200"
    @click="toggle"
  >
    <Sun v-if="isDark" :size="15" />
    <Moon v-else :size="15" />
  </button>
</template>
