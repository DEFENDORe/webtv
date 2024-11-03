<template>
  <v-card>
    <template v-slot:title>
      {{ selectedGroup }}
    </template>
    <template v-slot:append>
      <small class="float-right text-body-2 mt-1 mr-2" v-if="selectedGroup">
        ({{ streams[selectedGroup].length }} items)
      </small>
      <v-checkbox-btn v-model="isGuideView" @update:model-value="saveView" true-icon="mdi-view-list" false-icon="mdi-television-guide" base-color="info" color="info"/>
    </template>
    <v-divider/>
    <!-- List View -->
    <ListView
      v-if="!isGuideView"
      v-bind:selected-stream="selectedStream"
      v-bind:selected-group="selectedGroup"
      v-bind:channels="channels"
      v-bind:streams="streams"
      @select="selectStream"/>
    
    <!-- Guide View -->
    <GuideView
      v-else
      v-bind:drawers="drawers"
      v-bind:selected-stream="selectedStream"
      v-bind:selected-group="selectedGroup"
      v-bind:channels="channels"
      v-bind:streams="streams"
      v-bind:pixels-per-hour="pixelsPerHour"
      v-bind:row-header-width="rowHeaderWidth"
      @select="selectStream"/>
      
  </v-card>
</template>

<script lang="ts" setup>
import type { M3uItem } from '@/lib/M3uParser'
import type { SimpleProgramme } from '@/lib/XmltvParser'
import { ref } from 'vue'

// Components
import ListView from './ListView.vue'
import GuideView from './GuideView.vue'

const drawers = defineModel<{ video: boolean }>('drawers', { required: true })
const selectedStream = defineModel<M3uItem | null>('selectedStream', { required: true })

const { selectedGroup, streams, channels } = defineProps<{
  selectedGroup: string,
  streams: { [key: string]: Omit<M3uItem, "groupTitle">[] },
  channels: { [key: string]: Omit<SimpleProgramme, "channel">[] },
  rowHeaderWidth: number,
  pixelsPerHour: number
}>()

const savedView = localStorage.getItem('view')
const saveView = () => localStorage.setItem('view', isGuideView.value ? 'guide' : 'list')
const isGuideView = ref<boolean>(!!savedView ? savedView === 'guide' : true)

const selectStream = (item: M3uItem | null) => {
  selectedStream.value = item
  drawers.value.video = !!item
}


</script>