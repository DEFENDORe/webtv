<template>
  <v-navigation-drawer v-model="drawers.video" width="300" location="bottom" permanent>
    <v-row no-gutters style="height: 300px;" :style="{ overflowY: xs ? 'scroll' : 'hidden' }">
      <v-col class="bg-black" cols="12" sm="4" style="position: relative;" :order="xs ? 1 : undefined">
        <video ref="video" disablePictureInPicture :controls="videoInfo?.duration !== Infinity"></video>
        <div v-show="videoInfo?.duration === Infinity"
          style="background-color: rgba(0, 0, 0, 0.7); text-align: center; position: absolute; bottom: 0; left: 0; width: 100%;">
          <v-btn v-if="!isPlaying" @click="play" class="float-left" icon="mdi-play" variant="plain" color="white"
            :ripple="false" />
          <v-btn v-else @click="stop" class="float-left" icon="mdi-stop" variant="plain" color="white"
            :ripple="false" />
          <v-btn @click="fullscreen" class="float-right" icon="mdi-fullscreen" variant="plain" color="white"
            :ripple="false" />
          <div class="pt-3 text-body-2 text-white"><v-icon icon="mdi-broadcast" color="red" class="mb-1" />
            Live Broadcast</div>
        </div>
      </v-col>
      <v-col cols="12" sm="8">
        <v-card class="pa-2">
          <template v-slot:prepend v-if="selectedStream?.tvgLogo">
            <v-img :minWidth="100" :height="50" :src="selectedStream?.tvgLogo" lazy-src="@/assets/tv-icon.png"
              eager></v-img>
          </template>
          <template v-slot:append>
            <small v-if="nowPlaying" class="float-right">
              <span class="text-green">{{ (new Date(nowPlaying.start)).toLocaleTimeString([], {
                timeStyle:
                  'short'
              }) }}
              </span>
              <br />
              <span class="text-red">{{ nowPlaying.stop ? (new
                Date(nowPlaying.stop)).toLocaleTimeString([], { timeStyle: 'short' }) : '?' }}</span>
            </small>
            <v-btn variant="plain" icon="mdi-close" @click="selectedStream = null; drawers.video = false"></v-btn>
          </template>
          <template v-slot:title>
            <span class="font-weight-black">{{ selectedStream?.title }}</span>
          </template>
          <template v-if="nowPlaying" v-slot:subtitle>
            <span>{{ nowPlaying?.title }}</span>
          </template>
          <v-card-text :style="!xs ? { height: '210px', overflowY: 'scroll' } : undefined" :cols="smAndDown ? 12 : 6">
            <v-row class="text-body-2">
              <v-col v-if="nowPlaying" class="text-body-2 pb-0" lg="6" cols="12">
                <h3 class="mt-2">Now Playing <small class="float-right text-secondary">xmltv</small>
                </h3>
                <v-divider class="my-1" />
                <v-icon v-if="nowPlaying.isNew" icon="mdi-new-box" class="float-right" />
                <div><b>title: </b> {{ nowPlaying.title || '?' }}</div>
                <div v-if="nowPlaying.secondaryTitle"><b>Secondary Title: </b> {{
                  nowPlaying.secondaryTitle || '?' }}</div>
                <div><b>description: </b> {{ nowPlaying.description || '?' }}</div>
                <div v-if="nowPlaying.date"><b>Date: </b> {{ nowPlaying.date }}</div>
                <div><b>start time: </b> {{ (new Date(nowPlaying.start)).toLocaleTimeString([], {
                  timeStyle: 'short'
                }) }}
                </div>
                <div v-if="nowPlaying.stop"><b>end time: </b> {{ (new
                  Date(nowPlaying.stop)).toLocaleTimeString([], {
                    timeStyle: 'short'
                  }) }}</div>
              </v-col>

              <v-col class="pb-0" :lg="nowPlaying ? 6 : undefined" cols="12">
                <h3 class="mt-2">Stream Details<small class="float-right text-secondary">m3u</small>
                </h3>
                <v-divider class="my-1" />
                <div><b>title:</b> {{ selectedStream?.title || '?' }}</div>
                <div><b>group-title:</b> {{ selectedStream?.groupTitle || '?' }}</div>
                <div><b>url:</b> {{ selectedStream?.url || '?' }}</div>
                <div><b>tvg-id:</b> {{ selectedStream?.tvgId || '?' }}</div>
                <div><b>tvg-name:</b> {{ selectedStream?.tvgName || '?' }}</div>
                <div><b>tvg-logo:</b> {{ selectedStream?.tvgLogo || '?' }}</div>
              </v-col>

              <v-col v-if="videoInfo" cols="12" class="pt-0">
                <h3 class="mt-2">Video Details</h3>
                <v-divider class="my-1" />
                <div><b>resolution:</b> {{ videoInfo.width + ' x ' + videoInfo.height || '?' }}</div>
                <div v-if="formatSeconds(videoInfo.duration) !== '?'"><b>duration:</b> {{
                  formatSeconds(videoInfo.duration) }}
                </div>
                <div><b>container:</b> {{ selectedStream?.url.split('.').pop() }}</div>
              </v-col>
            </v-row>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-navigation-drawer>
</template>

<style lang="css" scoped>
video {
  width: inherit;
  height: inherit;
  height: 300px;
}
</style>

<script lang="ts" setup>
import Hls from 'hls.js'
import mpegts from 'mpegts.js'
import type { M3uItem } from '../../lib/M3uParser'
import { watch, ref, onMounted, computed, onUnmounted, useTemplateRef } from 'vue'
import type { SimpleProgramme } from '../../lib/XmltvParser'
import { useDisplay } from 'vuetify'

type Program = Omit<SimpleProgramme, 'channel'>

const { xs, smAndDown } = useDisplay()

const drawers = defineModel<{ video: boolean }>('drawers', { required: true })
const selectedStream = defineModel<null | M3uItem>('selectedStream', { required: true })
const { channels } = defineProps<{ channels: { [key: string]: Program[] } }>()

const video = useTemplateRef('video')
const videoInfo = ref<{ height: number, width: number, duration: number }>()

const isPlaying = ref<boolean>(false)

let mpegtsPlayer: null | mpegts.Player = null
let hlsPlayer: null | Hls = null

const fullscreen = async () => {
  if (!video.value)
    return
  await video.value.requestFullscreen()
}

const formatSeconds = (s: number) => s === Infinity ? '?' : new Date(s * 1000).toISOString().substr(11, 8)

const stop = () => {
  try {
    if (hlsPlayer !== null)
      hlsPlayer.destroy()
    if (mpegtsPlayer !== null)
      mpegtsPlayer.destroy()
  } catch (ex: unknown) {
    console.error(ex)
  }

  if (!video.value)
    return
  video.value.pause()
  video.value.src = ''
  video.value.load()
  isPlaying.value = false
}

const play = async () => {
  if (!video.value)
    return
  if ((selectedStream.value?.url || '').indexOf('.ts') > -1) {
    mpegtsPlayer = mpegts.createPlayer({
      type: 'mpegts',
      isLive: true,
      url: selectedStream.value?.url || ''
    })
    mpegtsPlayer.attachMediaElement(video.value)
    mpegtsPlayer.load()
    await mpegtsPlayer.play()
    console.log('Using mpegts player')
  } else if (video.value.canPlayType('application/vnd.apple.mpegurl') || (selectedStream.value?.url || '').indexOf('.m3u8') === -1) {
    video.value.src = selectedStream.value?.url || ''
    console.log('Using native player')
  } else if (Hls.isSupported()) {
    hlsPlayer = new Hls()
    hlsPlayer.loadSource(selectedStream.value?.url || '')
    hlsPlayer.attachMedia(video.value)
    console.log('Using hls.js')
  } else {
    console.error('Browser video player is not compatible with m3u8 (HLS) streams')
  }
  await video.value!.play()
  console.log('PLAYING')
}

const programs = computed(() => {
  if (selectedStream.value === null || channels[selectedStream.value.tvgId] === undefined)
    return null
  return channels[selectedStream.value.tvgId]
})

const nowPlaying = computed(() => {
  if (programs.value === null) return null
  const now = Date.now()
  const program = programs.value.find((p, index) => p.start <= now && (p.stop !== undefined ? p.stop >= now : (index + 1 < programs.value!.length ? programs.value![index + 1].start > now : true)))
  return program
})

watch(selectedStream, async (newSelectedStream) => {
  videoInfo.value = undefined
  if (video.value === undefined || video.value === null)
    throw new Error("Could not find reference to video element.")
  stop()
  // Abort if deselecting..
  if (!newSelectedStream)
    return
  await play()
})

onMounted(() => {
  if (!video.value)
    throw new Error("Could not find reference to video element.")
  video.value.addEventListener('playing', onPlaying)
  video.value.addEventListener('abort', onAbort)
  video.value.addEventListener('pause', onPause)
  video.value.addEventListener('ended', onEnded)
  video.value.addEventListener("loadeddata", onLoadedData)
  video.value.addEventListener("error", onError)
})

onUnmounted(() => {
  if (!video.value)
    throw new Error("Could not find reference to video element.")
  video.value.removeEventListener('playing', onPlaying)
  video.value.removeEventListener('abort', onAbort)
  video.value.removeEventListener('pause', onPause)
  video.value.removeEventListener('ended', onEnded)
  video.value.removeEventListener("loadeddata", onLoadedData)
  video.value.removeEventListener("error", onError)
})

const onPlaying = () => isPlaying.value = true
const onAbort = () => isPlaying.value = false
const onPause = () => isPlaying.value = false
const onEnded = () => isPlaying.value = false
const onLoadedData = () => videoInfo.value = { width: video.value!.videoWidth, height: video.value!.videoHeight, duration: video.value!.duration }
const onError = (e: ErrorEvent) => console.debug(e.message)


</script>
