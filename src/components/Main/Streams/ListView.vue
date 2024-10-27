<template>
    <div>
      <v-text-field 
        v-model="streamFilter"
        prepend-inner-icon="mdi-magnify"
        variant="solo" density="compact" single-line hide-details
        :label="'Search ' + selectedGroup"
        clearable persistent-clear>
        <template v-slot:append-inner v-if="streamFilter"><small style="width: 52px;" class="text-center text-secondary">{{ filteredStreams.length + ' / ' + streams[selectedGroup].length }}</small></template>
      </v-text-field>

      <v-virtual-scroll v-if="selectedGroup" :items="filteredStreams" :height="$vuetify.display.height - (!selectedStream ? 154 : 454)">
        <template v-slot:default="{ item }">
          <v-list-item @click="emit('select', item)" :active="selectedStream?.url === item.url" lines="one">
            <template v-slot:prepend><div class="streamIcon"><v-img v-if="item.tvgLogo" class="mr-2" :src="item.tvgLogo" :lazy-src="TvIconBase64"/></div></template>
            <template v-slot:title>{{ item.title }}</template>
            <template v-slot:subtitle>{{ getCurrentProgram(item.tvgId)?.title }}</template>
          </v-list-item>
        </template>
      </v-virtual-scroll>
    </div>
</template>

<style lang="css" scoped>
.streamIcon{
  height: 32px;
  width: 100px;
  display: flex;
  justify-content: center;
}
</style>

<script lang="ts" setup>
import type { M3uItem } from '@/lib/M3uParser'
import TvIconBase64 from '@/lib/TvIconBase64';
import type { SimpleProgramme } from '@/lib/XmltvParser'
import { ref, computed } from 'vue'

const { selectedStream, selectedGroup, streams, channels } = defineProps<{
  selectedStream: M3uItem | null
  selectedGroup: string,
  streams: { [key: string]: Omit<M3uItem, "groupTitle">[] },
  channels: { [key: string]: Omit<SimpleProgramme, "channel">[] }
}>()

const emit = defineEmits<{ select: [value: M3uItem | null] }>()

const streamFilter = ref('')
const filteredStreams = computed(() => {
  if (!selectedGroup)
    return []
  return streams[selectedGroup]
    .filter((s) => s.title.toLowerCase().indexOf((streamFilter.value || '').toLowerCase()) > -1)
    .map((s) => ({ ...s, groupTitle: selectedGroup })) // Re-add groupTitle to stream..
    .sort((a, b) => {
      const first = a.title.toLowerCase()
      const sec = b.title.toLocaleLowerCase()
      return (first < sec) ? -1 : (first > sec) ? 1 : 0
    })
})

const getCurrentProgram = (tvgId: string) => {
  if (!channels[tvgId]) return null
  const now = Date.now()
  const program = channels[tvgId].find((p, index) => p.start <= now && (p.stop !== undefined ? p.stop >= now : (index + 1 < channels[tvgId].length ? channels[tvgId][index + 1].start > now : true)))
  return program
}
</script>