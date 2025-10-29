<script setup>
import { ref, onBeforeMount } from 'vue';
import Header from './Header.vue';
import { useSessionStore } from '@/stores';
const sessionStore = useSessionStore();
const loading = ref(true);
const currentUser = ref(null);

onBeforeMount(async () => {
    if (!sessionStore.user) {
        await sessionStore.me();
    }
    currentUser.value = sessionStore.user;
    loading.value = false;
});
</script>

<template>
    <div class="layout-container">
        <div
            class="w-screen h-screen flex justify-center items-center"
            v-if="loading"
        >
            <Loader />
        </div>
        <div v-else-if="!loading">
            <Header />
            <div class="body-content">
                <router-view></router-view>
            </div>
        </div>
        <Toast></Toast>
        <div class="layout-mask"></div>
    </div>
</template>
