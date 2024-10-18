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
      v-bind:groups="groups"/>

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
        <v-card v-if="selectedGroup">
          <v-card-title>
            {{ selectedGroup }}
            <v-btn v-if="xs" icon="mdi-close-circle" variant="plain" class="float-right" :size="20" @click="drawers.groups = true"/>
            <small class="float-right text-body-2 mt-1 mr-2" v-if="selectedGroup !== null">
              ({{ streamFilter !== null && streamFilter !== '' ? filteredStreams.length + ' / ' + streams[selectedGroup].length : streams[selectedGroup].length }} items)
            </small>
          </v-card-title>
          <v-text-field prepend-inner-icon="mdi-magnify" density="compact" label="Search Streams" variant="solo" hide-details
            clearable persistent-clear single-line v-model="streamFilter"></v-text-field>
          <v-divider />
          <v-virtual-scroll ref="list" v-if="selectedGroup !== null" :items="filteredStreams" item-height="40px" :height="$vuetify.display.height - (selectedStream === null ? 154 : 454)">
            <template v-slot:default="{ item, index }">
              <v-list-item @click="selectedStream = item; drawers.video = true" height="40px" :title="item.title" :subtitle="getCurrentProgram(item.tvgId)?.title" :active="selectedStream?.url === item.url">
                <template v-slot:prepend>
                  <div style="height: 32px; width: 100px; display: flex; justify-content: center;">
                    <v-img v-if="item.tvgLogo !== ''" :src="item.tvgLogo" lazy-src="@/assets/tv-icon.png" class="mr-2"></v-img>
                  </div>
                </template>
              </v-list-item>
            </template>
          </v-virtual-scroll>
        </v-card>
        <v-container v-else>
          <v-card title="Getting Started">
            <template v-slot:text>
              <p v-if="Object.keys(streams).length === 0">
                Open <v-btn variant="text" size="small" prepend-icon="mdi-database-cog" text="Sources" @click.stop="drawers.sources = true"/> to import your M3U playlist and optional XMLTV file.
              </p>
              <p v-else>
                Open <v-btn variant="text" size="small" prepend-icon="mdi-format-list-group" text="Groups" @click.stop="drawers.groups = true"/> and select a group to browse.
              </p>
            </template>
          </v-card>
        </v-container>

        
    </v-main>

    
  </v-app>
</template>



<script lang="ts" setup>



import { ref, computed } from 'vue'
import { useDisplay } from 'vuetify'

import type { M3uItem } from './lib/M3uParser'
import type { SimpleProgramme } from './lib/XmltvParser'

const { xs } = useDisplay()

const drawers = ref({
  groups: false,
  sources: true,
  video: false
})

const scanning = ref<{m3u: boolean, xmltv: boolean }>({ m3u: false, xmltv: false})

const streams = ref<{ [key: string]: M3uItem[] }>({})
const channels = ref<{ [key: string]: SimpleProgramme[] }>({})
const groups = computed(() => streams.value === undefined ? [] : Object.keys(streams.value).sort())

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
