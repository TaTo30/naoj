import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useModuleRegistry } from '@naoj/core'

export function useCurrentModule() {
  const route = useRoute()
  const registry = useModuleRegistry()

  const currentModule = computed(() => {
    const path = route.path
    return registry.getAll().find(m => {
      const primary = m.manifest.primaryRoute
      return primary ? path === primary || path.startsWith(`${primary}/`) : false
    }) ?? null
  })

  return { currentModule }
}
