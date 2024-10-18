<template>
    <!-- App Bar / Header-->
    <v-app-bar>
      <template v-slot:prepend>
        <v-btn @click.stop="drawers.groups = !drawers.groups" prepend-icon="mdi-format-list-group" text="Groups" stacked :active="drawers.groups && !drawers.sources" :disabled="drawers.sources" />
        <v-btn variant="plain" readonly prepend-icon="mdi-clock" :text="time" stacked size="small" base-color="primary"/>
      </template>
      <v-app-bar-title class="text-center pt-2"><v-icon icon="mdi-television-classic" class="mb-3"/> WebTV</v-app-bar-title>
      <template v-slot:append>
        <v-btn prepend-icon="mdi-theme-light-dark" text="Theme" stacked @click="toggleTheme" />
        <v-btn  text="Sources" stacked @click.stop="drawers.sources = !drawers.sources" :active="drawers.sources">
            <template v-slot:prepend>
                <v-progress-circular v-if="scanning.m3u || scanning.xmltv" indeterminate size="20" class="mb-1"/>
                <v-icon v-else icon="mdi-database-cog" />
            </template>
        </v-btn>
      </template>
    </v-app-bar>
</template>

<script lang="ts" setup>
    import { ref } from 'vue'
    import { useTheme } from 'vuetify'

    const { drawers, scanning } = defineProps<{ 
        drawers: { 
            sources: boolean,
            groups: boolean
        },
        scanning: {
            m3u: boolean,
            xmltv: boolean
        }
    }>()

    const theme = useTheme()
    theme.global.name.value = localStorage.getItem('theme') || theme.global.name.value
    const toggleTheme = () => {
        theme.global.name.value = theme.global.current.value.dark ? 'light' : 'dark'
        localStorage.setItem('theme', theme.global.name.value)
    }

    
    const time = ref((new Date()).toLocaleTimeString())
    setInterval(() => time.value = (new Date()).toLocaleTimeString(), 500)

    
</script>