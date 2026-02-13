<script setup>
import { useRouter } from 'vue-router';

const router = useRouter();

const goHome = () => {
    router.push({ name: 'SelectCustomer' });
};
</script>

<template>
    <div
        class="w-screen h-screen flex items-center justify-center primary-bg overflow-x-hidden"
    >
        <div
            class="bg-white rounded-lg text-gray-800 p-12 max-w-2xl w-full text-center"
        >
            <div class="text-6xl font-bold mb-4">404</div>
            <div class="text-xl font-semibold uppercase mb-4">
                Page Not Found
            </div>
            <div class="mb-6">
                Sorry! We can't find the content you're looking for.
            </div>

            <Button variant="outlined" @click="goHome" class="w-72">
                Go Home
            </Button>
        </div>
    </div>
</template>
