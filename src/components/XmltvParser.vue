<template>
  <v-card :disabled="progress !== null" :elevation="5">
    <v-card-title class="pb-0" style="height: 60px">
      <v-checkbox v-if="mode === 'remote'" v-model="saveUrl" class="float-right" hide-details label="Save URL" style="height: 0"/>
      <v-icon icon="mdi-television-guide" size="small" />
      XMLTV EPG
    </v-card-title>

    <v-card-text>
      <v-tabs v-model="mode" @update:model-value="clear">
        <v-tab value="remote" prepend-icon="mdi-link">URL</v-tab>
        <v-tab value="local" prepend-icon="mdi-paperclip">File</v-tab>
      </v-tabs>
      <v-tabs-window v-model="mode">
        <v-tabs-window-item value="local">
          <v-file-input 
            label="XMLTV File"
            hint="Your IPTV XMLTV file..."
            persistent-hint
            persistent-clear
            :disabled="progress !== null"
            v-model="file"
            @update:model-value="parse"
            accept="application/xml"
            single-line
          />
        </v-tabs-window-item>
        <v-tabs-window-item value="remote">
          <v-text-field
            label="XMLTV URL"
            hint="The url pointing to your XMLTV EPG file"
            persistent-hint
            clearable @click:clear="clear"
            persistent-clear
            :error-messages="!hasError ? undefined : error || 'An unknown error occured'"
            v-model="url"
            @update:model-value="hasError = false"
            @keydown.enter="parse"
          >
            <template v-slot:append-inner>
              <v-btn icon="mdi-download-circle" variant="plain" @click="parse"/>
            </template>
          </v-text-field>
        </v-tabs-window-item>
      </v-tabs-window>

      <v-expand-transition>
        <v-progress-linear v-show="progress" :model-value="progress || 0" :indeterminate="(fileSize || 0) === 0" height="30" color="primary">
            <strong>{{ progress === Infinity ? 'Parsing XML data...' : Math.ceil(progress || 0) + '%' }}</strong>
        </v-progress-linear>
      </v-expand-transition>

      <v-divider class="my-1"/>

      <div>
        <span v-if="fileSize"><b>File Size: </b> {{ fileSizeString }}</span>
        &nbsp;
        <div class="float-right">
          <b>Programs:</b> {{ totalProgrammes }}
          <b>Channels:</b> {{ channelNames.length }}
        </div>
      </div>
    </v-card-text>

  </v-card>
</template>

<script lang="ts" setup>

import XmltvParserWorker from '../workers/XmltvParser?worker'

import { ref, computed, onMounted } from 'vue'

import type { SimpleProgramme } from '../lib/XmltvParser'

type Program = Omit<SimpleProgramme, 'channel'>

const channels = defineModel<{ [key:string]: Program[] }>('channels', { required: true })
const scanning = defineModel<{ xmltv: boolean }>('scanning', { required: true })

const mode = ref<'local' | 'remote'>(localStorage.getItem('xmltv-mode') as 'local' | 'remote' || 'local')

const saveUrl = ref(!!localStorage.getItem('xmltv-url'))

const file = ref<File>()
const url = ref(localStorage.getItem('xmltv-url') || '')

const error = ref<null | string>(null)
const hasError = ref(false)

const channelNames = computed(() => {
  return channels.value ? Object.keys(channels.value || []) : []
})

const totalProgrammes = ref(0)

const progress = ref<null | number>(null)
const fileSize = ref<null | number>(null)
const fileSizeString = computed(() => {
  if (fileSize.value === null) {
    return '0 B'
  }
  const i = fileSize.value == 0 ? 0 : Math.floor(Math.log(fileSize.value) / Math.log(1024))
  return +((fileSize.value / Math.pow(1024, i)).toFixed(2)) * 1 + ' ' + ['B', 'kB', 'MB', 'GB', 'TB'][i]
})

onMounted(() => {
  if (mode.value === 'remote' && url.value) {
    parse()
  }
})

const clear = (wipeInputs = false) => {
  localStorage.removeItem('xmltv-mode')
  localStorage.removeItem('xmltv-url')
  localStorage.setItem('xmltv-mode', mode.value)
  saveUrl.value = false
  file.value = undefined
  url.value = ''
  fileSize.value = null
  progress.value = null
  error.value = null
  totalProgrammes.value = 0
  hasError.value = false
  channels.value = {}
}

const parse = async () => {
    progress.value = Infinity
    error.value = null
    totalProgrammes.value = 0
    hasError.value = false
    channels.value = {}
    if (mode.value === 'local' && file.value === undefined)
      return
    if (mode.value === 'remote' && saveUrl.value)
      localStorage.setItem('xmltv-url', url.value)
    scanning.value.xmltv = true
    worker.postMessage(mode.value === 'local' ? file.value : url.value)
}

const worker = new XmltvParserWorker()
worker.onmessage = function ({data}) {
    switch(data.event) {
      case 'done': {
        progress.value = null
        scanning.value.xmltv = false
        break
      }
      case 'progress':
        progress.value = data.progress.percent
        fileSize.value = data.progress.fileSize
        break
      case 'programmes': {
        const programmes = data.programmes as SimpleProgramme[]
        totalProgrammes.value += programmes.length
        programmes.forEach((programme) => {
          if (channels.value[programme.channel] === undefined)
            channels.value[programme.channel] = []
          channels.value[programme.channel].push({
            start: programme.start,
            stop: programme.stop,
            title: programme.title,
            secondaryTitle: programme.secondaryTitle,
            description: programme.description,
            isNew: programme.isNew, date: programme.date
          })
        })
        break
      }
      case 'error':
        error.value = data.error.message
        hasError.value = true
        progress.value = null
        scanning.value.xmltv = false
        break
      default:
        console.error('Unknown message from worker. Value: ')
        console.error(data)
        break
    }
  }

</script>