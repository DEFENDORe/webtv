<template>
  <v-app>

    <AppHeader :drawers="drawers" :scanning="scanning" />

    <!-- Sources Drawer -->
    <Settings 
      v-model:drawers="drawers"
      v-model:scanning="scanning"
      v-model:streams="streams"
      v-model:channels="channels"
      v-model:selected-stream="selectedStream"
      v-model:selected-group="selectedGroup"
      v-bind:groups="groups"
      v-model:pixels-per-hour="pixelsPerHour"
      v-model:row-header-width="rowHeaderWidth"
      v-model:privacy-mode="privacyMode" />

    <!-- Video Player Drawer -->
    <VideoPlayer
      v-model:drawers="drawers"
      v-model:selected-stream="selectedStream"
      v-bind:channels="channels"
      v-bind:privacy-mode="privacyMode" />

    <!-- Groups Drawer -->
    <Groups
      v-model:drawers="drawers"
      v-model:selected-group="selectedGroup"
      v-bind:groups="groups"
      v-bind:streams="streams" />

      <!-- Main Content -->
    <v-main>

      <!-- Welcome Message -->
      <GettingStarted
        v-if="!selectedGroup"
        v-model:drawers="drawers"
        v-bind:streams="streams" />
      
        <!-- TV Guide / Stream List -->
      <Streams
        v-else
        v-model:drawers="drawers"
        v-model:selected-stream="selectedStream"
        v-bind:selected-group="selectedGroup"
        v-bind:channels="channels"
        v-bind:streams="streams"
        v-bind:pixels-per-hour="pixelsPerHour"
        v-bind:row-header-width="rowHeaderWidth" />

    </v-main>
  
  </v-app>
</template>

<script lang="ts" setup>

import { ref, computed } from 'vue'

import type { M3uItem } from './lib/M3uParser'
import type { SimpleProgramme } from './lib/XmltvParser'

// Components
import AppHeader from './components/AppHeader.vue'
import Settings from './components/NavDrawers/Settings/index.vue'
import VideoPlayer from './components/NavDrawers/VideoPlayer.vue'
import Groups from './components/NavDrawers/Groups.vue'
import GettingStarted from './components/Main/GettingStarted.vue'
import Streams from './components/Main/Streams/index.vue'

const drawers = ref({
  groups: !!localStorage.getItem('m3u-url'),
  settings: !localStorage.getItem('m3u-url'),
  video: false
})

const streams = ref<{ [key: string]: Omit<M3uItem, "groupTitle">[] }>({})
const channels = ref<{ [key: string]: SimpleProgramme[] }>({})
const groups = computed(() => streams.value === undefined ? [] : Object.keys(streams.value).sort())

const scanning = ref<{ m3u: boolean, xmltv: boolean }>({ m3u: false, xmltv: false })

const selectedGroup = ref<null | string>(null)
const selectedStream = ref<null | M3uItem>(null)

const savedRHW = localStorage.getItem('rowHeaderWidth')
const savedPPH = localStorage.getItem('pixelsPerHour')
const savedPrivacyMode = localStorage.getItem('privacyMode')

const privacyMode = ref(savedPrivacyMode ? Boolean(+savedPrivacyMode) : true)
const rowHeaderWidth = ref(savedRHW ? +savedRHW : 160)
const pixelsPerHour = ref(savedPPH ? +savedPPH : 400)

</script>
