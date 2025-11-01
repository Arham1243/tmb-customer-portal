<script setup>
import { ref, onBeforeMount } from 'vue';
import NotFound from '@/views/errors/NotFound.vue';
import { useSessionStore } from '@/stores';

const loading = ref(true);
const notFound = ref(false);
const sessionStore = useSessionStore();

onBeforeMount(async () => {
    if (!sessionStore.customerCompany) {
        try {
            await sessionStore.meCustomer();
        } catch (e) {
            notFound.value = e.status === 404;
        }
    }
    loading.value = false;
});
</script>

<template>
    <div
        class="w-screen h-screen flex justify-center items-center"
        v-if="loading"
    >
        <Loader />
    </div>
    <NotFound v-else-if="notFound" />
    <div
        v-else
        class="w-screen h-screen flex items-center justify-center bg-[#F6F9FB] overflow-x-hidden pb-4"
    >
        <div class="w-full max-w-[470px]">
            <div
                class="bg-white custom-shadow rounded-lg text-gray-800 px-[2.25rem] sm:px-[3.25rem] py-[2.57rem]"
            >
                <router-view />
            </div>
        </div>
        <Toast />
    </div>
</template>
<style scoped>
.custom-shadow {
    box-shadow:
        0 20px 25px -5px rgb(0 0 0 / 0.1),
        0 8px 10px -6px rgb(0 0 0 / 0.1);
}
</style>
