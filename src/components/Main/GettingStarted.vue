<template>
    <v-card>
        <template v-slot:title>
          <h2>Getting Started</h2>
        </template>
        <template v-slot:text>
          <p v-if="Object.keys(streams).length === 0">
            Welcome to webTV, a simple IPTV client for the browser.
            <v-divider class="my-2" />
            <b>Open</b> <v-btn variant="text" size="small" prepend-icon="mdi-database-cog" text="Sources"
              @click.stop="drawers.sources = true" /> to import your <strong>M3U playlist</strong> and optional
            <strong>XMLTV EPG</strong> file.
          </p>
          <p v-else>
            <b>Open</b> <v-btn variant="text" size="small" prepend-icon="mdi-format-list-group" text="Groups"
              @click.stop="drawers.groups = true" /> and select a <strong>group</strong> to browse.
          </p>
        </template>
      </v-card>
</template>

<script lang="ts" setup>
import type { M3uItem } from '@/lib/M3uParser';
type M3uStream = Omit<M3uItem, 'groupTitle'>

const drawers = defineModel<{ groups: boolean, sources: boolean }>('drawers', { required: true })
const { streams } = defineProps<{ streams: { [key: string]: M3uStream[] }}>()

</script> 