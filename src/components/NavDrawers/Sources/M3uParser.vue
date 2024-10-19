<template>
  <v-card :disabled="progress !== null" :elevation="5">

    <v-card-title>
      <v-checkbox v-if="mode === 'remote'" v-model="saveUrl" class="float-right" hide-details label="Save URL"
        style="height: 0" />
      <v-icon icon="mdi-playlist-play" size="small" />
      M3U Playlist
    </v-card-title>

    <v-card-text>
      <v-tabs v-model="mode" @update:model-value="clear">
        <v-tab value="remote" prepend-icon="mdi-link">URL</v-tab>
        <v-tab value="local" prepend-icon="mdi-paperclip">File</v-tab>
      </v-tabs>
      <v-tabs-window v-model="mode">
        <v-tabs-window-item value="local">
          <v-file-input label="M3U Playlist File" hint="Your IPTV M3U playlist file..." persistent-hint persistent-clear
            :disabled="progress !== null" v-model="file" @update:model-value="parse" accept="audio/x-mpegurl"
            single-line />
        </v-tabs-window-item>
        <v-tabs-window-item value="remote">
          <v-text-field label="M3U playlist URL" hint="The url pointing to your m3u playlist" persistent-hint
            persistent-clear clearable :error-messages="!hasError ? undefined : error || 'An unknown error occured'"
            v-model="url" @update:model-value="hasError = false" @click:clear="clear"
            @update:focused="ensureVisible($el)">
            <template v-slot:append-inner>
              <v-btn icon="mdi-download-circle" @click="parse" variant="plain" :disabled="!url" />
            </template>
          </v-text-field>
        </v-tabs-window-item>
      </v-tabs-window>

      <v-expand-transition>
        <v-progress-linear v-show="progress !== null" :indeterminate="!fileSize" :model-value="progress || 0"
          height="30" color="primary">
          <strong>{{ progress === Infinity ? 'Parsing M3U data...' : Math.ceil(progress || 0) + '%' }}</strong>
        </v-progress-linear>
      </v-expand-transition>

      <div>
        <v-divider class="my-1" />
        <span v-if="fileSize">
          <b>File Size:</b> {{ fileSizeString }}
        </span>
        <div class="float-right">
          <b>Streams:</b> {{ count.filtered }} / {{ count.total }}
          <b>Groups:</b> {{ groups?.length || 0 }}
        </div>
      </div>
    </v-card-text>

  </v-card>
</template>

<script lang="ts" setup>
import M3uWorker from '../../../workers/M3uParser?worker'
import { M3uItem } from '../../../lib/M3uParser'

import { ref, computed, onMounted } from 'vue'

type M3uStream = Omit<M3uItem, 'groupTitle'>

const worker = new M3uWorker()

const streams = defineModel<{ [key: string]: M3uStream[] }>('streams', { required: true })
const scanning = defineModel<{ m3u: boolean }>('scanning', { required: true })

const count = ref<{
  filtered: number,
  total: number
}>({ filtered: 0, total: 0 })

const { groups, groupFilters } = defineProps({
  groups: {
    type: Array<String>,
    required: true
  },
  groupFilters: {
    type: Array<String>,
    required: true
  }
})

const emit = defineEmits(['clear'])

const saveUrl = ref(!!localStorage.getItem('m3u-url'))

const mode = ref<'local' | 'remote'>('remote')

const file = ref<File>()
const url = ref(localStorage.getItem('m3u-url') || '')

// Workaround to scroll to input when keyboard opens in PWA mode
const ensureVisible = (e: HTMLElement) => {
  if ('standalone' in window.navigator)
    setTimeout(() => e.scrollIntoView({ behavior: 'smooth' }), 500)
}

const progress = ref<null | number>(null)
const fileSize = ref<number>(0)

const fileSizeString = computed(() => {
  const i = fileSize.value == 0 ? 0 : Math.floor(Math.log(fileSize.value) / Math.log(1024))
  return +((fileSize.value / Math.pow(1024, i)).toFixed(2)) * 1 + ' ' + ['B', 'kB', 'MB', 'GB', 'TB'][i]
})

const error = ref<null | string>(null)
const hasError = ref(false)

onMounted(() => {
  if (mode.value === 'remote' && url.value) {
    parse()
  }
})

const clear = () => {
  localStorage.removeItem('m3u-url')
  emit('clear')
  streams.value = {}
  count.value = { filtered: 0, total: 0 }
  progress.value = null
  fileSize.value = 0
  error.value = null
  hasError.value = false
  file.value = undefined
  url.value = ''
}

const parse = async () => {
  emit('clear')
  streams.value = {}
  count.value = { filtered: 0, total: 0 }
  progress.value = null
  fileSize.value = 0
  error.value = null
  hasError.value = false
  if (mode.value === 'local' && file.value === undefined)
    return
  if (mode.value === 'remote' && saveUrl.value)
    localStorage.setItem('m3u-url', url.value)
  progress.value = Infinity
  scanning.value.m3u = true
  worker.postMessage(mode.value === 'local' ? file.value : url.value)
}

worker.onmessage = function ({ data }) {
  switch (data.event) {
    case 'done':
      progress.value = null
      scanning.value.m3u = false
      break
    case 'progress':
      progress.value = data.progress.percent
      fileSize.value = data.progress.fileSize
      break
    case 'items':
      const items: M3uItem[] = data.items.filter((item: M3uItem) => {
        if (groupFilters.length === 0)
          return true
        let isMatch = false
        for (let i = 0; i < groupFilters.length; i++) {
          if (item.groupTitle.toLowerCase().indexOf(groupFilters[i].toLowerCase()) !== -1) {
            isMatch = true
            break
          }
        }
        return isMatch
      })
      items.forEach((item) => {
        const groupTitle = item.groupTitle === '' ? '__NULL__' : item.groupTitle
        if (streams.value[groupTitle] === undefined)
          streams.value[groupTitle] = []
        streams.value[groupTitle].push({
          url: item.url,
          title: item.title,
          tvgId: item.tvgId,
          tvgName: item.tvgId,
          tvgLogo: item.tvgLogo
        })
      })
      count.value.filtered += items.length
      count.value.total += data.items.length
      break
    case 'error':
      error.value = data.error.message
      hasError.value = true
      progress.value = null
      scanning.value.m3u = false
      break
    default:
      console.error('Unknown message from worker. Value: ')
      console.error(data)
      break
  }
}


</script>