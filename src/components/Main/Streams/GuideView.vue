<template>
<v-container  fluid class="pa-0">

  <div style="position: relative; z-index: 1; width: 100%;" :style="{ top: timelineHeight + 'px' }">
        
        <div ref="scroll-y" :style="{ height: containerHeight + 'px' }" class="scroll-y">
            <div ref="scroll-x" :style="{ width: '100%', height: (streams[selectedGroup].length * rowHeight) + timelineHeight + 'px' }" class="scroll-x">

                
                <!-- Channels -->
                <div v-for="(stream, i) of streams[selectedGroup]" :style="{ width: rowHeaderWidth + 'px' }" class="row-header" :id="!i ? 'top' : i === streams[selectedGroup].length - 1 ? 'bottom' : undefined" :data-index="i">
                    <!-- Channel -->
                    <div class="row-header-container d-flex pa-0" :style="{ height: rowHeight  + 'px' }" @click="emit('select', { ...stream, groupTitle: selectedGroup })">
                        <span class="d-inline-block">
                            <v-img lazy-src="@/assets/tv-icon.png" :src="stream.tvgLogo" alt="tvg-logo"
                                :style="{ width: rowHeight + 'px' }"></v-img>
                        </span>
                        <small class="row-header-title d-inline-block">{{ stream.title }}</small>
                    </div>
                </div>
                
                <!-- PROGRAMS -->
                <div v-for="stream of streams[selectedGroup]"
                    :style="{ bottom: (rowHeight * streams[selectedGroup].length) + 'px', left: rowHeaderWidth + 'px', height: rowHeight + 'px', width: pixelsPerHour * hoursOfEpg + 'px' }"
                    class="row"
                >
                    <div v-if="stream.tvgId && channels[stream.tvgId]">
                        <div v-for="(program, i) of channels[stream.tvgId]"
                            :style="[styleProgram(stream.tvgId, i), { lineHeight: program.description ? (rowHeight / 2.4) + 'px' : rowHeight + 'px'}]"
                            class="program px-1" :class="[isProgramLive(program) ? selectedStream?.url === stream.url ? 'active' : 'live' : 'dead', program.description ? 'pt-1' : '']"
                            @click="isProgramLive(program) && selectedStream?.url !== stream.url ? emit('select', { ...stream, groupTitle: selectedGroup }) : undefined"
                        >
                            <span :style="styleProgramShiftText(stream, i)">{{ program.title }}</span><br />
                            <small :style="styleProgramShiftText(stream, i)">{{ program.description }}</small>
                        </div>
                        <div
                            :style="[{ height: rowHeight + 'px', width: pixelsPerHour * hoursOfEpg + 'px', lineHeight: rowHeight + 'px' }, styleProgramShiftText(stream, -1)]"
                            class="program px-1"
                            :class="isProgramDone(channels[stream.tvgId][channels[stream.tvgId].length - 1]) ? 'live' : ''"
                            @click="isProgramDone(channels[stream.tvgId][channels[stream.tvgId].length - 1]) ? emit('select', { ...stream, groupTitle: selectedGroup }) : undefined"
                        >
                            No Information
                        </div>
                    </div>
                    <div v-else
                        :style="[{ height: rowHeight + 'px', width: pixelsPerHour * hoursOfEpg + 'px', lineHeight: rowHeight + 'px' }, styleProgramShiftText(stream, 0)]" @click="emit('select', { ...stream, groupTitle: selectedGroup })"
                        class="program live px-1"
                    >
                        No Information
                    </div>
                    
                </div>
            </div>
        </div>
    </div>

  <div
    ref="scroll-x-timeline"
    class="scroll-x-timeline"
    :onwheel="onWheel" :onscroll="onScrollXBottom" 
    :style="{ height: containerHeight + 'px', lineHeight: timelineHeight + 'px', top: -(scrollBarWidth - 60) + 'px'}"
    >
    <!-- NOW LINE MARKER-->
    <div class="now-line" :style="{top: timelineHeight + 'px', left: liveXPos + rowHeaderWidth - .5 + 'px' }">
        <v-icon class="ma-0 pa-0 now-line-arrow">mdi-triangle-small-down</v-icon>
    </div>
    
    <!-- CURRENT TIME -->
    <div class="current-time" :style="{ width: rowHeaderWidth + 'px', height: timelineHeight + 'px' }" @click="!offsetToNow ? scrollToThisHalfHour() : scrollToNow()">
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
import { url } from 'inspector'

const display = useDisplay()
const scrollBarWidth = getScrollBarWidth()

const scrollXTimeline = useTemplateRef('scroll-x-timeline')
const scrollY = useTemplateRef('scroll-y')
const scrollX = useTemplateRef('scroll-x')

const { drawers, selectedStream, selectedGroup, streams, channels } = defineProps<{
  drawers: { video: boolean },
  selectedStream: M3uItem | null,
  selectedGroup: string,
  streams: { [key: string]: Omit<M3uItem, "groupTitle">[] },
  channels: { [key: string]: Omit<SimpleProgramme, "channel">[] }
}>()

const emit = defineEmits<{ select: [value: M3uItem | null] }>()

const guideStartTime = (() => {
  const date = new Date()
  date.setHours(date.getHours() - 12, 0, 0, 0)
  return date.getTime()
})()

const now = ref(Date.now())
const hoursOfEpg = ref(48)
const timelineHeight = ref(40)
const rowHeight = ref(40)
const rowHeaderWidth = ref(200)
const pixelsPerHour = ref(400)
const scrollXPos = ref(0)

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

const onWheel = (e: WheelEvent) => {
  scrollXTimeline.value!.scrollLeft! += e.deltaY
}

const onScrollXBottom = (e: Event) => {
    e.preventDefault()
    if (e.target && 'scrollLeft' in e.target && typeof e.target.scrollLeft === 'number') {
      scrollXPos.value = e.target.scrollLeft
      if (scrollX.value)
        scrollX.value.scrollLeft = e.target.scrollLeft
    }
}

const styleProgram = (channel: string, index: number) => {
    return { 
        width: index ? ((channels[channel][index].stop! - channels[channel][index].start) / 3600000 * pixelsPerHour.value) +  'px' : ((channels[channel][index].stop! - guideStartTime) / 3600000 * (pixelsPerHour.value)) + 'px',
        height: rowHeight.value + 'px'
    }
}

const styleProgramShiftText = (stream: Omit<M3uItem, "groupTitle">, index: number) => {
    if (!stream.tvgId || !channels[stream.tvgId] || !index)
        return { 'margin-left': `${scrollXPos.value}px` }
    let now = guideStartTime + (scrollXPos.value / pixelsPerHour.value * 3600000)
    if (index >= 0 && now < channels[stream.tvgId][index].stop! && now > channels[stream.tvgId][index].start)
        return { 'margin-left': `${scrollXPos.value - ((channels[stream.tvgId][index].start - guideStartTime) * pixelsPerHour.value / 3600000)}px` }
    else if (index === -1 && channels[stream.tvgId].length && now > channels[stream.tvgId][channels[stream.tvgId].length - 1].stop!)
        return { 'margin-left': `${scrollXPos.value - ((channels[stream.tvgId][channels[stream.tvgId].length - 1].stop! - guideStartTime) * pixelsPerHour.value / 3600000)}px` }
}

const isProgramLive = (program: Omit<SimpleProgramme, "channel">) => {
    return now.value < (program.stop || 0) && now.value >= program.start
}
const isProgramDone = (program: Omit<SimpleProgramme, "channel">) => {
    return now.value > (program.stop || 0)
}

const scrollTime = computed(() => {
  const time = new Date(guideStartTime)
  time.setMinutes(scrollXPos.value / pixelsPerHour.value * 60)
  return time.toLocaleTimeString('en-US', { hour12: true, hour: 'numeric', minute:'2-digit' }) 
})

const offsetToNow = computed(() => {
  const time = guideStartTime + (scrollXPos.value / pixelsPerHour.value * 3600000)
  return  Math.floor((time - now.value) / 3600000 * pixelsPerHour.value) + 1
})

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
    width: 1px;
    border-left: 1px dotted rgb(var(--v-theme-info));
}

.now-line-arrow{
    position:relative;
    top: -24px;
    left: -12.5px;
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
    cursor: pointer;
    user-select: none;
}
.row-header-container:hover {
    background-color: rgba(var(--v-border-color), var(--v-idle-opacity));
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
    display: inline-block;
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
    background-color: rgba(133, 0, 122, 0.4);
}
</style>
