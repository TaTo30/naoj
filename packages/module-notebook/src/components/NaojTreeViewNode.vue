<script setup lang="ts">
import { computed, ref } from 'vue';
import type { NaojTreeViewNode } from './NaojTreeView.vue';

const emit = defineEmits(['selected'])
const props = defineProps<{
  node: NaojTreeViewNode
  label?: string
  isRoot?: boolean
  fileFlag?: boolean
}>()

const isDirOpen = ref(false)
const isDir = computed(() => {
  return Object
    .keys(props.node)
    .filter(val => !val.startsWith("__"))
    .length > 0
})

const isFile = computed(() => {
  return props.node.__endNode
})

const entries = computed(() => {
  const directories = []
  const files = []
  for(const key in props.node) {
    if (key.startsWith('__'))
      continue

    const value = props.node[key]
    if (Object.keys(value).length > 3)
      directories.push([key, '0'])

    if (value.__endNode)
      files.push([key, '1'])
  }

  return [
  ...directories.sort((a,b) => a[0]!.localeCompare(b[0]!)),
  ...files.sort((a,b) => a[0]!.localeCompare(b[0]!))
  ]
})

const slotProps = computed(() => {
  return {
    isDir: isDir.value,
    isFile: isFile.value,
    label: props.label,
    id: props.node.__id,
    level: props.node.__level,
    isOpen: isDirOpen.value,
  }
})

</script>

<template>
  <div >
    <div v-if="props.isRoot" v-for="[entry, flag] in entries" >
      <NaojTreeViewNode :node="props.node[entry!]" :label="entry" :file-flag="flag === '1'">
        <template #directory="props">
          <slot name="directory" v-bind="props" />
        </template>
        <template #file="props">
          <slot name="file" v-bind="props" />
        </template>
      </NaojTreeViewNode>
    </div>
    <div v-else>
      <details @click.stop="isDirOpen = !isDirOpen" v-if="isDir && !fileFlag" class="group">
        <slot name="directory" v-bind="slotProps">
          <summary>
            <span>
             {{props.label}}
            </span>
          </summary>
        </slot>
        <div v-for="[entry, flag] in entries" >
          <NaojTreeViewNode :node="props.node[entry!]" :label="entry" :file-flag="flag === '1'">
            <template #directory="props">
              <slot name="directory" v-bind="props" />
            </template>
            <template #file="props">
              <slot name="file" v-bind="props" />
            </template>
          </NaojTreeViewNode>
        </div>
      </details>
      <div @click.stop="" v-else="isFile">
        <slot name="file" v-bind="slotProps">
          <span>
            {{props.label}}
          </span>
        </slot>
      </div>
    </div>
  </div>
</template>
