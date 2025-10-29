<script setup>
import { useRouter } from 'vue-router';

const router = useRouter();

const goHome = () => {
    router.push({ name: 'Dashboard' });
};
</script>

<template>
    <div
        class="w-screen h-screen flex items-center justify-center primary-bg overflow-x-hidden"
    >
        <div
            class="bg-white rounded-lg text-gray-800 p-12 max-w-2xl w-full text-center"
        >
            <div class="text-6xl font-bold mb-4">403</div>
            <div class="text-xl font-semibold uppercase mb-4">
                Access Denied
            </div>
            <div class="mb-6">
                Sorry! You don't have permission to access this page.
            </div>

            <button
                @click="goHome"
                class="w-72 border border-gray-400 rounded-md py-2 text-gray-800 hover:bg-gray-100 transition"
            >
                Go Home
            </button>
        </div>
    </div>
</template>
