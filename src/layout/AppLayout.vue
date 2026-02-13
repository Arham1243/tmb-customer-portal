<script setup>
import { ref, onBeforeMount, watch } from 'vue';
import Header from './Header.vue';
import { useSessionStore } from '@/stores';
import { useRoute, useRouter } from 'vue-router';
const sessionStore = useSessionStore();
const route = useRoute();
const router = useRouter();
const loading = ref(true);
const currentUser = ref(null);

onBeforeMount(async () => {
    const customerId = route.params.customerId;
    if (!customerId) {
        router.replace({ name: 'SelectCustomer' });
        return;
    }
    try {
        await sessionStore.me(customerId);
        currentUser.value = sessionStore.user;
    } catch (e) {
        router.replace({ name: 'SelectCustomer' });
    }
    loading.value = false;
});

watch(
    () => route.params.customerId,
    async (newId, oldId) => {
        if (newId && newId !== oldId) {
            loading.value = true;
            await sessionStore.me(newId);
            currentUser.value = sessionStore.user;
            loading.value = false;
        }
    }
);
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
