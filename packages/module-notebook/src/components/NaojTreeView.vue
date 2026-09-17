<script setup lang="ts">
import { ref, watchEffect } from "vue";

import NaojTreeViewNode from "./NaojTreeViewNode.vue";

export interface NaojTreeViewItem {
  path: string;
  id: string;
}

export interface NaojTreeViewItemParts {
  parts: string[];
  id: string;
}

export interface NaojTreeViewNode {
  __level: number,
  __id: string,
  __endNode: boolean,
  [key: string]: NaojTreeViewNode | any
}

const props = withDefaults(
  defineProps<{
    items: NaojTreeViewItem[];
    tabs?: number;
  }>(),
  {
    items: () => [
      { path: "/note1", id: "note1" },
      { path: "/scholar/note2.md", id: "scholar-note2" },
      { path: "/scholar/note3.md", id: "scholar-note3" },
      { path: "/note4.md", id: "note4" },
      { path: "/scholar/research/meetings", id: "scholar-research-meetings" },
      { path: "/scholar/research/appointments", id: "scholar-research-meetings1" },
      { path: "/scholar/resources/imageList", id: "scholar-research-meetings1" },
    ],
    tabs: 2,
  },
);

const tree = ref<NaojTreeViewNode>();

function buildTree(items: NaojTreeViewItemParts[]): any {
  const tree: any = {};

  for (const item of items) {
    const parts = [...item.parts];

    const rootPart = parts.shift()!;
    let __level = 0;
    if (!(rootPart in tree)) {
      tree[rootPart] = { __level, __id: item.id, __endNode: false };
    }

    if (parts.length === 0) {
      tree[rootPart].__endNode = true
      tree[rootPart].__id = item.id
    }

    let tmpNode = tree[rootPart];
    while (parts.length > 0) {
      console.log(JSON.stringify(tmpNode))
      __level++;
      const subPart = parts.shift()!;

      if (!(subPart in tmpNode)) {
        tmpNode[subPart] = { __level, __id: item.id, __endNode: false};
      }

      if (parts.length === 0){
        tmpNode[subPart].__endNode = true
        tmpNode[subPart].__id = item.id
      }

      tmpNode = tmpNode[subPart];
    }
  }

  return tree;
}

watchEffect(() => {
  const itemsWithParts = props.items.map((item) => {
    const parts = item.path.split("/").filter((val) => val !== "");
    return {
      parts: parts,
      id: item.id,
    };
  });

  tree.value = buildTree(itemsWithParts);
});
console.log(tree)
</script>

<template>
  <div v-if="tree">
    <NaojTreeViewNode :node="tree" is-root>
      <template #directory="props">
        <slot name="directory" v-bind="props" />
      </template>
      <template #file="props">
        <slot name="file" v-bind="props" />
      </template>
    </NaojTreeViewNode>
  </div>
</template>
