<template>
  <v-container fluid class="pa-0">

    <!-- top timeline bar, current time, now marker -->
    <div ref="scroll-x-timeline" class="scroll-x-timeline" :onwheel="onWheel" :onscroll="onScrollXBottom"
      :style="{ height: containerHeight + 'px', lineHeight: timelineHeight + 'px' }">
      <!-- NOW LINE MARKER-->
      <div class="now-line" :style="{ top: timelineHeight + 'px', left: 0, width: liveXPos + rowHeaderWidth - .5 + 'px' }">
        <v-icon class="ma-0 pa-0 now-line-arrow" size="large">mdi-triangle-small-down</v-icon>
      </div>

      <!-- CURRENT TIME -->
      <div class="current-time" :style="{ width: rowHeaderWidth + 'px', height: timelineHeight + 'px' }"
        @click="scrollXPos !== halfHourXPos ? scrollToThisHalfHour() : scrollToNow()">
        <div class="current-time-container pr-2" style="height: 100%;">
          <span style="vertical-align: middle;" class="mr-2">{{ scrollTimeString }}</span>
          <v-icon size="small"
            :color="!offsetToNow ? 'info' : scrollXPos === halfHourXPos ? 'purple' : offsetToNow > 0 ? 'success' : 'error'"
            :icon="!offsetToNow ? 'mdi-progress-clock' : scrollXPos === halfHourXPos ? 'mdi-clock-outline' : offsetToNow > 0 ? 'mdi-clock-plus-outline' : 'mdi-clock-minus-outline'" />
        </div>
      </div>
      <!-- TIMELINE HOURS -->
      <div v-for="i in hoursOfEpg" class="timeline-hour pr-2"
        :style="{ width: pixelsPerHour + 'px', height: timelineHeight + 'px' }">
        <span :style="{ width: pixelsPerHour / 2 + 'px' }" class="pr-2 timeline-half-hour" draggable>{{
          getTimeline(i).replace('00', '30') }}</span>
        {{ getTimeline(i + 1) }}
      </div>

    </div>

    <div ref="scroll-y" class="scroll-y"
      :style="{ height: containerHeight - timelineHeight - SCROLLBAR_WIDTH + 'px', top: timelineHeight + 60 + 'px' }">
      <div ref="scroll-y-top" class="scroll-y-top" :style="{ height: 0 + 'px' }" style="background-color: red; "></div>
      <div ref="scroll-x" class="scroll-x"
        :style="{ width: '100%', height: (limitedStreams.length * rowHeight) + 'px' }">

        <div v-for="(stream, i) of limitedStreams"
          :style="{ width: pixelsPerHour * hoursOfEpg + 'px', height: rowHeight + 'px' }">
          <!-- Channels -->
          <div :style="{ width: rowHeaderWidth + 'px' }" class="row-header">
            <!-- Channel -->
            <div class="row-header-container" :style="{ height: rowHeight + 'px' }"
              :class="selectedStream?.url === stream.url ? 'channel-active' : 'channel'"
              @click="selectedStream?.url === stream.url ? undefined : emit('select', { ...stream, groupTitle: selectedGroup })">
              <span class="d-inline-block">
                <v-img :lazy-src="TvIconBase64" :src="stream.tvgLogo" alt="tvg-logo"
                  :style="{ width: rowHeight + 'px' }"></v-img>
              </span>
              <small class="row-header-title">{{ stream.title }}</small>
            </div>
          </div>

          <!-- PROGRAMS -->
          <div :style="styleProgramRow()" class="row">
            <div v-if="stream.tvgId && cleanChannels[stream.tvgId] && cleanChannels[stream.tvgId].length"
              :style="{ height: rowHeight + 'px' }">
              <!-- NO INFO PROGRAM - START FILLER -->
              <div v-if="cleanChannels[stream.tvgId][0] && cleanChannels[stream.tvgId][0].start > guideStartTime"
                class="program px-1" :class="{
                  live: cleanChannels[stream.tvgId][0].start > now,
                  active: cleanChannels[stream.tvgId][0].start > now && stream.url === selectedStream?.url
                }" :style="{
                width: ((cleanChannels[stream.tvgId][0].start - guideStartTime) / HOUR * pixelsPerHour) + 'px',
                height: rowHeight + 'px'
              }">
                <span :style="{ marginLeft: scrollXPos + 'px', lineHeight: rowHeight + 'px' }"
                  style="font-weight: 500;">No Information</span>
              </div>
              <!-- PROGRAMS -->
              <div v-for="(program, i) of cleanChannels[stream.tvgId]" :style="styleProgram(stream.tvgId, i)"
                class="program px-1" :class="{
                  'pt-1': program.description,
                  active: isProgramLive(program) && selectedStream?.url === stream.url,
                  live: isProgramLive(program)
                }"
                @click="isProgramLive(program) && selectedStream?.url !== stream.url ? emit('select', { ...stream, groupTitle: selectedGroup }) : undefined">
                <span :style="styleProgramText(stream.tvgId, i)" style="font-weight: 500;">{{ program.title }}</span>
                <br />
                <small :style="styleProgramText(stream.tvgId, i)">{{ program.description }}</small>
              </div>
              <!-- NO INFO PROGRAM - END FILLER -->
              <div v-if="cleanChannels[stream.tvgId][cleanChannels[stream.tvgId].length - 1].stop! < guideEndTime"
                class="program px-1" :class="{
                  live: cleanChannels[stream.tvgId][cleanChannels[stream.tvgId].length - 1].stop! < now,
                  active: selectedStream?.url === stream.url && cleanChannels[stream.tvgId][cleanChannels[stream.tvgId].length - 1].stop! < now
                }" style="width: 100%;" :style="{ height: rowHeight + 'px' }"
                @click="cleanChannels[stream.tvgId][cleanChannels[stream.tvgId].length - 1].stop! < now && selectedStream?.url !== stream.url ? emit('select', { ...stream, groupTitle: selectedGroup }) : undefined">
                <span :style="styleLastProgramText(stream.tvgId)" style="font-weight: 500;">No Information</span>
              </div>
            </div>
            <!-- NO INFO PROGRAM - CHANNEL FILLER -->
            <div v-else :style="[{ height: '100%', width: '100%' }]"
              @click="emit('select', { ...stream, groupTitle: selectedGroup })" class="program live px-1"
              :class="{ active: stream.url === selectedStream?.url }">
              <span :style="{ marginLeft: scrollXPos + 'px', lineHeight: rowHeight + 'px' }"
                style="font-weight: 500;">No Information</span>
            </div>

          </div>
        </div>
      </div>
      <div ref="scroll-y-bottom" class="scroll-y-bottom" :style="{ height: bottomBuffer * rowHeight + 'px' }"></div>

    </div>
    <div
      style="position: absolute; height: 200px; width: 400px; top: 200px; left: 500px; background-color: greenyellow; color: blue;">
      <div><strong>topIndex: </strong>{{ topIndex }}</div>
      <div><strong>pageCount: </strong>{{ visibleChannelCount }}</div>
      <div><strong>limitedStreams.length: </strong>{{ limitedStreams.length }}</div>
      <div><strong>sortedStreams.length: </strong>{{ sortedStreams.length }}</div>
    </div>
  </v-container>
</template>



<script lang="ts" setup>
import type { M3uItem } from '@/lib/M3uParser'
import type { SimpleProgramme } from '@/lib/XmltvParser'

import { ref, computed, useTemplateRef, onMounted, onBeforeUnmount, watch } from 'vue'
import { useDisplay } from 'vuetify'

import { getScrollBarWidth } from '@/lib/GetScrollbarWidth'
import TvIconBase64 from '@/lib/TvIconBase64'

const HOUR = 3600000 //ms
const SCROLLBAR_WIDTH = getScrollBarWidth() || 6

const limitedStreams = computed(() => sortedStreams.value.slice(0, topIndex.value + (visibleChannelCount.value)))
const topIndex = ref(0)
const visibleChannelCount = ref(0)
const bottomBuffer = computed(() => (sortedStreams.value.length - (topIndex.value + visibleChannelCount.value)) < 0 ? 0 : (sortedStreams.value.length - (topIndex.value + visibleChannelCount.value)))

let intersectObserverCleanupTimeout: NodeJS.Timeout | null = null

onMounted(() => {
  visibleChannelCount.value = !scrollY.value?.clientHeight ? 0 : Math.ceil(scrollY.value.clientHeight / rowHeight.value)
  scrollToThisHalfHour()
  const observer = new IntersectionObserver((entries) => {
    visibleChannelCount.value = !scrollY.value?.clientHeight ? 0 : Math.ceil(scrollY.value.clientHeight / rowHeight.value)
    if (intersectObserverCleanupTimeout)
      clearTimeout(intersectObserverCleanupTimeout)

    entries.forEach(entry => {
      if (entry.isIntersecting) {
        if (entry.target.classList.contains('scroll-y-top')) {
          console.log('HIT TOP')
          if (topIndex.value - visibleChannelCount.value < 0)
            topIndex.value = 0
          else
            topIndex.value -= visibleChannelCount.value
        } else if (entry.target.classList.contains('scroll-y-bottom')) {
          console.log('HIT BOTTOM')
          if (topIndex.value + visibleChannelCount.value >= sortedStreams.value.length - visibleChannelCount.value) {
            topIndex.value = sortedStreams.value.length - visibleChannelCount.value
          } else {
            topIndex.value += visibleChannelCount.value
          }
          intersectObserverCleanupTimeout = setTimeout(() => {
            topIndex.value = Math.floor((scrollY.value?.scrollTop || 0) / rowHeight.value) + visibleChannelCount.value
            setTimeout(() => {
              topIndex.value = Math.floor((scrollY.value?.scrollTop || 0) / rowHeight.value) + visibleChannelCount.value
            }, 400)
          }, 100)
        }
      }
    })
  }, { root: scrollY.value })
  observer.observe(scrollYTop.value!)
  observer.observe(scrollYBottom.value!)
})
onBeforeUnmount(() => {
  clearInterval(timerInterval)
})

const display = useDisplay()

const scrollXTimeline = useTemplateRef('scroll-x-timeline')
const scrollX = useTemplateRef('scroll-x')
const scrollY = useTemplateRef('scroll-y')
const scrollYTop = useTemplateRef('scroll-y-top')
const scrollYBottom = useTemplateRef('scroll-y-bottom')

const { drawers, selectedStream, selectedGroup, streams, channels } = defineProps<{
  drawers: { video: boolean },
  selectedStream: M3uItem | null,
  selectedGroup: string,
  streams: { [key: string]: Omit<M3uItem, "groupTitle">[] },
  channels: { [key: string]: Omit<SimpleProgramme, "channel">[] }
}>()

watch(() => selectedGroup, (newGroup, oldGroup) => {
  console.log('NEW GROUP')
  scrollY.value?.scrollTo(0, 0)
  scrollToThisHalfHour()
  topIndex.value = 0
})


// Sort streams alphabetically
const sortedStreams = computed(() => {
  return streams[selectedGroup]
    .map((s) => ({ ...s, groupTitle: selectedGroup })) // Re-add groupTitle to stream..
    .sort((a, b) => {
      const first = a.title.toLowerCase()
      const sec = b.title.toLocaleLowerCase()
      return (first < sec) ? -1 : (first > sec) ? 1 : 0
    })
})


// Normailze programs
// Sort programs by start date. Set stop to next programs start.
// TODO: Add a "No Information" program for every gap in lineup
const cleanChannels = computed(() => {
  const keys = Object.keys(channels)
  const newChannels: { [key: string]: Omit<SimpleProgramme, "channel">[] } = {}
  for (let i = 0; i < keys.length; i++) {
    newChannels[keys[i]] = channels[keys[i]].sort((a, b) => a.start < b.start ? -1 : 1).filter((p) => p.stop! > guideStartTime.value && p.stop! <= guideEndTime.value)
    for (let p = 0; p < newChannels[keys[i]].length - 1; p++) {
      newChannels[keys[i]][p].stop = newChannels[keys[i]][p + 1].start
    }
  }
  return newChannels
})

const emit = defineEmits<{ select: [value: M3uItem | null] }>()

const now = ref(Date.now())
const hoursOfEpg = ref(24)
const hoursOfPast = 12
const timelineHeight = ref(40)
const rowHeight = ref(40)
const rowHeaderWidth = ref(160)
const pixelsPerHour = ref(400)
const scrollXPos = ref(0)

const containerHeight = computed(() => display.height.value - 124 - (drawers.video ? 300 : 0))

const guideStartTime = ref((() => {
  const date = new Date()
  date.setHours(date.getHours() - hoursOfPast, 0, 0, 0)
  return date.getTime()
})())
const guideEndTime = computed(() => guideStartTime.value + (hoursOfEpg.value * HOUR))

const scrollTime = computed(() => guideStartTime.value + (scrollXPos.value / pixelsPerHour.value * HOUR))
const scrollTimeString = computed(() => (new Date(scrollTime.value)).toLocaleTimeString('en-US', { hour12: true, hour: 'numeric', minute: '2-digit' }))

const offsetToNow = computed(() => Math.floor((scrollTime.value - now.value) / HOUR * pixelsPerHour.value) + 1)

const nowHour = computed(() => {
  const thisNowHour = new Date(now.value)
  thisNowHour.setHours(thisNowHour.getHours(), 0, 0, 0)
  return thisNowHour.getTime()
})

const nowHalfHour = computed(() => {
  const thisHalfHour = new Date(now.value)
  thisHalfHour.setHours(thisHalfHour.getHours(), 30, 0, 0)
  return thisHalfHour.getTime()
})

const halfHourXPos = computed(() => Math.floor(((now.value >= nowHalfHour.value ? nowHalfHour.value : nowHour.value) - guideStartTime.value) / HOUR * pixelsPerHour.value))
const liveXPos = computed(() => Math.floor((now.value - guideStartTime.value) / HOUR * pixelsPerHour.value))

const timerInterval = setInterval(() => {
  now.value = Date.now()
  if (offsetToNow.value === -1)
    scrollXTimeline.value!.scrollLeft! = liveXPos.value
}, 5000)

const scrollToNow = () => scrollXTimeline.value!.scrollTo({ left: liveXPos.value, behavior: 'smooth' })
const scrollToThisHalfHour = () => scrollXTimeline.value?.scrollTo({ left: halfHourXPos.value, behavior: 'smooth' })

const getTimeline = (hourOffset: number) => {
  const thisHour = new Date(guideStartTime.value)
  thisHour.setHours(thisHour.getHours() + hourOffset - 1, 0, 0, 0)
  return thisHour.toLocaleTimeString('en-US', { hour12: true, hour: 'numeric', minute: '2-digit' })
}

const onWheel = (e: WheelEvent) => scrollXTimeline.value!.scrollLeft! += e.deltaY

const onScrollXBottom = (e: Event) => {
  e.preventDefault()
  if (e.target && 'scrollLeft' in e.target && typeof e.target.scrollLeft === 'number' && scrollX.value && e.target.scrollLeft >= 0 && e.target.scrollLeft <= hoursOfEpg.value * pixelsPerHour.value) {
    scrollXPos.value = e.target.scrollLeft
    scrollX.value.scrollLeft = e.target.scrollLeft
  }
}

const styleProgramRow = () => ({
  left: rowHeaderWidth.value + 'px',
  height: rowHeight.value + 'px',
  transform: `translateY(-${rowHeight.value}px)`,
})

const getProgramDurationMs = (program: Omit<SimpleProgramme, "channel">) => program.stop! - (program.start < guideStartTime.value ? guideStartTime.value : program.start)
const getProgramWidth = (program: Omit<SimpleProgramme, "channel">) => getProgramDurationMs(program) / HOUR * pixelsPerHour.value + 'px'

const styleProgram = (channel: string, index: number) => {
  const program = cleanChannels.value[channel][index]
  return {
    display: program.stop! <= guideStartTime.value ? 'none' : 'inline-block',
    width: getProgramWidth(program),
    height: rowHeight.value + 'px',
    lineHeight: program.description ? (rowHeight.value / 2.4) + 'px' : rowHeight.value + 'px'
  }
}
const styleLastProgramText = (channel: string) => {
  const lastProgram = cleanChannels.value[channel][cleanChannels.value[channel].length - 1]
  return {
    marginLeft: !lastProgram || scrollTime.value < lastProgram.stop! ? '0px' : lastProgram.stop! < guideStartTime.value ? scrollXPos.value + 'px' : `${scrollXPos.value - ((lastProgram.stop! - guideStartTime.value) * pixelsPerHour.value / HOUR)}px`,
    lineHeight: rowHeight.value + 'px'
  }
}
const styleProgramText = (channel: string, index: number) => {
  const program = cleanChannels.value[channel][index]
  if (program.start < guideStartTime.value && program.stop! > guideStartTime.value)
    return { marginLeft: `${scrollXPos.value}px` }
  if (scrollTime.value > program.start && scrollTime.value < program.stop!)
    return { marginLeft: `${scrollXPos.value - ((program.start - guideStartTime.value) * pixelsPerHour.value / HOUR)}px` }
}

const isProgramLive = (program: Omit<SimpleProgramme, "channel">) => now.value < (program.stop || 0) && now.value >= program.start

</script>

<style lang="css" scoped>
.scroll-x-timeline {
  width: 100%;
  overflow-x: scroll;
  overflow-y: hidden;
  scrollbar-gutter: stable;
  white-space: nowrap;
  position: relative;
}

.timeline-hour {
  display: inline-block;
  font-weight: 500;
  border-bottom: solid 1px rgb(var(--v-border-color));
  border-right: dotted 1px rgb(var(--v-border-color));
  user-select: none;
  text-align: right;
}

.timeline-half-hour {
  border-right: dotted gray 1px;
  float: left;
}

.current-time {
  display: inline-block;
  position: sticky;
  left: 0px;
  border-bottom: solid 1px rgb(var(--v-border-color));
  border-right: solid 1px rgb(var(--v-border-color));
  font-weight: 500;
  z-index: 2;
  text-align: right;
  cursor: pointer;
  background-color: rgb(var(--v-theme-background));
}

.current-time-container:hover {
  background-color: rgba(var(--v-border-color), var(--v-idle-opacity));
}

.now-line {
  position: absolute;
  height: 100%;
  width: 0px;
  border-left: 2px dotted rgb(var(--v-theme-info));
}

.now-line-arrow {
  position: relative;
  bottom: 26px;
  transform: translateX(calc(-50% - 1px));
  color: rgb(var(--v-theme-info));
}

.scroll-y {
  position: absolute;
  overflow-y: scroll;
  scrollbar-gutter: stable;
  overflow-x: hidden;
  -webkit-overflow-scrolling: touch;
  width: 100%;
}

.scroll-x {
  overflow-x: hidden;
  overflow-y: hidden;
  -webkit-overflow-scrolling: touch;
  -ms-overflow-style: none;
  scrollbar-width: none;
}

.row-header {
  position: sticky;
  left: 0px;
  z-index: 1;
  background-color: rgb(var(--v-theme-background));
  user-select: none;
}

.channel:hover {
  background-color: rgba(var(--v-border-color), var(--v-idle-opacity));
  cursor: pointer;
}

.channel-active {
  background-color: rgba(133, 0, 122, 0.2);
}

.row-header-container {
  overflow: hidden;
  border-bottom: solid 1px rgb(var(--v-border-color));
  border-right: solid 1px rgb(var(--v-border-color));
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.row-header-title {
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  line-clamp: 2;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  width: 100%;
  margin-left: 4px;
  margin-right: 4px;
  font-weight: 500;
}

.row {
  position: relative;
  white-space: nowrap;
  overflow: hidden;
}

.program {
  display: inline-block;
  position: relative;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  border-bottom: solid 1px rgb(var(--v-border-color));
  border-right: solid 1px rgb(var(--v-border-color));
  user-select: none;
}

/*
.dead:hover {
    background-color: rgb(var(--v-border-color), var(--v-idle-opacity));
}
*/
.live:hover {
  background-color: rgba(var(--v-theme-primary), var(--v-pressed-opacity));
}

.live {
  background-color: rgba(var(--v-theme-primary), var(--v-idle-opacity));
  cursor: pointer;
}

.active {
  background-color: rgba(133, 0, 122, 0.2) !important;
  cursor: default;
}
</style>
