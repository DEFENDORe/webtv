<template>
<v-container fluid class="pa-0">

  <div style="position: relative; width: 100%; z-index: 1;" :style="{ top: timelineHeight + 'px' }">
        
        <div class="scroll-y" :style="{ height: containerHeight  + 'px' }">
            <div ref="scroll-x" class="scroll-x" :style="{ width: '100%', height: (sortedStreams.length * rowHeight) + timelineHeight + 'px' }">
                <!-- Channels -->
                <div v-for="(stream, i) of sortedStreams" :style="{ width: rowHeaderWidth + 'px' }" class="row-header">
                    <!-- Channel -->
                    <div class="row-header-container" :style="{ height: rowHeight  + 'px' }" :class="selectedStream?.url === stream.url ? 'channel-active' : 'channel'" @click="selectedStream?.url === stream.url ? undefined : emit('select', { ...stream, groupTitle: selectedGroup })">
                        <span class="d-inline-block">
                            <v-img lazy-src="@/assets/tv-icon.png" :src="stream.tvgLogo" alt="tvg-logo"
                                :style="{ width: rowHeight + 'px' }"></v-img>
                        </span>
                        <small class="row-header-title d-inline-block">{{ stream.title }}</small>
                    </div>
                </div>
                
                <!-- PROGRAMS -->
                <div v-for="stream of sortedStreams" :style="styleProgramRow()" class="row">
                    <div v-if="stream.tvgId && channels[stream.tvgId] && channels[stream.tvgId].length" :style="{ height: rowHeight + 'px'}">
                        <div
                            v-if="channels[stream.tvgId][0] && channels[stream.tvgId][0].start > guideStartTime"
                            class="program px-1"
                            :style="[{ width: ((channels[stream.tvgId][0].start - guideStartTime) / 3600000 * pixelsPerHour) + 'px', height: rowHeight + 'px', display: 'inline-block' }]"
                        >
                            <span :style="{ marginLeft: scrollXPos + 'px', lineHeight: rowHeight + 'px'}">No Information</span>
                        </div>
                        <div v-for="(program, i) of channels[stream.tvgId]" :style="styleProgram(stream.tvgId, i)"
                            class="program px-1" :class="{ 'pt-1': program.description, active: isProgramLive(program) && selectedStream?.url === stream.url, live: isProgramLive(program) }"
                            @click="isProgramLive(program) && selectedStream?.url !== stream.url ? emit('select', { ...stream, groupTitle: selectedGroup }) : undefined"
                        >
                                <span :style="styleProgramText(stream.tvgId, i)">{{ /* (new Date(program.start)).toLocaleTimeString('en-US', { hour12: true, hour: 'numeric', minute:'2-digit' })  + ' - ' + (new Date(program.stop!)).toLocaleTimeString('en-US', { hour12: true, hour: 'numeric', minute:'2-digit' })  + ': ' + */ program.title }}</span>
                                <br/>
                                <small :style="styleProgramText(stream.tvgId, i)">{{ program.description }}</small>
                        </div>
                        <div
                            v-if="channels[stream.tvgId][channels[stream.tvgId].length - 1].stop! < guideStartTime + (hoursOfEpg * 3600000)"
                            class="program px-1"
                            :class="{ active: channels[stream.tvgId][channels[stream.tvgId].length - 1].stop! < now}"
                            style="display: inline-block; width: 100%;"
                            :style="{height: rowHeight + 'px' }"
                        >
                            <span :style="styleLastProgramText(stream.tvgId)">No Information</span>
                        </div>
                    </div>
                    <div v-else
                        :style="[{ height: '100%', width: '100%' }]" @click="emit('select', { ...stream, groupTitle: selectedGroup })"
                        class="program live px-1"
                    >
                        <div :style="{ marginLeft: scrollXPos + 'px', lineHeight: rowHeight + 'px'}">No Information</div>
                    </div>
                    
                </div>
            </div>
        </div>
    </div>

    <!-- top timeline bar, current time, now marker -->
  <div
    ref="scroll-x-timeline"
    class="scroll-x-timeline"
    :onwheel="onWheel" :onscroll="onScrollXBottom" 
    :style="{ height: containerHeight + 'px', lineHeight: timelineHeight + 'px', top: -(scrollBarWidth - 60 - scrollBarWidth) + 'px'}"
    >
    <!-- NOW LINE MARKER-->
    <div class="now-line" :style="{top: timelineHeight + 'px', left: liveXPos + rowHeaderWidth - .5 + 'px' }">
        <v-icon class="ma-0 pa-0 now-line-arrow">mdi-triangle-small-down</v-icon>
    </div>
    
    <!-- CURRENT TIME -->
    <div class="current-time" :style="{ width: rowHeaderWidth + 'px', height: timelineHeight + 'px' }" @click="scrollXPos !== halfHourXPos ? scrollToThisHalfHour() : scrollToNow()">
        <div class="current-time-container pr-2" style="height: 100%;">
            <span style="vertical-align: middle;" class="mr-2">{{ scrollTime }}</span>
            <v-icon 
              size="small"
                :color="!offsetToNow ? 'info' : scrollXPos === halfHourXPos ? 'purple' : offsetToNow > 0 ? 'success' : 'error'"
                :icon="!offsetToNow ? 'mdi-progress-clock' : scrollXPos === halfHourXPos ? 'mdi-clock-outline' : offsetToNow > 0 ? 'mdi-clock-plus-outline' : 'mdi-clock-minus-outline'"
            />
        </div>
      </div>
    <!-- TIMELINE HOURS -->
    <div v-for="i in hoursOfEpg" class="timeline-hour pr-2" :style="{width: pixelsPerHour + 'px', height: timelineHeight + 'px'}">
        <span :style="{width: pixelsPerHour / 2 + 'px'}" class="pr-2 timeline-half-hour" draggable>{{getTimeline(i).replace('00', '30')}}</span>
        {{ getTimeline(i + 1) }}
    </div>
    
  </div>
</v-container>
</template>



<script lang="ts" setup>
import type { M3uItem } from '@/lib/M3uParser'
import type { SimpleProgramme } from '@/lib/XmltvParser'

import { ref, computed, useTemplateRef, onMounted, onBeforeUnmount } from 'vue'
import { useDisplay } from 'vuetify'
import getScrollBarWidth from '@/lib/GetScrollbarWidth'

const display = useDisplay()
const scrollBarWidth = getScrollBarWidth()

const scrollXTimeline = useTemplateRef('scroll-x-timeline')
const scrollX = useTemplateRef('scroll-x')

const { drawers, selectedStream, selectedGroup, streams, channels } = defineProps<{
  drawers: { video: boolean },
  selectedStream: M3uItem | null,
  selectedGroup: string,
  streams: { [key: string]: Omit<M3uItem, "groupTitle">[] },
  channels: { [key: string]: Omit<SimpleProgramme, "channel">[] }
}>()

const sortedStreams = computed(() => {
  return streams[selectedGroup]
    .map((s) => ({ ...s, groupTitle: selectedGroup })) // Re-add groupTitle to stream..
    .sort((a, b) => {
      const first = a.title.toLowerCase()
      const sec = b.title.toLocaleLowerCase()
      return (first < sec) ? -1 : (first > sec) ? 1 : 0
    })
})

const emit = defineEmits<{ select: [value: M3uItem | null] }>()

const now = ref(Date.now())
const hoursOfEpg = ref(24)
const pastHours = ref(6)
const timelineHeight = ref(40)
const rowHeight = ref(40)
const rowHeaderWidth = ref(200)
const pixelsPerHour = ref(400)
const scrollXPos = ref(0)

const guideStartTime = (() => {
  const date = new Date()
  date.setHours(date.getHours() - pastHours.value, 0, 0, 0)
  return date.getTime()
})()

const containerHeight = computed(() => display.height.value - 124 - (drawers.video ? 300 : 0))

const timerInterval = setInterval(() => {
    now.value = Date.now()
    if (offsetToNow.value === -1)
      scrollXTimeline.value!.scrollLeft! = liveXPos.value
}, 5000)

onMounted(() => {
  scrollToThisHalfHour()
})
onBeforeUnmount(() => {
  clearInterval(timerInterval)
})

const scrollToNow = () => scrollXTimeline.value!.scrollTo({ left: liveXPos.value, behavior: 'smooth'})
const scrollToThisHalfHour = () => scrollXTimeline.value?.scrollTo({ left: halfHourXPos.value, behavior: 'smooth'})

const getTimeline = (hourOffset: number) => {
    const thisHour = new Date(guideStartTime)
    thisHour.setHours(thisHour.getHours() + hourOffset - 1, 0, 0, 0)
    return thisHour.toLocaleTimeString('en-US', { hour12: true, hour: 'numeric', minute:'2-digit' })
}

const onWheel = (e: WheelEvent) => scrollXTimeline.value!.scrollLeft! += e.deltaY

const onScrollXBottom = (e: Event) => {
    e.preventDefault()
    if (e.target && 'scrollLeft' in e.target && typeof e.target.scrollLeft === 'number') {
      scrollXPos.value = e.target.scrollLeft
      if (scrollX.value)
        scrollX.value.scrollLeft = e.target.scrollLeft
    }
}

const styleProgramRow = () => ({ 
    bottom: (rowHeight.value * sortedStreams.value.length) + 'px',
    left: rowHeaderWidth.value + 'px',
    height: rowHeight.value + 'px',
    width: pixelsPerHour.value * (hoursOfEpg.value) + 'px'
})

const getProgramDurationMs = (program:  Omit<SimpleProgramme, "channel">) => program.stop! - (program.start < guideStartTime ? guideStartTime : program.start)
const getProgramWidth = (program: Omit<SimpleProgramme, "channel">) => getProgramDurationMs(program) / 3600000 * pixelsPerHour.value + 'px'

const styleProgram = (channel: string, index: number) => {
    const program = channels[channel][index]
    return {
        display: program.stop! <= guideStartTime ? 'none' : 'inline-block',
        width: getProgramWidth(program),
        height: rowHeight.value + 'px',
        lineHeight: program.description ? (rowHeight.value / 2.4) + 'px' : rowHeight.value + 'px'
    }
}
const styleLastProgramText = (channel: string) => {
    const lastProgram = channels[channel][channels[channel].length - 1]
    return {
        marginLeft: currentScrollTime.value < lastProgram.stop! ? '0px' : `${scrollXPos.value - ((lastProgram.stop! - guideStartTime) * pixelsPerHour.value / 3600000)}px`,
        lineHeight: rowHeight.value + 'px'
    }
}
const styleProgramText = (channel: string, index: number) => {
    const program = channels[channel][index]
    if (program.start < guideStartTime && program.stop! > guideStartTime)
       return { marginLeft: `${scrollXPos.value}px` }
    if (currentScrollTime.value > program.start && currentScrollTime.value < program.stop!)
      return { marginLeft: `${scrollXPos.value - ((program.start - guideStartTime) * pixelsPerHour.value / 3600000)}px` }
}

const currentScrollTime = computed(() => guideStartTime + (scrollXPos.value / pixelsPerHour.value * 3600000))

const isProgramLive = (program: Omit<SimpleProgramme, "channel">) => now.value < (program.stop || 0) && now.value >= program.start

const scrollTime = computed(() => (new Date(currentScrollTime.value)).toLocaleTimeString('en-US', { hour12: true, hour: 'numeric', minute:'2-digit' }))

const offsetToNow = computed(() => Math.floor((currentScrollTime.value - now.value) / 3600000 * pixelsPerHour.value) + 1)

const nowHour = computed(() => {
  const thisNowHour = new Date(now.value)
  thisNowHour.setHours(thisNowHour.getHours(), 0, 0, 0)
  return thisNowHour
})

const nowHalfHour = computed(() => {
  const thisHalfHour = new Date(now.value)
  thisHalfHour.setHours(thisHalfHour.getHours(), 30, 0, 0)
  return thisHalfHour
})

const halfHourXPos = computed(() => Math.floor(((now.value >= nowHalfHour.value.getTime() ? nowHalfHour.value.getTime() : nowHour.value.getTime()) - guideStartTime) / 60 / 60 / 1000 * pixelsPerHour.value))
const liveXPos = computed(() => Math.floor((now.value - guideStartTime) / 60 / 60 / 1000 * pixelsPerHour.value))
</script>

<style lang="css" scoped>
.scroll-x-timeline {
    position: absolute;
    width: 100%;
    overflow-x: scroll;
    overflow-y: hidden;
    white-space: nowrap;
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
    border-left:2px dotted rgb(var(--v-theme-info));
}

.now-line-arrow{
    position:relative; 
    top: -24px;
    left: -13px;
    color: rgb(var(--v-theme-info));
}

.scroll-y {
    overflow-y: scroll;
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
    white-space: nowrap;
    text-overflow: ellipsis;
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
