<template>
    <!-- App Bar / Header-->
    <v-app-bar>
      <template v-slot:prepend>
        <v-btn @click.stop="drawers.groups = !drawers.groups" :prepend-icon="$vuetify.display.xs && drawers.groups && !drawers.settings ? 'mdi-close' : 'mdi-format-list-group'" text="Groups" stacked :active="drawers.groups && !drawers.settings" :disabled="drawers.settings" />
      </template>
      <v-app-bar-title class="text-center pt-2"><v-icon icon="mdi-television-classic" class="mb-3"/> WebTV</v-app-bar-title>
      <template v-slot:append>
        <v-btn text="Settings" stacked @click.stop="drawers.settings = !drawers.settings" :active="drawers.settings">
            <template v-slot:prepend>
                <v-progress-circular v-if="scanning.m3u || scanning.xmltv" indeterminate size="20" class="mb-1"/>
                <v-icon v-else :icon="drawers.settings ? 'mdi-close' : 'mdi-cogs'" />
            </template>
        </v-btn>
      </template>
    </v-app-bar>
</template>

<script lang="ts" setup>
    import { ref } from 'vue'

    const { drawers, scanning } = defineProps<{ 
        drawers: { 
            settings: boolean,
            groups: boolean
        },
        scanning: {
            m3u: boolean,
            xmltv: boolean
        }
    }>()
</script>
