<template>
  <v-navigation-drawer v-model="drawers.settings" location="right" width="500" temporary touchless
    :absolute="drawers.settings">
    <v-container>
      <v-tabs v-model="tab">
        <v-tab value="sources" text="IPTV Sources">
          <template v-slot:prepend>
                <v-progress-circular v-if="scanning.m3u || scanning.xmltv" indeterminate size="20" class="mb-1"/>
                <v-icon v-else :icon="'mdi-database-cog'" />
          </template>
        </v-tab>
        <v-tab value="appearance" prepend-icon="mdi-palette-swatch-variant">Appearance</v-tab>
      </v-tabs>
      <v-tabs-window v-model="tab">
        <!-- Sources -->
        <v-tabs-window-item value="sources">
          <v-card title="Group Filters" :elevation="5">
            <template v-slot:text>
              Inclusive filters applied during scanning. Case insensitive and matches partial results.
              <v-spacer class="my-1"></v-spacer>
              <small>Example: 'canada ' would match 'CA: Canada Sports', 'CA: Canada Enterainment', 'CA: Canada Local
                News',
                etc.</small>
            </template>
            <v-combobox v-model="groupFilters" chips multiple label="Group Filter Keywords" clearable
              @click:clear="saveFilters" @update:model-value="saveFilters" :disabled="scanning.m3u" />
          </v-card>
          <v-divider class="my-2" />
          <M3uParser v-model:streams="streams" v-model:scanning="scanning"
            @clear="drawers.video = false; selectedGroup = null; selectedStream = null;" :groups="groups"
            :groupFilters="groupFilters" />
          <v-divider class="my-2" />
          <XmltvParser v-model:channels="channels" v-model:scanning="scanning" />
        </v-tabs-window-item>
        <!-- Appearance -->
        <v-tabs-window-item value="appearance">
          <h3>Guide Settings</h3>
          <v-slider label="Pixels/hr" v-model="pixelsPerHour" :step="1" max="600" min="220" @end="savePixelPerHour">
            <template v-slot:append>{{ pixelsPerHour }}px</template>
          </v-slider>
          <v-slider label="Channel Title Width" v-model="rowHeaderWidth" :step="1" max="300" min="120"  @end="saveRowHeaderWidth">
            <template v-slot:append>{{ rowHeaderWidth }}px</template>
          </v-slider>
          <h3>Video Player</h3>
          <v-checkbox v-model="privacyMode" label="Blur/Hide URL's" @update:model-value="savePrivacyMode"></v-checkbox>
          <v-divider class="my-2"></v-divider>
          <v-btn prepend-icon="mdi-theme-light-dark" :text="theme.global.current.value.dark ? 'Light Theme' : 'Dark Theme'" @click="toggleTheme" block />
        </v-tabs-window-item>
      </v-tabs-window>
      <v-divider class="my-2" />
      
    </v-container>
  </v-navigation-drawer>
</template>

<script lang="ts" setup>
import { ref } from 'vue'
import { useTheme } from 'vuetify'

import type { M3uItem } from '@/lib/M3uParser'
import type { SimpleProgramme } from '@/lib/XmltvParser'

import M3uParser from './M3uParser.vue'
import XmltvParser from './XmltvParser.vue'

type M3uStream = Omit<M3uItem, 'groupTitle'>
type Program = Omit<SimpleProgramme, 'channel'>

const drawers = defineModel<{ settings: boolean, video: boolean }>('drawers', { required: true })
const scanning = defineModel<{ m3u: boolean, xmltv: boolean }>('scanning', { required: true })
const streams = defineModel<{ [key: string]: M3uStream[] }>('streams', { required: true })
const channels = defineModel<{ [key: string]: Program[] }>('channels', { required: true })
const selectedGroup = defineModel<null | string>('selectedGroup')
const selectedStream = defineModel<null | M3uStream>('selectedStream')
const { groups } = defineProps<{ groups: string[] }>()

const privacyMode = defineModel<boolean>('privacyMode', { required: true })
const rowHeaderWidth = defineModel<number>('rowHeaderWidth', { required: true })
const pixelsPerHour = defineModel<number>('pixelsPerHour', { required: true })

const tab = ref<'sources' | 'appearance'>('sources')

const theme = useTheme()
theme.global.name.value = localStorage.getItem('theme') || theme.global.name.value
const toggleTheme = () => {
  theme.global.name.value = theme.global.current.value.dark ? 'light' : 'dark'
  localStorage.setItem('theme', theme.global.name.value)
}

const savedFilters = localStorage.getItem('filters')
const groupFilters = ref<string[]>(savedFilters ? JSON.parse(savedFilters) : [
  'CA: ',
  'USA',
  'MOVIE-',
  'MOVIES-',
])
const saveFilters = () => localStorage.setItem('filters', JSON.stringify(groupFilters.value))

const saveRowHeaderWidth = () => localStorage.setItem('rowHeaderWidth', rowHeaderWidth.value + '')
const savePixelPerHour = () => localStorage.setItem('pixelsPerHour', pixelsPerHour.value + '')
const savePrivacyMode = () => localStorage.setItem('privacyMode', (+!privacyMode.value) + '')
</script>