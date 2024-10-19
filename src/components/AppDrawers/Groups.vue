<template>
    <VResizeDrawer ref="resizeDrawer" v-model="drawers.groups" :location="'left'" width="300px" min-width="200px" max-width="50%"
        permanent :touchless="xs" :save-width="false" :style="resizeDrawerStyle">
        <template v-slot:handle>
            <v-icon icon="mdi-chevron-right" />
        </template>

        <template v-slot:prepend>
            <v-text-field prepend-inner-icon="mdi-magnify" density="compact" label="Search Groups" variant="solo"
                hide-details single-line clearable persistent-clear v-model="groupFilter"></v-text-field>
        </template>

        <v-card v-if="groups.length === 0" :location="'center center'" :elevation="0">
            <v-card-text class="text-center">
                No groups to display.
            </v-card-text>
        </v-card>
        <v-card v-else-if="filteredGroups.length === 0" :location="'center center'" :elevation="0">
            <v-card-text class="text-center">
                No group(s) found matching your search
            </v-card-text>
        </v-card>
        <v-virtual-scroll v-else :items="filteredGroups"
            :height="`calc(100dvh - 106px - ${drawers.video ? 300 : 0}px)`">
            <template v-slot:default="{ item }">
                <v-list-item @click="selectedGroup = item; drawers.groups = !xs" :title="item === '__NULL__' ? '(UNSORTED)' : item"
                    :active="selectedGroup === item">
                    <template v-slot:append>
                        <small>({{ streams[item].length }})</small>
                    </template>
                </v-list-item>
            </template>
        </v-virtual-scroll>

    </VResizeDrawer>
</template>

<script lang="ts" setup>
import VResizeDrawer from '@wdns/vuetify-resize-drawer'

import { ref, computed } from 'vue'
import { useDisplay } from 'vuetify'
import type { M3uItem } from '@/lib/M3uParser'

type M3uStream = Omit<M3uItem, 'groupTitle'>

const { xs } = useDisplay()

const drawers = defineModel<{ groups: boolean, video: boolean }>('drawers', { required: true })
const selectedGroup = defineModel<string | null>('selectedGroup', { required: true })

const { groups, streams } = defineProps<{
    groups: string[],
    streams: { [key: string]: M3uStream[] }
}>()

const groupFilter = ref<string | null>('')

const filteredGroups = computed(() => {
    if (groups === undefined)
        return []
    return groups.filter((g) => g.toLowerCase().indexOf(groupFilter.value?.toLowerCase() || '') > -1)
})

// Force full width when mobile...
const resizeDrawerStyle = computed(() => !xs.value ? undefined : !drawers.value.groups ? { width: '100%', transform: 'translateX(-100%)' } : { width: '100%' })
</script>