import { createRouter, createWebHistory } from 'vue-router'

// Routes are added dynamically in main.ts after modules are registered
const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [],
})

export default router
