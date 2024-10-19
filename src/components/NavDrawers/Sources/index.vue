<template>
  <v-navigation-drawer v-model="drawers.sources" location="right" width="500" temporary touchless :absolute="drawers.sources">
    <v-container>
      <h1>
        <v-icon icon="mdi-database-cog" class="mb-2 mr-2" size="small" /> IPTV Sources
      </h1>
      <v-card title="Group Filters" :elevation="5">
        <template v-slot:text>
          Inclusive filters applied during scanning. Case insensitive and matches partial results.
          <v-spacer class="my-1"></v-spacer>
          <small>Example: 'canada ' would match 'CA: Canada Sports', 'CA: Canada Enterainment', 'CA: Canada Local News',
            etc.</small>
        </template>
        <v-combobox v-model="groupFilters" chips multiple label="Group Filter Keywords" clearable
          @click:clear="saveFilters" @update:model-value="saveFilters" :disabled="scanning.m3u"/>
      </v-card>
      <v-divider class="my-2" />
      <M3uParser v-model:streams="streams" v-model:scanning="scanning" @clear="drawers.video = false; selectedGroup = null; selectedStream = null;"
        :groups="groups" :groupFilters="groupFilters" />
      <v-divider class="my-2" />
      <XmltvParser v-model:channels="channels" v-model:scanning="scanning" />
    </v-container>
  </v-navigation-drawer>
</template>

<script lang="ts" setup>
import { ref } from 'vue'

import type { M3uItem } from '../../../lib/M3uParser'
import type { SimpleProgramme } from '../../../lib/XmltvParser'

import M3uParser from './M3uParser.vue'
import XmltvParser from './XmltvParser.vue'

type M3uStream = Omit<M3uItem, 'groupTitle'>
type Program = Omit<SimpleProgramme, 'channel'>

const drawers = defineModel<{ sources: boolean, video: boolean }>('drawers', { required: true })
const scanning = defineModel<{ m3u: boolean, xmltv: boolean }>('scanning', { required: true })
const streams = defineModel<{ [key: string]: M3uStream[] }>('streams', { required: true })
const channels = defineModel<{ [key: string]: Program[] }>('channels', { required: true })
const selectedGroup = defineModel<null | string>('selectedGroup')
const selectedStream = defineModel<null | M3uStream>('selectedStream')
const { groups } = defineProps<{ groups: string[] }>()

const savedFilters = localStorage.getItem('filters')
const groupFilters = ref<string[]>(savedFilters ? JSON.parse(savedFilters) : [
  'CA: ',
  'USA',
  'MOVIE-',
  'MOVIES-',
])
const saveFilters = () => localStorage.setItem('filters', JSON.stringify(groupFilters.value))
</script>