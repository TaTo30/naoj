<script setup lang="ts">
import { ref, watchEffect } from 'vue';

interface Item {
  path: string;
  id: string
}

interface ItemParts {
  parts: string[];
  id: string;
}

interface TreeViewItem {
  __id: string
  __isDir: boolean
  __level: number
  __label: string
}

const props = withDefaults(defineProps<{
  items: Item[]
  tabs?: number
}>(), {
  items: () => [
    { path: "/note1", id: "note1" },
    { path: "/scholar/note2.md", id: "scholar-note2" },
    { path: "/scholar/note3.md", id: "scholar-note3" },
    { path: "/note4.md", id: "note4" },
    { path: "/scholar/research/meetings", id: "scholar-research-meetings" },
    { path: "/scholar/research/appointments", id: "scholar-research-meetings1" },
    { path: "/scholar/resources/imageList", id: "scholar-research-meetings1" }
  ],
  tabs: 2
})

const tree = ref<any>({})
const orderedItems = ref<TreeViewItem[]>([])


function flatTree(node: any): TreeViewItem[] {
  const privateKeysByTree = ["__level", "__id"]
  const sortedItems: TreeViewItem[] = []
  let keys = Object.keys(node).filter(val => !privateKeysByTree.includes(val))
  keys = keys.sort((a,b) => a.localeCompare(b))

  const leaves = keys
    .filter(val => Object.keys(node[val]).length === privateKeysByTree.length)
  const dirs = keys
   .filter(val => Object.keys(node[val]).length > privateKeysByTree.length)

  for(const dir of dirs){
    sortedItems.push({ __label: dir, __isDir: true, ...node[dir]})
    sortedItems.push(...flatTree(node[dir]))
  }

  return [
    ...sortedItems,
    ...leaves.map(val => {
      return {
        __label: val,
        __isDir: false,
        ...node[val]
      }
    })
  ]
}

function buildTree(items: ItemParts[]): any {
  const tree: any = {}

  for(const item of items){
    const parts = [...item.parts]

    const rootPart = parts.shift()!
    let __level = 0
    if (!(rootPart in tree)){
      tree[rootPart] = { __level, __id: item.id }
    }

    let tmpNode = tree[rootPart]
    while (parts.length > 0){
      __level++
      const subPart = parts.shift()!

      if (!(subPart in tmpNode)){
        tmpNode[subPart] = { __level, __id: item.id  }
      }

      tmpNode = tmpNode[subPart]
    }
  }

  return tree
}


watchEffect(() => {
  const itemsWithParts = props
    .items
    .map((item) => {
      const parts = item.path.split('/').filter(val => val !== '');
      return {
        parts: parts,
        id: item.id,
      };
    })

  tree.value = buildTree(itemsWithParts)
  orderedItems.value = flatTree(tree.value)
})
</script>

<template>
  <div v-for="item in orderedItems" :key="item.__id">
    <slot name="item" :label="item.__label" :level="item.__level" :id="item.__id"
    :is-dir="item.__isDir">
      <span :style="{marginLeft: 10 * item.__level + 'px'}">{{item.__label}}</span>
    </slot>
  </div>
</template>
