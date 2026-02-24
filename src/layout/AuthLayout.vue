<script setup>
import Logo from '@/assets/images/logo.png';
</script>

<template>
    <div
        class="min-h-screen flex items-center justify-center bg-[#F6F9FB] overflow-x-hidden py-20"
    >
        <div class="text-center mb-4 pb-1">
            <img :src="Logo" width="130" class="inline-block" />
        </div>
        <div class="w-full max-w-[540px]">
            <div
                class="bg-white custom-shadow rounded-lg text-gray-800 px-[2.25rem] sm:px-[1.75rem] py-[2rem] overflow-x-hidden"
            >
                <router-view />
            </div>
        </div>
        <Toast />
    </div>
</template>
<style scoped>
.custom-shadow {
    box-shadow: 0 0 15px 5px #0000001a;
}
</style>
