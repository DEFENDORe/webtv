<template>
  <v-app>

    <AppHeader :drawers="drawers" :scanning="scanning"/>

    <!-- Sources Drawer -->
    <Sources
      v-model:drawers="drawers"
      v-model:scanning="scanning"
      v-model:streams="streams"
      v-model:channels="channels"
      v-model:selected-stream="selectedStream"
      v-model:selected-group="selectedGroup"
      v-bind:groups="groups"
    />

    <!-- Video Player Drawer -->
    <VideoPlayer
      v-model:drawers="drawers"
      v-model:selected-stream="selectedStream"
      v-bind:channels="channels"
    />

    <!-- Groups Drawer -->
    <Groups
      v-model:drawers="drawers"
      v-model:selected-group="selectedGroup"
      v-bind:groups="groups"
      v-bind:streams="streams"
    />

    <v-main>
        <v-card  v-if="!selectedGroup">
          <template v-slot:title>
            <h2>Getting Started</h2>
          </template>
          <template v-slot:text>
            <p v-if="Object.keys(streams).length === 0">
              Welcome to webTV, a simple IPTV client for the browser.
              <v-divider class="my-2"/>
              <b>Open</b> <v-btn variant="text" size="small" prepend-icon="mdi-database-cog" text="Sources" @click.stop="drawers.sources = true"/> to import your <strong>M3U playlist</strong> and optional <strong>XMLTV EPG</strong> file.
            </p>
            <p v-else>
              <b>Open</b> <v-btn variant="text" size="small" prepend-icon="mdi-format-list-group" text="Groups" @click.stop="drawers.groups = true"/> and select a <strong>group</strong> to browse.
            </p>
          </template>
        </v-card>

      <v-card v-else>
        <v-card-title>
          {{ selectedGroup }}
          <small class="float-right text-body-2 mt-1 mr-2" v-if="selectedGroup !== null">
            ({{ streamFilter !== null && streamFilter !== '' ? filteredStreams.length + ' / ' + streams[selectedGroup].length : streams[selectedGroup].length }} items)
          </small>
        </v-card-title>
        <v-text-field prepend-inner-icon="mdi-magnify" density="compact" :label="'Search ' + selectedGroup" variant="solo" hide-details
          clearable persistent-clear single-line v-model="streamFilter"></v-text-field>
        <v-divider />
        <v-virtual-scroll ref="list" v-if="selectedGroup !== null" :items="filteredStreams" :height="$vuetify.display.height - (selectedStream === null ? 154 : 454)">
          <template v-slot:default="{ item, index }">
            <v-list-item @click="selectedStream = item; drawers.video = true" :title="item.title" :active="selectedStream?.url === item.url" :lines="'one'">
              <template v-slot:prepend>
                <div style="height: 32px; width: 100px; display: flex; justify-content: center;">
                  <v-img v-if="item.tvgLogo !== ''" :src="item.tvgLogo" lazy-src="@/assets/tv-icon.png" class="mr-2"></v-img>
                </div>
              </template>
              <template v-slot:subtitle>
                  {{ getCurrentProgram(item.tvgId)?.title }}
              </template>
            </v-list-item>
          </template>
        </v-virtual-scroll>
      </v-card>
      
    </v-main>
  </v-app>
</template>

<script lang="ts" setup>

import { ref, computed } from 'vue'

import type { M3uItem } from './lib/M3uParser'
import type { SimpleProgramme } from './lib/XmltvParser'

const drawers = ref({
  groups: !!localStorage.getItem('m3u-url'),
  sources: !localStorage.getItem('m3u-url'),
  video: false
})

const streams = ref<{ [key: string]: M3uItem[] }>({})
const channels = ref<{ [key: string]: SimpleProgramme[] }>({})
const groups = computed(() => streams.value === undefined ? [] : Object.keys(streams.value).sort())

const scanning = ref<{m3u: boolean, xmltv: boolean }>({ m3u: false, xmltv: false})

const selectedGroup = ref<null | string>(null)
const selectedStream = ref<null | M3uItem>(null)

const streamFilter = ref('')
const filteredStreams = computed(() => {
  if (selectedGroup.value === null)
    return []
  return streams.value[selectedGroup.value]
    .filter((s) => {
      
      return s.title.toLowerCase().indexOf((streamFilter.value || '').toLowerCase()) > -1
    })
    .map((s) => ({
      ...s,
      groupTitle: selectedGroup.value!
    }))
    .sort((a, b) => {
      const first = a.title.toLowerCase()
      const sec = b.title.toLocaleLowerCase()
      return (first < sec) ? -1 : (first > sec) ? 1 : 0
    })
})

const getCurrentProgram = (tvgId: string) => {
  if (channels.value === null) return null
  const now = Date.now()
  const program = channels.value[tvgId]?.find((p, index) => p.start <= now && (p.stop !== undefined ? p.stop >= now : (index + 1 < channels.value[tvgId]?.length ? channels.value[tvgId][index + 1]?.start > now : true)))
  return program
}

</script>
