<script setup lang="ts">
import { App, NaojEditor } from "@naoj/components"
</script>

<template>
  <div>
    <aside>
      <div>
        database selector goes here
      </div>
      <div>
        dynamic modules goes here
      </div>
      <div>
        settings and other dynamic modules go here
      </div>
    </aside>
    <main>
      <div>
        tabs go here
        <app />
      </div>
      <div>
        <naoj-editor />
        main content go here
      </div>
      <div>
        status line goes here
      </div>
    </main>
  </div>
</template>

<style scoped></style>
